"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Progress } from "@/core/components/ui/progress"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { apiRequest } from "@/services/api/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import {
  IconLoader2,
  IconVideo,
  IconVideoOff,
  IconAlertCircle,
  IconCircleCheck,
  IconHeartbeat,
  IconWind,
  IconDroplet,
  IconActivity,
  IconBolt,
  IconAlertTriangle,
  IconHeart,
  IconChartLine,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertOctagon,
  IconTemperature,
  IconMedicalCross,
  IconBrain,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconMail,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import healthMonitorManager, {
  FaceSessionOptions,
  HealthMonitorSession,
  SessionState,
  VitalSigns,
  VitalSignsResults,
  AlertData,
  ImageValidity,
  DeviceOrientation,
  EnabledVitalSigns,
  OfflineMeasurements,
} from "@biosensesignal/web-sdk"
import { useCameras } from "@/core/hooks/use-cameras"
import { cn } from "@/core/lib/utils"
import { getErrorInfo } from "@/core/lib/biosense-error-codes"

// Video component with mirror effect
const Video = React.forwardRef<HTMLVideoElement, React.VideoHTMLAttributes<HTMLVideoElement>>(
  ({ className, ...props }, ref) => {
    return (
      <video
        ref={ref}
        className={cn("w-full h-full object-cover scale-x-[-1]", className)}
        {...props}
      />
    )
  }
)
Video.displayName = "Video"

// Fullscreen API type definitions for browser compatibility
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
  webkitFullscreenElement?: Element | null
  mozFullScreenElement?: Element | null
  msFullscreenElement?: Element | null
}

function formatImageValidity(validity: ImageValidity): { message: string; type: "error" | "warning" | "success" } {
  switch (validity) {
    case ImageValidity.VALID:
      return { message: "Face detected correctly", type: "success" }
    case ImageValidity.INVALID_DEVICE_ORIENTATION:
      return { message: "Unsupported Orientation", type: "error" }
    case ImageValidity.TILTED_HEAD:
      return { message: "Head Tilted - Please face the camera directly", type: "warning" }
    case ImageValidity.FACE_TOO_FAR:
      return { message: "You Are Too Far - Please move closer", type: "warning" }
    case ImageValidity.UNEVEN_LIGHT:
      return { message: "Uneven Lighting - Please improve lighting", type: "warning" }
    case ImageValidity.INVALID_ROI:
    default:
      return { message: "Face Not Detected - Please position your face in the frame", type: "error" }
  }
}

interface FaceScanContentProps {
  onResults?: (results: VitalSignsResults) => void | Promise<void>
}

export function FaceScanContent({ onResults }: FaceScanContentProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [session, setSession] = useState<HealthMonitorSession | null>(null)
  const sessionRef = useRef<HealthMonitorSession | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurementProgress, setMeasurementProgress] = useState(0)
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null)
  const [finalResults, setFinalResults] = useState<VitalSignsResults | null>(null)
  const [imageValidity, setImageValidity] = useState<ImageValidity>(ImageValidity.INVALID_ROI)
  const [error, setError] = useState<AlertData | null>(null)
  const [warning, setWarning] = useState<AlertData | null>(null)
  const [enabledVitalSigns, setEnabledVitalSigns] = useState<EnabledVitalSigns | null>(null)
  const [offlineMeasurements, setOfflineMeasurements] = useState<OfflineMeasurements | null>(null)
  const [measurementDuration] = useState(35) // 35 seconds as per docs
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [showInfoFormModal, setShowInfoFormModal] = useState(false)
  const [isFullscreenState, setIsFullscreenState] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const { cameras, selectedCameraId, setSelectedCameraId } = useCameras()
  const measurementStartTimeRef = useRef<number | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMeasuringRef = useRef<boolean>(false)
  const licenseKey = process.env.NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY || ""

  // Fullscreen helper functions
  const enterFullscreen = useCallback(async () => {
    if (!videoContainerRef.current) return
    
    try {
      const element = videoContainerRef.current as FullscreenElement
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
    } catch (err) {
      console.warn("Failed to enter fullscreen:", err)
      // Don't block measurement if fullscreen fails
    }
  }, [])

  // Helper to check if we're in fullscreen
  const isInFullscreen = useCallback(() => {
    const doc = document as FullscreenDocument
    return !!(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    )
  }, [])

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument
    
    // Check if we're actually in fullscreen before trying to exit
    if (!isInFullscreen()) {
      // Not in fullscreen, nothing to do
      return true
    }
    
    // Try all methods to ensure we exit fullscreen
    const exitMethods = [
      () => document.exitFullscreen?.(),
      () => doc.webkitExitFullscreen?.(),
      () => doc.mozCancelFullScreen?.(),
      () => doc.msExitFullscreen?.(),
    ]
    
    for (const method of exitMethods) {
      try {
        if (method) {
          await method()
          // Wait a bit and check if we actually exited
          await new Promise(resolve => setTimeout(resolve, 100))
          if (!isInFullscreen()) {
            return true
          }
        }
      } catch (err) {
        // Continue to next method if this one fails
        continue
      }
    }
    
    // If we're still in fullscreen after all attempts, return false
    return !isInFullscreen()
  }, [isInFullscreen])

  // Keep session ref in sync with state
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Keep isMeasuring ref in sync with state
  useEffect(() => {
    isMeasuringRef.current = isMeasuring
  }, [isMeasuring])

  // Initialize SDK
  useEffect(() => {
    const initializeSDK = async () => {
      if (!licenseKey) {
        setError({ code: 2032 })
        return
      }

      setIsInitializing(true)
      try {
        await healthMonitorManager.initialize({
          licenseKey,
          licenseInfo: {
            onEnabledVitalSigns: (vitalSigns: EnabledVitalSigns) => {
              console.log("✅ Enabled vital signs received:", vitalSigns)
              setEnabledVitalSigns(vitalSigns)
            },
            onOfflineMeasurement: (measurements: OfflineMeasurements) => {
              console.log("✅ Offline measurements info:", measurements)
              setOfflineMeasurements(measurements)
            },
            onActivation: (activationId: string) => {
              console.log("SDK activated with ID:", activationId)
            },
          },
        })
        console.log("✅ SDK initialized successfully")
        setError(null)
      } catch (err: unknown) {
        console.error("❌ Error initializing SDK:", err)
        const errorCode = (err as { errorCode?: number })?.errorCode || 7006
        setError({ 
          code: errorCode
        })
        toast.error("Failed to initialize face scan SDK")
      } finally {
        setIsInitializing(false)
      }
    }

    initializeSDK()

    // Cleanup on unmount
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.terminate()
        } catch (err) {
          console.error("Error terminating session:", err)
        }
      }
    }
  }, [licenseKey])

  // SDK Callbacks
  const onVitalSign = useCallback((vitalSign: VitalSigns) => {
    setVitalSigns((prev) => ({ ...prev, ...vitalSign }))
  }, [])

  const onFinalResults = useCallback(async (results: VitalSignsResults) => {
    setFinalResults(results)
    setVitalSigns(null)
    setIsMeasuring(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setMeasurementProgress(0)
    measurementStartTimeRef.current = null
    
    // Show results modal immediately - Dialog uses portal so it works even in fullscreen
    setShowResultsModal(true)
    
    toast.success("Measurement completed successfully!")
    
    // Exit fullscreen aggressively in the background (don't wait for it)
    // Try multiple times with delays to ensure it exits
    const attemptExitFullscreen = async () => {
      for (let i = 0; i < 5; i++) {
        const exited = await exitFullscreen()
        if (exited || !isInFullscreen()) {
          break
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    attemptExitFullscreen() // Don't await - let it run in background
    
    // Call the onResults callback if provided
    if (onResults) {
      try {
        await onResults(results)
      } catch (err) {
        console.error("Error in onResults callback:", err)
      }
    }
    
    // Don't auto-restart - user must manually click restart/start
  }, [exitFullscreen, isInFullscreen, onResults])

  const onError = useCallback((errorData: AlertData) => {
    // Error codes 37000+ are likely internal/non-critical errors related to license info
    // If the measurement completed successfully, these are not real issues
    const isNonCriticalError = errorData.code >= 37000
    
    // If it's a non-critical error and we have successful results, just log it
    if (isNonCriticalError && finalResults) {
      // Reduced logging during measurement to avoid performance impact
      if (!isMeasuringRef.current) {
        console.warn("Non-critical SDK error (measurement successful, ignoring):", errorData.code)
      }
      // Don't show these errors to the user - they don't affect functionality
      return
    }
    
    // For non-critical errors during measurement, treat as warning
    if (isNonCriticalError && isMeasuringRef.current) {
      // Don't log during measurement to avoid performance impact
      setWarning(errorData)
      return
    }
    
    // Critical errors - show to user
    setError(errorData)
    setIsMeasuring(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // Exit fullscreen on critical error
    exitFullscreen()
    
    toast.error(`Error: ${errorData.code}`)
  }, [finalResults, exitFullscreen])

  const onWarning = useCallback((warningData: AlertData) => {
    setWarning(warningData)
    // Only log warnings when not measuring to avoid performance impact
    if (!isMeasuringRef.current) {
      console.warn("SDK Warning:", warningData)
    }
  }, [])

  const onStateChange = useCallback((state: SessionState) => {
    setSessionState(state)
    // Only log state changes when not measuring to avoid performance impact
    if (!isMeasuringRef.current) {
      console.log("Session state changed:", state)
    }
    
    if (state === SessionState.ACTIVE) {
      setIsMeasuring(false)
      // Don't auto-start - user must manually click start
    } else if (state === SessionState.MEASURING) {
      setIsMeasuring(true)
      setVitalSigns(null)
    } else if (state === SessionState.STOPPING) {
      setIsMeasuring(false)
    } else if (state === SessionState.TERMINATED) {
      setIsMeasuring(false)
      setSession(null)
      // Don't auto-restart - user must manually restart
    }
  }, [])

  const onImageData = useCallback((validity: ImageValidity) => {
    setImageValidity(validity)
  }, [])

  // Create session when ready (only when session doesn't exist and not in active states)
  useEffect(() => {
    const createSession = async () => {
      if (
        isInitializing ||
        !videoRef.current ||
        !selectedCameraId ||
        session || // Don't create if session already exists
        sessionState === SessionState.INIT ||
        sessionState === SessionState.ACTIVE ||
        sessionState === SessionState.MEASURING
      ) {
        return
      }

      try {
        const options: FaceSessionOptions = {
          input: videoRef.current,
          cameraDeviceId: selectedCameraId,
          processingTime: measurementDuration,
          onVitalSign,
          onFinalResults,
          onError,
          onWarning,
          onStateChange,
          onImageData,
          orientation: DeviceOrientation.PORTRAIT,
        }

        const faceSession = await healthMonitorManager.createFaceSession(options)
        setSession(faceSession)
        setError(null)
        console.log("✅ Session created successfully")
      } catch (err: unknown) {
        console.error("❌ Error creating session:", err)
        const errorCode = (err as { errorCode?: number })?.errorCode || 7009
        setError({ 
          code: errorCode
        })
        toast.error("Failed to create measurement session")
      }
    }

    createSession()
  }, [isInitializing, selectedCameraId, sessionState, session, onVitalSign, onFinalResults, onError, onWarning, onStateChange, onImageData, measurementDuration])

  // Start/stop measurement
  const handleStartMeasurement = useCallback(async () => {
    if (!session || sessionState !== SessionState.ACTIVE) {
      toast.error("Session is not ready. Please wait...")
      return
    }

    try {
      setError(null)
      setWarning(null)
      setFinalResults(null)
      setVitalSigns(null)
      measurementStartTimeRef.current = Date.now()
      setMeasurementProgress(0)

      // Enter fullscreen to focus all resources on camera
      await enterFullscreen()

      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (measurementStartTimeRef.current) {
          const elapsed = (Date.now() - measurementStartTimeRef.current) / 1000
          const progress = Math.min((elapsed / measurementDuration) * 100, 100)
          setMeasurementProgress(progress)
        }
      }, 100)

      session.start()
      toast.info("Measurement started. Please keep your face still and look at the camera.")
    } catch (err: unknown) {
      console.error("Error starting measurement:", err)
      toast.error("Failed to start measurement")
      const errorCode = (err as { errorCode?: number })?.errorCode || 6004
      setError({ code: errorCode })
      // Exit fullscreen on error
      await exitFullscreen()
    }
  }, [session, sessionState, measurementDuration, enterFullscreen, exitFullscreen])

  const handleStopMeasurement = useCallback(async () => {
    if (!session || sessionState !== SessionState.MEASURING) {
      return
    }

    try {
      session.stop()
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setMeasurementProgress(0)
      measurementStartTimeRef.current = null
      
      // Exit fullscreen when stopping
      await exitFullscreen()
      
      toast.info("Stopping measurement...")
    } catch (err: unknown) {
      console.error("Error stopping measurement:", err)
      toast.error("Failed to stop measurement")
      // Exit fullscreen on error
      await exitFullscreen()
    }
  }, [session, sessionState, exitFullscreen])

  const handleRestartMeasurement = useCallback(() => {
    // Clear all results and reset state for a new measurement
    setFinalResults(null)
    setVitalSigns(null)
    setError(null)
    setWarning(null)
    setMeasurementProgress(0)
    measurementStartTimeRef.current = null
    setShowResultsModal(false) // Close results modal when restarting
    setShowInfoFormModal(false) // Close info form modal when restarting
    setFirstName("")
    setLastName("")
    setEmail("")
    setIsSubmitted(false)
    
    // If session exists and terminated, we need to create a new one
    // The session creation effect will handle this when sessionState changes
    if (session && sessionState === SessionState.TERMINATED) {
      setSession(null)
    }
    
    toast.info("Ready for a new measurement. Click 'Start Measurement' when ready.")
  }, [session, sessionState])

  const handleSendToEmail = useCallback(() => {
    // Show the info form modal when user clicks "Send Results to Email"
    setShowInfoFormModal(true)
  }, [])

  const handleSubmitInfo = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (!finalResults) {
      toast.error("No results to submit")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiRequest('/v1/face-scan/save', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          results: finalResults
        })
      })

      if (response.success) {
        setIsSubmitted(true)
        setShowInfoFormModal(false) // Close info form modal
        toast.success("Results saved and email sent successfully!")
      } else {
        throw new Error(response.message || 'Failed to save results')
      }
    } catch (error) {
      console.error('Error saving face scan results:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save results'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [firstName, lastName, email, finalResults])

  // Ensure modal shows when results are ready (backup in case it didn't show)
  useEffect(() => {
    if (finalResults && !showResultsModal) {
      // Show modal immediately if it hasn't shown yet
      const timer = setTimeout(() => {
        setShowResultsModal(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [finalResults, showResultsModal])

  // Cleanup progress interval and exit fullscreen on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      // Exit fullscreen on unmount
      exitFullscreen()
    }
  }, [exitFullscreen])

  // Handle fullscreen change events (e.g., user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as FullscreenDocument
      const isFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )
      
      setIsFullscreenState(isFullscreen)
      
      // If user exits fullscreen during measurement, stop the measurement
      if (!isFullscreen && isMeasuringRef.current) {
        if (sessionRef.current && sessionState === SessionState.MEASURING) {
          try {
            sessionRef.current.stop()
          } catch (err) {
            console.error("Error stopping measurement after fullscreen exit:", err)
          }
        }
      }
    }

    // Check initial state
    handleFullscreenChange()

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [sessionState])

  // Setup camera stream     
  useEffect(() => {
    if (!videoRef.current || !selectedCameraId) return

    let stream: MediaStream | null = null

    const setupCamera = async () => {
      try {
        // Use lower resolution and frame rate to prevent frame drops and device overload
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 24, max: 24 },
            facingMode: "user", // Prefer front-facing camera
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Optimize video element for performance
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.setAttribute('webkit-playsinline', 'true')
          await videoRef.current.play()
          
          // Ensure video is ready before proceeding
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = resolve
            }
          })
        }
      } catch (err) {
        console.error("Error setting up camera:", err)
        setError({ code: 1002 })
        toast.error("Failed to access camera")
      }
    }

    setupCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [selectedCameraId])

  // Helper function to format risk values
  const formatRiskValue = (risk: string | number | undefined | null): string | null => {
    if (risk === null || risk === undefined || risk === '') return null
    const str = risk.toString()
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Helper function to get risk value from results
  const getRiskValue = (riskObj: { value?: string | number } | undefined): string | null => {
    if (!riskObj?.value) return null
    return formatRiskValue(riskObj.value)
  }

  // Prepare vital signs display
  // Only show final results after scanning completes, not during measurement
  const results = finalResults?.results || null
  const allVitalSigns = [
    {
      label: "Pulse Rate",
      value: finalResults?.results?.pulseRate?.value,
      unit: "bpm",
      icon: <IconHeartbeat className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledPulseRate,
      category: "vital",
    },
    {
      label: "Respiration Rate",
      value: finalResults?.results?.respirationRate?.value,
      unit: "bpm",
      icon: <IconWind className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledRespirationRate,
      category: "vital",
    },
    {
      label: "Blood Pressure",
      value: finalResults?.results?.bloodPressure?.value
        ? `${finalResults.results.bloodPressure.value.systolic}/${finalResults.results.bloodPressure.value.diastolic}`
        : null,
      unit: "mmHg",
      icon: <IconActivity className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledBloodPressure,
      category: "vital",
    },
    {
      label: "SpO2",
      value: (results as Record<string, { value?: number }>)?.spo2?.value,
      unit: "%",
      icon: <IconDroplet className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledSpo2,
      category: "vital",
    },
    {
      label: "Stress Level",
      value: results?.stressLevel?.value,
      unit: "",
      icon: <IconBolt className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledStressLevel,
      category: "stress",
    },
    {
      label: "Normalized Stress Index",
      value: (results as Record<string, { value?: number }>)?.normalizedStressIndex?.value,
      unit: "/100",
      icon: <IconBrain className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledNormalizedStressIndex,
      category: "stress",
    },
    {
      label: "SDNN",
      value: (results as Record<string, { value?: number }>)?.sdnn?.value,
      unit: "ms",
      icon: <IconChartLine className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledSdnn,
      category: "hrv",
    },
    {
      label: "Hemoglobin",
      value: (results as Record<string, { value?: number }>)?.hemoglobin?.value,
      unit: "g/dL",
      icon: <IconDroplet className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHemoglobin,
      category: "health",
    },
    {
      label: "Hemoglobin A1c",
      value: (results as Record<string, { value?: number }>)?.hemoglobinA1c?.value,
      unit: "%",
      icon: <IconMedicalCross className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHemoglobinA1c,
      category: "health",
    },
    {
      label: "Heart Age",
      value: (results as Record<string, { value?: number }>)?.heartAge?.value,
      unit: "years",
      icon: <IconHeart className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHeartAge,
      category: "health",
    },
    {
      label: "ASCVD Risk",
      value: (results as Record<string, { value?: number }>)?.ascvdRisk?.value
        ? `${(results as Record<string, { value?: number }>).ascvdRisk!.value}%`
        : null,
      unit: "10-year risk",
      icon: <IconAlertOctagon className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledAscvdRisk,
      category: "risk",
    },
    {
      label: "High Blood Pressure Risk",
      value: getRiskValue((results as Record<string, { value?: string }>)?.highBloodPressureRisk),
      unit: "",
      icon: <IconTrendingUp className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHighBloodPressureRisk,
      category: "risk",
    },
    {
      label: "High HbA1c Risk",
      value: getRiskValue((results as Record<string, { value?: string }>)?.highHemoglobinA1cRisk),
      unit: "",
      icon: <IconAlertTriangle className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHighHemoglobinA1CRisk,
      category: "risk",
    },
    {
      label: "High Fasting Glucose Risk",
      value: getRiskValue((results as Record<string, { value?: string }>)?.highFastingGlucoseRisk),
      unit: "",
      icon: <IconTemperature className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHighFastingGlucoseRisk,
      category: "risk",
    },
    {
      label: "High Total Cholesterol Risk",
      value: getRiskValue((results as Record<string, { value?: string }>)?.highTotalCholesterolRisk),
      unit: "",
      icon: <IconTrendingUp className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledHighTotalCholesterolRisk,
      category: "risk",
    },
    {
      label: "Low Hemoglobin Risk",
      value: getRiskValue((results as Record<string, { value?: string }>)?.lowHemoglobinRisk),
      unit: "",
      icon: <IconTrendingDown className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledLowHemoglobinRisk,
      category: "risk",
    },
  ]

  // If enabledVitalSigns is loaded, filter to only show enabled ones
  // If not loaded yet, show all (they'll be filtered once enabledVitalSigns is received)
  const vitalSignsDisplay = enabledVitalSigns
    ? allVitalSigns.filter((vs) => vs.enabled === true)
    : allVitalSigns

  const canStartMeasurement = sessionState === SessionState.ACTIVE && !isMeasuring && !error
  const canStopMeasurement = sessionState === SessionState.MEASURING

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <IconHeartbeat className="w-6 h-6 text-primary" />
              Face Scan - Vital Signs Measurement
            </CardTitle>
            <CardDescription>
              Position your face in front of the camera and keep still for accurate measurements
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Camera Preview</CardTitle>
                  {cameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-md bg-background"
                      disabled={isMeasuring}
                    >
                      {cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div ref={videoContainerRef} className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <div className="text-center space-y-2">
                        <IconLoader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="text-sm text-white">Initializing SDK...</p>
                      </div>
                    </div>
                  )}
                  
                  <Video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    className="w-full h-full"
                  />

                  {/* Face Placement Assist Overlay - Always visible when video is active */}
                  {videoRef.current && (sessionState === SessionState.ACTIVE || sessionState === SessionState.MEASURING || sessionState === SessionState.INIT) && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                      <div className="relative w-56 h-72">
                        {/* Main outer circle - more prominent */}
                        <div 
                          className={cn(
                            "absolute inset-0 border-4 rounded-full transition-all duration-300",
                            imageValidity === ImageValidity.VALID 
                              ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" 
                              : isMeasuring 
                              ? "border-primary/60 shadow-[0_0_15px_hsl(var(--primary))] animate-pulse" 
                              : "border-primary/70 shadow-[0_0_15px_hsl(var(--primary))]"
                          )}
                          style={{
                            boxShadow: imageValidity === ImageValidity.VALID 
                              ? "0 0 30px rgba(34, 197, 94, 0.6), inset 0 0 30px rgba(34, 197, 94, 0.1)"
                              : isMeasuring
                              ? "0 0 25px hsl(var(--primary) / 0.5), inset 0 0 25px hsl(var(--primary) / 0.2)"
                              : "0 0 20px hsl(var(--primary) / 0.4), inset 0 0 20px hsl(var(--primary) / 0.15)"
                          }}
                        />
                        
                        {/* Inner guide circle */}
                        <div className={cn(
                          "absolute inset-6 border-2 rounded-full transition-colors",
                          imageValidity === ImageValidity.VALID 
                            ? "border-green-400/50" 
                            : "border-primary/40"
                        )} />
                        
                        {/* Center crosshair - more visible */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className={cn(
                            "w-1 h-12 absolute -top-6 left-1/2 transform -translate-x-1/2 transition-colors",
                            imageValidity === ImageValidity.VALID 
                              ? "bg-green-500/60" 
                              : "bg-primary/60"
                          )} />
                          <div className={cn(
                            "w-12 h-1 absolute -left-6 top-1/2 transform -translate-y-1/2 transition-colors",
                            imageValidity === ImageValidity.VALID 
                              ? "bg-green-500/60" 
                              : "bg-primary/60"
                          )} />
                          {/* Center dot */}
                          <div className={cn(
                            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-colors",
                            imageValidity === ImageValidity.VALID 
                              ? "bg-green-500" 
                              : "bg-primary"
                          )} />
                        </div>
                        
                        {/* Corner alignment guides - more prominent */}
                        <div className={cn(
                          "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-t-4 border-l-4 rounded-tl-lg transition-colors",
                          imageValidity === ImageValidity.VALID 
                            ? "border-green-500" 
                            : "border-primary/70"
                        )} />
                        <div className={cn(
                          "absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-10 h-10 border-t-4 border-r-4 rounded-tr-lg transition-colors",
                          imageValidity === ImageValidity.VALID 
                            ? "border-green-500" 
                            : "border-primary/70"
                        )} />
                        <div className={cn(
                          "absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-10 h-10 border-b-4 border-l-4 rounded-bl-lg transition-colors",
                          imageValidity === ImageValidity.VALID 
                            ? "border-green-500" 
                            : "border-primary/70"
                        )} />
                        <div className={cn(
                          "absolute bottom-1/2 right-0 transform translate-x-1/2 translate-y-1/2 w-10 h-10 border-b-4 border-r-4 rounded-br-lg transition-colors",
                          imageValidity === ImageValidity.VALID 
                            ? "border-green-500" 
                            : "border-primary/70"
                        )} />
                        
                        {/* Face detection status indicator */}
                        {imageValidity === ImageValidity.VALID && (
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-full">
                            <IconCircleCheck className="w-4 h-4 text-white" />
                            <span className="text-xs font-medium text-white">Face Detected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Measurement Progress */}
                  {isMeasuring && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 z-20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">Measuring...</span>
                        <span className="text-white text-sm">
                          {Math.round(measurementProgress)}%
                        </span>
                      </div>
                      <Progress value={measurementProgress} className="h-2" />
                      <p className="text-white/70 text-xs mt-2">
                        {Math.round((measurementDuration * (100 - measurementProgress)) / 100)}s remaining
                      </p>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex gap-4 mt-4">
                  {!finalResults ? (
                    <>
                      <Button
                        onClick={handleStartMeasurement}
                        disabled={!canStartMeasurement || isInitializing}
                        className="flex-1"
                        size="lg"
                      >
                        <IconVideo className="w-5 h-5 mr-2" />
                        {isInitializing ? "Initializing..." : "Start Measurement"}
                      </Button>
                      
                      {canStopMeasurement && (
                        <Button
                          onClick={handleStopMeasurement}
                          variant="destructive"
                          size="lg"
                          className="flex-1"
                        >
                          <IconVideoOff className="w-5 h-5 mr-2" />
                          Stop Measurement
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={handleRestartMeasurement}
                      className="flex-1"
                      size="lg"
                      variant="outline"
                    >
                      <IconVideo className="w-5 h-5 mr-2" />
                      Restart Measurement
                    </Button>
                  )}
                </div>

                {/* Session State Badge */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      sessionState === SessionState.ACTIVE
                        ? "default"
                        : sessionState === SessionState.MEASURING
                        ? "default"
                        : "secondary"
                    }
                  >
                    {sessionState === SessionState.INIT && "Initializing..."}
                    {sessionState === SessionState.ACTIVE && "Ready"}
                    {sessionState === SessionState.MEASURING && "Measuring..."}
                    {sessionState === SessionState.STOPPING && "Processing..."}
                    {sessionState === SessionState.TERMINATED && "Terminated"}
                    {!sessionState && "Not Started"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Error Alert - Only show critical errors (not 37000+ codes after successful measurement) */}
            {error && !(error.code >= 37000 && finalResults) && (() => {
              const errorInfo = getErrorInfo(error.code)
              const isNonCritical = error.code >= 37000
              return (
                <Alert variant={isNonCritical ? "default" : "destructive"}>
                  <IconAlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {isNonCritical ? "Notice" : "Error"}: {errorInfo.message}
                  </AlertTitle>
                  <AlertDescription>
                    {isNonCritical && (
                      <p className="mb-2 font-medium text-green-600 dark:text-green-400">
                        ✓ Your measurement completed successfully. This notice doesn&apos;t affect your results.
                      </p>
                    )}
                    <p className="mb-2">{errorInfo.solution}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Error code: {error.code}
                    </p>
                  </AlertDescription>
                </Alert>
              )
            })()}

            {/* Warning Alert */}
            {warning && (
              <Alert>
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Warning code: {warning.code}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vital Signs & Health Indicators</CardTitle>
                <CardDescription>
                  {isMeasuring
                    ? "Scanning in progress..."
                    : finalResults
                    ? "View results in the popup modal"
                    : "Results will appear in a popup modal after scanning completes"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-2">
                  {isMeasuring ? (
                    <>
                      <IconLoader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Please keep your face still and look at the camera
                      </p>
                    </>
                  ) : finalResults ? (
                    <>
                      <IconCircleCheck className="w-12 h-12 mx-auto text-green-500 mb-4" />
                      <p className="text-sm font-medium">Scan completed!</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        View your results in the popup modal
                      </p>
                    </>
                  ) : (
                    <>
                      <IconVideo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Start a measurement to see your vital signs
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Info Form Modal - Shows when user clicks "Send Results to Email" */}
      <Dialog open={showInfoFormModal} onOpenChange={setShowInfoFormModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <IconMail className="w-6 h-6 text-primary" />
              <DialogTitle className="text-2xl">Send Results to Email</DialogTitle>
            </div>
            <DialogDescription>
              Please provide your details to receive your health report via email
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formFirstName">First Name</Label>
              <Input
                id="formFirstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formLastName">Last Name</Label>
              <Input
                id="formLastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formEmail">Email Address</Label>
              <Input
                id="formEmail"
                type="email"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowInfoFormModal(false)}
                disabled={isSubmitting}
                className="flex-1"
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInfo}
                disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !email.trim()}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IconMail className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Modal - Shows after form submission */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconHeartbeat className="w-6 h-6 text-primary" />
                <DialogTitle className="text-2xl">Measurement Results</DialogTitle>
              </div>
              {isFullscreenState && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await exitFullscreen()
                    toast.info("Press ESC or click outside to exit fullscreen if needed")
                  }}
                  className="gap-2"
                >
                  <IconArrowsMinimize className="w-4 h-4" />
                  Exit Fullscreen
                </Button>
              )}
            </div>
            <DialogDescription>
              Your vital signs and health indicators from the face scan
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-6">
            {enabledVitalSigns && vitalSignsDisplay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No vital signs enabled. Please check your license configuration.
              </p>
            ) : vitalSignsDisplay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading enabled vital signs...
              </p>
            ) : (
              <div className="space-y-6">
                {/* Group by category */}
                {['vital', 'stress', 'hrv', 'health', 'risk'].map((category) => {
                  const categoryItems = vitalSignsDisplay.filter(
                    (vs) => vs.category === category
                  )
                  
                  if (categoryItems.length === 0) return null

                  const categoryLabels: Record<string, string> = {
                    vital: 'Vital Signs',
                    stress: 'Stress Indicators',
                    hrv: 'Heart Rate Variability',
                    health: 'Health Indicators',
                    risk: 'Health Risk Indicators',
                  }

                  return (
                    <div key={category} className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {categoryLabels[category]}
                      </h3>
                      <div className="space-y-2">
                        {categoryItems.map((vs, index) => (
                          <div
                            key={`${category}-${index}`}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="text-primary flex-shrink-0">{vs.icon}</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{vs.label}</p>
                                {vs.unit && (
                                  <p className="text-xs text-muted-foreground">{vs.unit}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              {vs.value !== null && vs.value !== undefined && vs.value !== '' ? (
                                <p className="text-lg font-bold whitespace-nowrap">
                                  {typeof vs.value === "string" 
                                    ? vs.value 
                                    : typeof vs.value === "number"
                                    ? Number.isInteger(vs.value)
                                      ? vs.value.toString()
                                      : vs.value.toFixed(1)
                                    : vs.value.toString()}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">--</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Success message after submission */}
            {isSubmitted && (
              <div className="border-t pt-6 mt-6">
                <Alert>
                  <IconCircleCheck className="h-4 w-4" />
                  <AlertTitle>Email Sent!</AlertTitle>
                  <AlertDescription>
                    Your results have been saved and sent to <strong>{email}</strong>. 
                    Please check your inbox for the detailed health report.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Action Buttons */}
            {!isSubmitted && (
              <div className="border-t pt-6 mt-6 flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResultsModal(false)}
                  className="flex-1"
                  size="lg"
                >
                  <IconX className="w-4 h-4 mr-2" />
                  Exit
                </Button>
                <Button
                  onClick={handleSendToEmail}
                  className="flex-1"
                  size="lg"
                >
                  <IconMail className="w-4 h-4 mr-2" />
                  Send Results to Email
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


