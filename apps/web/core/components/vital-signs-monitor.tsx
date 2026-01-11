"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Progress } from "@/core/components/ui/progress"
import {
  IconLoader2,
  IconVideo,
  IconVideoOff,
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconHeartbeat,
  IconWind,
  IconDroplet,
  IconActivity,
  IconBolt,
  IconAlertTriangle,
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

interface VitalSignsMonitorProps {
  licenseKey: string
  processingTime?: number
  onResults?: (results: VitalSignsResults) => void | Promise<void>
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

export function VitalSignsMonitor({ 
  licenseKey, 
  processingTime = 35,
  onResults 
}: VitalSignsMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
  
  const { cameras, selectedCameraId, setSelectedCameraId } = useCameras()
  const measurementStartTimeRef = useRef<number | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Keep session ref in sync with state
  useEffect(() => {
    sessionRef.current = session
  }, [session])

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
              setEnabledVitalSigns(vitalSigns)
            },
            onOfflineMeasurement: (measurements: OfflineMeasurements) => {
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
    toast.success("Measurement completed successfully!")
    
    // Call the onResults callback if provided
    if (onResults) {
      try {
        await onResults(results)
      } catch (err) {
        console.error("Error in onResults callback:", err)
      }
    }
  }, [onResults])

  const onError = useCallback((errorData: AlertData) => {
    setError(errorData)
    setIsMeasuring(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    toast.error(`Error: ${errorData.code}`)
  }, [])

  const onWarning = useCallback((warningData: AlertData) => {
    setWarning(warningData)
    console.warn("SDK Warning:", warningData)
  }, [])

  const onStateChange = useCallback((state: SessionState) => {
    setSessionState(state)
    console.log("Session state changed:", state)
    
    if (state === SessionState.ACTIVE) {
      setIsMeasuring(false)
    } else if (state === SessionState.MEASURING) {
      setIsMeasuring(true)
      setVitalSigns(null)
    } else if (state === SessionState.STOPPING) {
      setIsMeasuring(false)
    } else if (state === SessionState.TERMINATED) {
      setIsMeasuring(false)
      setSession(null)
    }
  }, [])

  const onImageData = useCallback((validity: ImageValidity) => {
    setImageValidity(validity)
  }, [])

  // Create session when ready
  useEffect(() => {
    const createSession = async () => {
      if (
        isInitializing ||
        !videoRef.current ||
        !selectedCameraId ||
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
          processingTime,
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
  }, [isInitializing, selectedCameraId, sessionState, onVitalSign, onFinalResults, onError, onWarning, onStateChange, onImageData, processingTime])

  // Start/stop measurement
  const handleStartMeasurement = useCallback(() => {
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

      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (measurementStartTimeRef.current) {
          const elapsed = (Date.now() - measurementStartTimeRef.current) / 1000
          const progress = Math.min((elapsed / processingTime) * 100, 100)
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
    }
  }, [session, sessionState, processingTime])

  const handleStopMeasurement = useCallback(() => {
    if (!session || sessionState !== SessionState.MEASURING) {
      return
    }

    try {
      session.stop()
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      toast.info("Stopping measurement...")
    } catch (err: unknown) {
      console.error("Error stopping measurement:", err)
      toast.error("Failed to stop measurement")
    }
  }, [session, sessionState])

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Setup camera stream
  useEffect(() => {
    if (!videoRef.current || !selectedCameraId) return

    let stream: MediaStream | null = null

    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
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

  const imageValidityInfo = formatImageValidity(imageValidity)

  // Prepare vital signs display
  const vitalSignsDisplay = [
    {
      label: "Pulse Rate",
      value: vitalSigns?.pulseRate?.value || finalResults?.results?.pulseRate?.value,
      unit: "bpm",
      icon: <IconHeartbeat className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledPulseRate,
    },
    {
      label: "Respiration Rate",
      value: vitalSigns?.respirationRate?.value || finalResults?.results?.respirationRate?.value,
      unit: "bpm",
      icon: <IconWind className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledRespirationRate,
    },
    {
      label: "Blood Pressure",
      value: finalResults?.results?.bloodPressure?.value
        ? `${finalResults.results.bloodPressure.value.systolic}/${finalResults.results.bloodPressure.value.diastolic}`
        : null,
      unit: "mmHg",
      icon: <IconActivity className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledBloodPressure,
    },
    {
      label: "SpO2",
      value: (finalResults?.results as Record<string, { value?: number }>)?.spo2?.value,
      unit: "%",
      icon: <IconDroplet className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledSpo2,
    },
    {
      label: "Stress Level",
      value: finalResults?.results?.stressLevel?.value,
      unit: "",
      icon: <IconBolt className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledStressLevel,
    },
  ].filter((vs) => vs.enabled)

  const canStartMeasurement = sessionState === SessionState.ACTIVE && !isMeasuring && !error
  const canStopMeasurement = sessionState === SessionState.MEASURING

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <IconHeartbeat className="w-5 h-5 text-primary" />
            Vital Signs Measurement
          </CardTitle>
          <CardDescription>
            Position your face in front of the camera and keep still for accurate measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Preview Section */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
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

                {/* Image Validity Overlay */}
                {sessionState === SessionState.ACTIVE && imageValidity !== ImageValidity.VALID && (
                  <div
                    className={cn(
                      "absolute top-4 left-4 right-4 z-20 p-3 rounded-md backdrop-blur-sm",
                      imageValidityInfo.type === "error" && "bg-destructive/80 text-white",
                      imageValidityInfo.type === "warning" && "bg-yellow-500/80 text-white",
                      imageValidityInfo.type === "success" && "bg-green-500/80 text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {imageValidityInfo.type === "error" && <IconCircleX className="w-5 h-5" />}
                      {imageValidityInfo.type === "warning" && <IconAlertTriangle className="w-5 h-5" />}
                      {imageValidityInfo.type === "success" && <IconCircleCheck className="w-5 h-5" />}
                      <span className="text-sm font-medium">{imageValidityInfo.message}</span>
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
                      {Math.round((processingTime * (100 - measurementProgress)) / 100)}s remaining
                    </p>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-4">
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
              </div>

              {/* Camera Selection */}
              {cameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
                  disabled={isMeasuring}
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Session State Badge */}
              <div className="flex items-center gap-2">
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
            </div>

            {/* Vital Signs Display */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vital Signs</CardTitle>
                  <CardDescription>
                    {isMeasuring
                      ? "Real-time measurements"
                      : finalResults
                      ? "Final results"
                      : "Results will appear here"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vitalSignsDisplay.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No vital signs enabled. Please check your license configuration.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {vitalSignsDisplay.map((vs, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-primary">{vs.icon}</div>
                            <div>
                              <p className="text-sm font-medium">{vs.label}</p>
                              <p className="text-xs text-muted-foreground">{vs.unit}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {vs.value !== null && vs.value !== undefined ? (
                              <p className="text-lg font-bold">
                                {typeof vs.value === "string" ? vs.value : Math.round(vs.value)}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">--</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <IconAlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Error code: {error.code}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          {warning && (
            <Alert className="mt-4">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Warning code: {warning.code}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
