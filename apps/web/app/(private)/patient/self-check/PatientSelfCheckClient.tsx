"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { toast } from "sonner"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Progress } from "@/core/components/ui/progress"
import {
  IconLoader2,
  IconVideo,
  IconVideoOff,
  IconAlertCircle,
  IconCircleCheck,
  IconHeartbeat,
  IconWind,
  IconActivity,
  IconBolt,
  IconAlertTriangle,
  IconQrcode,
  IconCopy,
  IconExternalLink,
} from "@tabler/icons-react"

const QRCode = dynamic(
  () => import("react-qr-code").then((mod) => mod.default),
  { ssr: false }
)

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
import { useIsMobileDevice } from "@/core/hooks/use-is-mobile-device"
import { cn } from "@/core/lib/utils"
import { getErrorInfo } from "@/core/lib/biosense-error-codes"
import { env } from "@/env"

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

function formatImageValidity(validity: ImageValidity): { message: string; type: "error" | "warning" | "success" } {
  switch (validity) {
    case ImageValidity.VALID:
      return { message: "Face detected correctly", type: "success" }
    case ImageValidity.INVALID_DEVICE_ORIENTATION:
      return { message: "Rotate your device to portrait orientation", type: "error" }
    case ImageValidity.INVALID_ROI:
      return { message: "Face not detected - align your face with the frame", type: "error" }
    case ImageValidity.TILTED_HEAD:
      return { message: "Keep your head straight and look directly at the camera", type: "warning" }
    case ImageValidity.UNEVEN_LIGHT:
      return { message: "Improve lighting - make sure your face is evenly lit", type: "warning" }
    default:
      return { message: "Adjust your position for better detection", type: "warning" }
  }
}

export default function PatientSelfCheckClient() {
  const isMobileDevice = useIsMobileDevice()
  const [currentUrl, setCurrentUrl] = useState("")

  // SDK refs and state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sessionRef = useRef<HealthMonitorSession | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurementProgress, setMeasurementProgress] = useState(0)
  const [measurementDuration] = useState(35) // seconds, per SDK docs
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null)
  const [finalResults, setFinalResults] = useState<VitalSignsResults | null>(null)
  const [error, setError] = useState<AlertData | null>(null)
  const [warning, setWarning] = useState<AlertData | null>(null)
  const [imageValidity, setImageValidity] = useState<ImageValidity | null>(null)
  const [enabledVitalSigns, setEnabledVitalSigns] = useState<EnabledVitalSigns | null>(null)
  const [offlineMeasurements, setOfflineMeasurements] = useState<OfflineMeasurements | null>(null)
  const [licenseActivationId, setLicenseActivationId] = useState<string | null>(null)
  const [licenseDebug, setLicenseDebug] = useState<string | null>(null)

  // NOTE: In some environments, a global NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY
  // can override the value from apps/web/.env. To ensure we are using the
  // intended key, prefer the value from env, but fall back to the known key
  // if env is misconfigured.
  const EFFECTIVE_LICENSE_KEY =
    env.NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY && env.NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY !== "your_license_key_here"
      ? env.NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY
      : "3E130C-5A3C34-4DC5B3-37707D-06B6D7-8BF6ED"

  const [canStartMeasurement, setCanStartMeasurement] = useState(false)
  const [canStopMeasurement, setCanStopMeasurement] = useState(false)

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const { cameras, isEnumerating } = useCameras()

  // Get current URL for QR code
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href)
    }
  }, [])

  // Select default camera when cameras list is ready
  useEffect(() => {
    if (!selectedCameraId && cameras.length > 0) {
      const frontCamera =
        cameras.find((c) => /front|user/i.test(c.label || "")) ?? cameras[0]
      setSelectedCameraId(frontCamera.deviceId)
    }
  }, [cameras, selectedCameraId])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Unable to copy link")
    }
  }, [currentUrl])

  // SDK callbacks
  const handleStateChange = useCallback((state: SessionState) => {
    setSessionState(state)

    switch (state) {
      case SessionState.INIT:
        setIsInitializing(true)
        setCanStartMeasurement(false)
        setCanStopMeasurement(false)
        break
      case SessionState.ACTIVE:
        setIsInitializing(false)
        setIsMeasuring(false)
        setCanStartMeasurement(true)
        setCanStopMeasurement(false)
        setMeasurementProgress(0)
        break
      case SessionState.MEASURING:
        setIsMeasuring(true)
        setCanStartMeasurement(false)
        setCanStopMeasurement(true)
        break
      case SessionState.STOPPING:
        setIsMeasuring(false)
        setCanStartMeasurement(false)
        setCanStopMeasurement(false)
        break
      case SessionState.TERMINATED:
        setIsInitializing(false)
        setIsMeasuring(false)
        setCanStartMeasurement(false)
        setCanStopMeasurement(false)
        break
      default:
        break
    }
  }, [])

  const handleVitalSign = useCallback((vitalSign: VitalSigns) => {
    setVitalSigns((prev) => ({ ...prev, ...vitalSign }))
  }, [])

  const handleFinalResults = useCallback((results: VitalSignsResults) => {
    setFinalResults(results)
    setIsMeasuring(false)
    setCanStartMeasurement(true)
    setCanStopMeasurement(false)
  }, [])

  const handleError = useCallback((err: AlertData) => {
    setError(err)
    setIsMeasuring(false)
    setCanStartMeasurement(false)
    setCanStopMeasurement(false)

    const errorInfo = getErrorInfo(err.code)
    toast.error(errorInfo.message)
  }, [])

  const handleWarning = useCallback((warn: AlertData) => {
    setWarning(warn)
  }, [])

  const handleImageData = useCallback((validity: ImageValidity) => {
    setImageValidity(validity)
  }, [])

  const handleEnabledVitalSigns = useCallback((vitals: EnabledVitalSigns) => {
    setEnabledVitalSigns(vitals)
  }, [])

  const handleOfflineMeasurement = useCallback((offline: OfflineMeasurements) => {
    setOfflineMeasurements(offline)
  }, [])

  const handleActivation = useCallback((activationId: string) => {
    setLicenseActivationId(activationId)
  }, [])

  // Initialize SDK (only once, when license key is available)
  useEffect(() => {
    if (!isMobileDevice) return

    const licenseKey = EFFECTIVE_LICENSE_KEY
    if (!licenseKey) {
      console.error("NEXT_PUBLIC_BIOSENSESIGNAL_LICENSE_KEY is not set")
      toast.error("BiosenseSignal license key is not configured")
      return
    }

    // Trim whitespace and validate format
    const trimmedLicenseKey = licenseKey.trim()
    if (!trimmedLicenseKey || trimmedLicenseKey.length === 0) {
      console.error("License key is empty after trimming")
      toast.error("BiosenseSignal license key is invalid")
      return
    }

    // Log the key (first 10 chars only for security)
    const debugInfo = {
      keyLength: trimmedLicenseKey.length,
      keyPrefix: trimmedLicenseKey.substring(0, 10) + "...",
      keyFormat: trimmedLicenseKey.match(/^[A-F0-9-]+$/) ? "valid format" : "invalid format",
      hasWhitespace: trimmedLicenseKey !== licenseKey,
    }
    console.log("🔑 Initializing SDK with license key:", debugInfo)
    setLicenseDebug(
      `License key length: ${debugInfo.keyLength}, prefix: ${debugInfo.keyPrefix}, format: ${debugInfo.keyFormat}, trimmed: ${debugInfo.hasWhitespace ? "yes" : "no"}`
    )

    let isCancelled = false

    async function initializeSDK() {
      try {
        setIsInitializing(true)

        await healthMonitorManager.initialize({
          licenseKey: trimmedLicenseKey,
          licenseInfo: {
            onEnabledVitalSigns: handleEnabledVitalSigns,
            onOfflineMeasurement: handleOfflineMeasurement,
            onActivation: handleActivation,
          },
        })

        console.log("✅ SDK initialized successfully")
        setLicenseDebug((prev) => (prev ? prev + " | SDK init: OK" : "SDK init: OK"))
        setIsInitializing(false)
      } catch (err) {
        console.error("Failed to initialize BiosenseSignal SDK", err)
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Failed to initialize face scan"
        toast.error(message)
        setLicenseDebug((prev) => (prev ? prev + ` | SDK init error: ${message}` : `SDK init error: ${message}`))
        setIsInitializing(false)
      }
    }

    initializeSDK()

    return () => {
      isCancelled = true
    }
  }, [isMobileDevice, handleEnabledVitalSigns, handleOfflineMeasurement, handleActivation])

  // Create session (after SDK is initialized and video/camera are ready)
  useEffect(() => {
    if (!isMobileDevice) return
    if (!videoRef.current) return
    if (!selectedCameraId) return
    if (isInitializing) return // Wait for SDK initialization to complete

    let isCancelled = false

    async function createSession() {
      try {
        const options: FaceSessionOptions = {
          input: videoRef.current!,
          cameraDeviceId: selectedCameraId!,
          processingTime: measurementDuration,
          onVitalSign: handleVitalSign,
          onFinalResults: handleFinalResults,
          onError: handleError,
          onWarning: handleWarning,
          onStateChange: handleStateChange,
          onImageData: handleImageData,
          orientation: DeviceOrientation.PORTRAIT,
        }

        const session = await healthMonitorManager.createFaceSession(options)
        if (isCancelled) {
          await session.terminate()
          return
        }

        sessionRef.current = session
      } catch (err) {
        console.error("Failed to create face session", err)
        toast.error("Failed to create face scan session")
      }
    }

    createSession()

    return () => {
      isCancelled = true
      const session = sessionRef.current
      sessionRef.current = null

      if (session) {
        session.terminate().catch((err: unknown) => {
          console.warn("Error terminating session", err)
        })
      }
    }
  }, [
    isMobileDevice,
    selectedCameraId,
    measurementDuration,
    isInitializing,
    handleVitalSign,
    handleFinalResults,
    handleError,
    handleWarning,
    handleStateChange,
    handleImageData,
  ])

  // Update measurement progress
  useEffect(() => {
    if (!isMeasuring) return

    setMeasurementProgress(0)
    const start = Date.now()

    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const progress = Math.min((elapsed / measurementDuration) * 100, 100)
      setMeasurementProgress(progress)

      if (progress >= 100) {
        window.clearInterval(interval)
      }
    }, 500)

    return () => window.clearInterval(interval)
  }, [isMeasuring, measurementDuration])

  const handleStartMeasurement = useCallback(async () => {
    if (!sessionRef.current) return
    try {
      setError(null)
      setWarning(null)
      setFinalResults(null)
      setMeasurementProgress(0)
      await sessionRef.current.start()
    } catch (err) {
      console.error("Failed to start measurement", err)
      toast.error("Could not start measurement")
    }
  }, [])

  const handleStopMeasurement = useCallback(async () => {
    if (!sessionRef.current) return
    try {
      await sessionRef.current.stop()
    } catch (err) {
      console.error("Failed to stop measurement", err)
      toast.error("Could not stop measurement")
    }
  }, [])

  const handleRestartMeasurement = useCallback(async () => {
    setFinalResults(null)
    setVitalSigns(null)
    setError(null)
    setWarning(null)
    setMeasurementProgress(0)
    if (sessionRef.current && sessionState === SessionState.ACTIVE) {
      await handleStartMeasurement()
    }
  }, [handleStartMeasurement, sessionState])

  // Prepare vital signs display
  const results = finalResults?.results || null
  const vitalSignsDisplay = [
    {
      label: "Pulse Rate",
      value: finalResults?.results?.pulseRate?.value,
      unit: "bpm",
      icon: <IconHeartbeat className="w-5 h-5" />,
      enabled: enabledVitalSigns?.isEnabledPulseRate,
    },
    {
      label: "Respiration Rate",
      value: finalResults?.results?.respirationRate?.value,
      unit: "brpm",
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
  ].filter((vs) => vs.enabled !== false)

  // Desktop: Show QR code interface
  if (!isMobileDevice) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <SidebarWrapper role="patient" variant="inset" />
        <SidebarInset>
          <RoleHeader
            title="Self Check"
            description="Scan the QR code on your mobile device to open the QHealth face scan experience"
          />

          <div className="flex flex-1 flex-col bg-muted/40">
            <div className="@container/main flex flex-1 flex-col">
              <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-8 lg:py-12">
                <div className="rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur md:p-8">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <IconQrcode className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Self Check</p>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">
                          Scan to open QHealth face scan
                        </h2>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground md:text-base">
                      The face scan requires a mobile device. Use your phone camera or any QR scanner to open the QHealth face scan experience on your mobile device.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-8 md:grid-cols-[auto,1fr] md:items-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="rounded-2xl border bg-background p-4 shadow-sm md:p-6">
                        {currentUrl && <QRCode value={currentUrl} size={240} />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Aim your camera at the code to open the link.
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-4">
                      <Card className="border-dashed bg-muted/60">
                        <CardHeader className="gap-1">
                          <CardTitle className="text-base font-semibold">Direct link</CardTitle>
                          <CardDescription className="text-sm">
                            Prefer to tap? Open the face scan in a new tab or share it.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg border bg-background px-3 py-2 text-sm font-medium text-foreground break-all">
                            {currentUrl || "Loading..."}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={handleCopyLink}
                            >
                              <IconCopy className="h-4 w-4" />
                              Copy link
                            </Button>
                            {currentUrl && (
                              <Link href={currentUrl} target="_blank" rel="noreferrer noopener">
                                <Button className="flex items-center gap-2">
                                  <IconExternalLink className="h-4 w-4" />
                                  Open link
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Mobile: Show face scan interface
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="patient" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Self Check"
          description="Measure your vital signs using face scan technology"
        />

        {licenseDebug && (
          <div className="px-4 pt-2 text-[10px] text-muted-foreground">
            <p>SDK Debug: {licenseDebug}</p>
          </div>
        )}

        <div className="relative flex flex-1 flex-col bg-black min-h-[calc(100vh-var(--header-height))] pb-24">
          <div className="@container/main flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center p-4">
              {/* Video Preview - Full Screen */}
              <div className="relative w-full flex-1 bg-black rounded-lg overflow-hidden max-w-2xl">
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
                  className="w-full h-full object-cover"
                />

                {/* Face Guide Overlay - Show when session is ACTIVE but not measuring */}
                {sessionState === SessionState.ACTIVE && !isMeasuring && !isInitializing && (
                  <div className="absolute inset-0 z-5 pointer-events-none">
                    {/* Darkened overlay with oval cutout using SVG mask */}
                    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                      <defs>
                        <mask id="face-guide-mask">
                          <rect width="100%" height="100%" fill="black" />
                          <ellipse
                            cx="50%"
                            cy="45%"
                            rx="35%"
                            ry="30%"
                            fill="white"
                          />
                        </mask>
                      </defs>
                      <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.6)"
                        mask="url(#face-guide-mask)"
                      />
                    </svg>
                    
                    {/* Face guide frame */}
                    <div
                      className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                      style={{ zIndex: 2 }}
                    >
                      <div
                        className="relative"
                        style={{
                          width: "70vw",
                          maxWidth: "400px",
                          height: "60vh",
                          maxHeight: "500px",
                        }}
                      >
                        {/* Main oval frame using SVG for better control */}
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 200 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <ellipse
                            cx="100"
                            cy="100"
                            rx="90"
                            ry="75"
                            fill="none"
                            stroke={imageValidity === ImageValidity.VALID ? "#10b981" : "#3b82f6"}
                            strokeWidth="3"
                            strokeDasharray={imageValidity === ImageValidity.VALID ? "0" : "8 4"}
                            className={imageValidity === ImageValidity.VALID ? "animate-pulse" : ""}
                          />
                        </svg>
                        
                        {/* Corner guides */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/70" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/70" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/70" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/70" />
                        
                        {/* Center dot */}
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: imageValidity === ImageValidity.VALID ? "#10b981" : "#3b82f6",
                          }}
                        />
                      </div>
                    </div>

                    {/* Positioning instruction */}
                    <div className="absolute top-8 left-0 right-0 z-10 text-center px-4" style={{ zIndex: 3 }}>
                      <p className="text-white text-sm font-medium drop-shadow-lg bg-black/30 px-3 py-1 rounded-full inline-block">
                        {imageValidity === ImageValidity.VALID
                          ? "✓ Face detected! Ready to measure"
                          : "Position your face within the frame"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Image Validity Overlay */}
                {sessionState === SessionState.ACTIVE || sessionState === SessionState.MEASURING ? (
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    {imageValidity !== ImageValidity.VALID && imageValidity !== null && (
                      <Alert variant={formatImageValidity(imageValidity).type === "error" ? "destructive" : "default"}>
                        <IconAlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {formatImageValidity(imageValidity).message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}

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

              {/* Results - Above fixed button */}
              {finalResults && (
                <Card className="w-full max-w-2xl mt-4 mb-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconCircleCheck className="w-5 h-5 text-green-500" />
                      Measurement Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vitalSignsDisplay.map((vs, index) => (
                        vs.value !== null && vs.value !== undefined ? (
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
                              <p className="text-lg font-bold">
                                {typeof vs.value === "string" ? vs.value : Math.round(vs.value)}
                              </p>
                            </div>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error and Warning Alerts - Above fixed button */}
              <div className="w-full max-w-2xl mt-4 space-y-2">
                {error && (
                  <Alert variant="destructive">
                    <IconAlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {(() => {
                        const errorInfo = getErrorInfo(error.code)
                        return (
                          <div className="space-y-2">
                            <p>{errorInfo.message}</p>
                            <p className="text-xs text-muted-foreground">{errorInfo.solution}</p>
                            <p className="text-xs text-muted-foreground">Error code: {error.code}</p>
                          </div>
                        )
                      })()}
                    </AlertDescription>
                  </Alert>
                )}

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
            </div>
          </div>

          {/* Fixed/Floating Button at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t p-4 safe-area-bottom">
            <div className="mx-auto max-w-2xl w-full flex flex-col gap-3">
              {!finalResults ? (
                <>
                  <Button
                    onClick={handleStartMeasurement}
                    disabled={!canStartMeasurement || isInitializing}
                    className="w-full"
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
                      className="w-full"
                    >
                      <IconVideoOff className="w-5 h-5 mr-2" />
                      Stop Measurement
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={handleRestartMeasurement}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <IconVideo className="w-5 h-5 mr-2" />
                  New Measurement
                </Button>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

