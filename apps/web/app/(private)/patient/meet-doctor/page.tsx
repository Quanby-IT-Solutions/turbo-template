"use client"

import * as React from "react"
import {
  IconVideo,
  IconCopy,
  IconCalendar,
  IconPhoneOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideoOff,
  IconUser,
  IconFileText,
  IconMenu2,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Input } from "@/core/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useWebRTC } from "@/core/hooks/use-webrtc"
import { authApi } from "@/features/auth/api/auth-api"
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import type { Doctor } from "@/services/api/types"
import type { User } from "@/services/api/types"
import { diagnosesApi, type Diagnosis } from "@/features/diagnoses/api/diagnoses-api"
import { prescriptionsApi, type Prescription } from "@/features/prescriptions/api/prescriptions-api"
import { labRequestsApi, type LabRequest } from "@/features/lab-requests/api/lab-requests-api"

export default function MeetDoctorPage() {
  const [meetingCode, setMeetingCode] = React.useState("")
  const [isInCall, setIsInCall] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isVideoOff, setIsVideoOff] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [patientProfile, setPatientProfile] = React.useState<User | null>(null)
  const [showDoctorInfo, setShowDoctorInfo] = React.useState(false)
  const [doctorInfo, setDoctorInfo] = React.useState<Doctor | null>(null)
  const [loadingDoctorInfo, setLoadingDoctorInfo] = React.useState(false)
  const [showRecordsModal, setShowRecordsModal] = React.useState(false)
  const [loadingRecords, setLoadingRecords] = React.useState(false)
  const [diagnoses, setDiagnoses] = React.useState<Diagnosis[]>([])
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([])
const [labRequests, setLabRequests] = React.useState<LabRequest[]>([])
  const [recordsRefreshNonce, setRecordsRefreshNonce] = React.useState(0)
  const hasSentPatientInfoRef = React.useRef(false)

  const localVideoRef = React.useRef<HTMLVideoElement>(null)
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null)

  const {
    localStream,
    remoteStream,
    currentRoomId,
    connectionState,
    isConnected,
    initSocket,
    initPeer,
    getUserMedia,
    join,
    leave,
    dataChannel,
    dataChannelMessage,
  } = useWebRTC()

  // Initialize socket on mount
  React.useEffect(() => {
    initSocket()
  }, [initSocket])

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authApi.getProfile()
        if (response.success && response.data) {
          setPatientProfile(response.data)
        }
      } catch (error) {
        console.error("❌ Failed to fetch patient profile:", error)
      }
    }
    fetchProfile()
  }, [])

  // Debug: Log local stream changes
  React.useEffect(() => {
    console.log("🔍 Local stream state changed:", {
      hasStream: !!localStream,
      streamId: localStream?.id,
      active: localStream?.active,
      tracks: localStream?.getTracks().length,
    })
  }, [localStream])

  // Update video elements when streams change
  React.useEffect(() => {
    console.log("🔄 Local stream effect triggered:", {
      hasVideoRef: !!localVideoRef.current,
      hasLocalStream: !!localStream,
      streamId: localStream?.id,
      streamActive: localStream?.active,
      tracks: localStream?.getTracks().length,
      videoTracks: localStream?.getVideoTracks().length,
    })
    
    if (localVideoRef.current && localStream) {
      console.log("📹 Setting local video stream:", {
        id: localStream.id,
        active: localStream.active,
        tracks: localStream.getTracks().length,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
      })
      
      // Check if stream already set to avoid unnecessary updates
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
        console.log("✅ Local video srcObject set")
      } else {
        console.log("⏭️ Local video srcObject already set, skipping")
      }
      
      // Ensure video plays
      localVideoRef.current.play().then(() => {
        console.log("▶️ Local video play() resolved")
      }).catch((error) => {
        console.error("❌ Error playing local video:", error)
      })
    } else if (localVideoRef.current && !localStream) {
      console.warn("⚠️ Local video ref exists but no stream")
      localVideoRef.current.srcObject = null
    } else if (!localVideoRef.current && localStream) {
      console.warn("⚠️ Local stream exists but video ref not ready")
    }
  }, [localStream])

  // Ensure local video is set when element becomes available
  React.useEffect(() => {
    if (isInCall && localVideoRef.current && localStream) {
      console.log("🎬 Setting up local video element:", {
        hasRef: !!localVideoRef.current,
        hasStream: !!localStream,
        currentSrcObject: !!localVideoRef.current.srcObject,
      })
      
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream
        console.log("✅ Local video srcObject updated")
      }
      
      // Force play
      localVideoRef.current.play().then(() => {
        console.log("▶️ Local video play() successful")
      }).catch((error) => {
        console.error("❌ Local video play() error:", error)
      })
    }
  }, [isInCall, localStream])

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("📹 Setting remote video stream:", {
        id: remoteStream.id,
        active: remoteStream.active,
        tracks: remoteStream.getTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
      })
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch((error) => {
        console.error("❌ Error playing remote video:", error)
      })
    } else if (remoteVideoRef.current && !remoteStream) {
      // Clear video if stream is removed
      remoteVideoRef.current.srcObject = null
    }
  }, [remoteStream])

  const copyMeetingCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode)
      toast.success("Meeting code copied to clipboard")
    } else {
      toast.error("Please enter a meeting code first")
    }
  }

  const joinMeeting = async () => {
    if (!meetingCode || meetingCode.length !== 6) {
      toast.error("Please enter a valid 6-character meeting code")
      return
    }

    setIsJoining(true)
    try {
      // Initialize peer connection
      await initPeer()

      // Get user media
      const stream = await getUserMedia()
      console.log("📹 getUserMedia completed:", {
        streamId: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      })

      // Join room as patient
      const response = await join(meetingCode, "patient")

      if (response.ok) {
        setIsInCall(true)
        toast.success("Joined meeting successfully")
      } else {
        toast.error(response.error || "Failed to join meeting")
        setIsJoining(false)
      }
    } catch (error: unknown) {
      console.error("Error joining meeting:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join meeting")
      setIsJoining(false)
    }
  }

  const endMeeting = async () => {
    try {
      await leave()
      setIsInCall(false)
      setMeetingCode("")
      setShowDoctorInfo(false)
      setDoctorInfo(null)
      hasSentPatientInfoRef.current = false
      toast.success("Left meeting")
    } catch (error: unknown) {
      console.error("Error leaving meeting:", error)
      toast.error("Failed to leave meeting")
    }
  }

  React.useEffect(() => {
    if (
      !isInCall ||
      !patientProfile ||
      !dataChannel ||
      dataChannel.readyState !== "open" ||
      hasSentPatientInfoRef.current
    ) {
      return
    }

    const sendInfo = () => {
      try {
        dataChannel.send(
          JSON.stringify({
            type: "patient-info",
            user: patientProfile,
            timestamp: Date.now(),
          })
        )
        hasSentPatientInfoRef.current = true
        console.log("📡 Patient info sent to doctor")
      } catch (error) {
        console.error("❌ Failed to send patient info:", error)
      }
    }

    // Send immediately, then once more after a short delay as a backup
    sendInfo()
    const timeout = setTimeout(() => {
      if (!hasSentPatientInfoRef.current) {
        sendInfo()
      }
    }, 1200)

    return () => clearTimeout(timeout)
  }, [isInCall, patientProfile, dataChannel])

  // Respond to explicit doctor requests for patient info
  React.useEffect(() => {
    if (!dataChannel || dataChannel.readyState !== "open") return
    const handleMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed?.type === "request-patient-info" && patientProfile) {
          dataChannel.send(
            JSON.stringify({
              type: "patient-info",
              user: patientProfile,
              timestamp: Date.now(),
            })
          )
          hasSentPatientInfoRef.current = true
          console.log("📡 Patient info sent in response to request")
        }
      } catch {
        // ignore non-JSON messages
      }
    }
    dataChannel.addEventListener("message", handleMessage)
    return () => {
      dataChannel.removeEventListener("message", handleMessage)
    }
  }, [dataChannel, patientProfile])

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const fetchDoctorInfo = async () => {
    if (!currentRoomId) {
      toast.error("No active meeting room")
      return
    }

    setLoadingDoctorInfo(true)
    try {
      const response = await doctorsApi.getDoctorByRoomId(currentRoomId)
      if (response.success && response.data) {
        setDoctorInfo(response.data)
        setShowDoctorInfo(true)
      } else {
        toast.error(response.message || "Failed to fetch doctor information")
      }
    } catch (error: unknown) {
      console.error("Error fetching doctor info:", error)
      toast.error("An error occurred while fetching doctor information")
    } finally {
      setLoadingDoctorInfo(false)
    }
  }

  // Listen for refresh signal from doctor over data channel
  React.useEffect(() => {
    if (dataChannelMessage && (dataChannelMessage as any).type === "refresh-records") {
      setRecordsRefreshNonce((n) => n + 1)
    }
  }, [dataChannelMessage])

  const fetchPatientRecords = async () => {
    if (!patientProfile?.id) {
      toast.error("Patient profile not available")
      return
    }
    if (!currentRoomId) {
      toast.error("No active meeting room")
      return
    }
    setLoadingRecords(true)
    try {
      const [diagRes, presRes, labRes] = await Promise.all([
        diagnosesApi.getRoomDiagnoses(currentRoomId),
        prescriptionsApi.getRoomPrescriptions(currentRoomId),
        labRequestsApi.getRoomLabRequests(currentRoomId),
      ])

      const filteredDiagnoses = diagRes.success && diagRes.data ? diagRes.data : []
      const filteredPrescriptions = presRes.success && presRes.data ? presRes.data : []
      const filteredLabRequests = labRes.success && labRes.data ? labRes.data : []

      setDiagnoses(filteredDiagnoses)
      setPrescriptions(filteredPrescriptions)
      setLabRequests(filteredLabRequests)

      if (!diagRes.success && diagRes.message) toast.error(diagRes.message)
      if (!presRes.success && presRes.message) toast.error(presRes.message)
      if (!labRes.success && labRes.message) toast.error(labRes.message)

      setShowRecordsModal(true)
    } catch (error: unknown) {
      console.error("Error fetching records:", error)
      toast.error("Failed to load diagnosis and prescriptions")
    } finally {
      setLoadingRecords(false)
    }
  }

  // Auto-refresh when doctor notifies
  React.useEffect(() => {
    if (!isInCall) return
    void fetchPatientRecords()
  }, [recordsRefreshNonce])

  const getConnectionStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="destructive">Disconnected</Badge>
    }
    switch (connectionState) {
      case "connected":
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case "connecting":
        return <Badge variant="default" className="bg-yellow-500">Connecting</Badge>
      case "disconnected":
        return <Badge variant="destructive">Disconnected</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">New</Badge>
    }
  }

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
          title="Meet Doctor" 
          description="Schedule and join video consultations with your doctor"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {!isInCall ? (
                  <Tabs defaultValue="join" className="w-full">
                    <TabsList className="mb-6">
                      <TabsTrigger value="join" className="flex items-center gap-2">
                        <IconVideo className="h-4 w-4" />
                        Join via Code
                      </TabsTrigger>
                      <TabsTrigger value="scheduled" className="flex items-center gap-2">
                        <IconCalendar className="h-4 w-4" />
                        Scheduled Consultations
                      </TabsTrigger>
                    </TabsList>

                    {/* Join via Code Tab */}
                    <TabsContent value="join">
                      <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
                        <Card className="w-full max-w-md">
                          <CardContent className="p-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                              <div className="relative">
                                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-foreground bg-muted/50">
                                  <div className="relative">
                                    <IconVideo className="h-14 w-14" />
                                    <div className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                                      ✓
                                    </div>
                                    <div className="absolute bottom-0 right-0 h-2 w-2 bg-primary rounded-sm" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold text-center mb-6">
                              Join Doctor Meeting
                            </h2>

                            {/* Meeting Code Input */}
                            <div className="mb-6">
                              <div className="flex gap-2">
                                <Input
                                  value={meetingCode}
                                  onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                                  placeholder="Enter meeting code"
                                  className="flex-1 text-center font-mono text-lg"
                                  maxLength={6}
                                  disabled={isJoining}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={copyMeetingCode}
                                  className="h-9 w-9"
                                  disabled={!meetingCode || isJoining}
                                >
                                  <IconCopy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Join Meeting Button */}
                            <Button 
                              className="w-full mb-3" 
                              size="lg"
                              onClick={joinMeeting}
                              disabled={!meetingCode || meetingCode.length !== 6 || isJoining}
                            >
                              {isJoining ? "Joining..." : "Join Meeting"}
                            </Button>

                            {/* Connection Status */}
                            <div className="flex justify-center mb-6">
                              {getConnectionStatusBadge()}
                            </div>

                            {/* Descriptive Text */}
                            <div className="space-y-2 text-center text-sm text-muted-foreground">
                              <p>
                                Enter a meeting code provided by your doctor to join the consultation
                              </p>
                              <p>
                                Make sure you have a stable internet connection before joining
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Scheduled Consultations Tab */}
                    <TabsContent value="scheduled">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Upcoming Consultations</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            View and join your scheduled consultations
                          </p>
                        </div>
                        <Button>Schedule Consultation</Button>
                      </div>
                      <div className="grid gap-4">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Dr. Sarah Johnson</CardTitle>
                                <CardDescription>Monday, January 20, 2024 at 10:00 AM</CardDescription>
                              </div>
                              <Badge variant="default">Scheduled</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Consultation Type: Follow-up • Duration: 30 minutes
                              </p>
                              <Button onClick={() => {
                                setMeetingCode("7OHKDL")
                                joinMeeting()
                              }}>
                                Join Meeting
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>Dr. Michael Chen</CardTitle>
                                <CardDescription>Tuesday, January 21, 2024 at 2:30 PM</CardDescription>
                              </div>
                              <Badge variant="default">Scheduled</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Consultation Type: General Check-up • Duration: 45 minutes
                              </p>
                              <Button onClick={() => {
                                setMeetingCode("7OHKDL")
                                joinMeeting()
                              }}>
                                Join Meeting
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Video Call Interface */}
                    <div className="relative w-full h-[calc(100vh-300px)] bg-black rounded-lg overflow-hidden">
                      {/* Remote Video (Doctor) */}
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => {
                          console.log("✅ Remote video metadata loaded")
                        }}
                        onPlay={() => {
                          console.log("▶️ Remote video started playing")
                        }}
                        onError={(e) => {
                          console.error("❌ Remote video error:", e)
                        }}
                      />

                      {/* Local Video (Patient) - Picture in Picture */}
                      <div className="absolute top-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-white shadow-lg">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          onLoadedMetadata={() => {
                            console.log("✅ Local video metadata loaded")
                          }}
                          onPlay={() => {
                            console.log("▶️ Local video started playing")
                          }}
                          onError={(e) => {
                            console.error("❌ Local video error:", e)
                          }}
                        />
                        {isVideoOff && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <IconVideoOff className="h-12 w-12 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Connection Status Overlay */}
                      <div className="absolute top-4 left-4">
                        {getConnectionStatusBadge()}
                      </div>

                      {/* Room ID Display */}
                      <div className="absolute bottom-20 left-4">
                        <Badge variant="secondary" className="font-mono">
                          Room: {currentRoomId}
                        </Badge>
                      </div>

                    </div>

                    {/* Call Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant={isMuted ? "destructive" : "outline"}
                        size="lg"
                        onClick={toggleMute}
                        className="rounded-full h-14 w-14"
                      >
                        {isMuted ? (
                          <IconMicrophoneOff className="h-6 w-6" />
                        ) : (
                          <IconMicrophone className="h-6 w-6" />
                        )}
                      </Button>

                      <Button
                        variant={isVideoOff ? "destructive" : "outline"}
                        size="lg"
                        onClick={toggleVideo}
                        className="rounded-full h-14 w-14"
                      >
                        {isVideoOff ? (
                          <IconVideoOff className="h-6 w-6" />
                        ) : (
                          <IconVideo className="h-6 w-6" />
                        )}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="rounded-full h-14 w-14 border border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none"
                          title="Consultation actions"
                        >
                          <IconMenu2 className="h-6 w-6" />
                          <span className="sr-only">Consultation actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-56">
                          <DropdownMenuItem
                            disabled={loadingDoctorInfo || !remoteStream}
                            onSelect={(event) => {
                              event.preventDefault()
                              if (loadingDoctorInfo || !remoteStream) return
                              fetchDoctorInfo()
                            }}
                          >
                            <IconUser className="mr-2 h-4 w-4" />
                            View doctor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={loadingRecords || !remoteStream || !currentRoomId}
                            onSelect={(event) => {
                              event.preventDefault()
                              if (loadingRecords || !remoteStream || !currentRoomId) return
                              fetchPatientRecords()
                            }}
                          >
                            <IconFileText className="mr-2 h-4 w-4" />
                            Diagnoses & prescriptions
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={endMeeting}
                        className="rounded-full h-14 w-14"
                      >
                        <IconPhoneOff className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Dialog open={showDoctorInfo} onOpenChange={setShowDoctorInfo}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Doctor Information</DialogTitle>
              <DialogDescription>
                Credentials, specialization, and contact details for your consultation.
              </DialogDescription>
            </DialogHeader>
            {doctorInfo && (
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Profile</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-base font-medium">
                        {[
                          doctorInfo.doctorInfo?.firstName,
                          doctorInfo.doctorInfo?.middleName,
                          doctorInfo.doctorInfo?.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base font-medium">{doctorInfo.email}</p>
                    </div>
                    {doctorInfo.doctorInfo?.specialization && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                        <p className="text-base font-medium">{doctorInfo.doctorInfo.specialization}</p>
                      </div>
                    )}
                    {doctorInfo.doctorInfo?.experience !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Experience</label>
                        <p className="text-base font-medium">
                          {doctorInfo.doctorInfo.experience} yrs
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {(doctorInfo.doctorInfo?.qualifications ||
                  doctorInfo.doctorInfo?.contactNumber ||
                  doctorInfo.doctorInfo?.approvalStatus) && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-2">Details</h3>
                    {doctorInfo.doctorInfo?.qualifications && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Qualifications</label>
                        <p className="text-base font-medium whitespace-pre-wrap">
                          {doctorInfo.doctorInfo.qualifications}
                        </p>
                      </div>
                    )}
                    {doctorInfo.doctorInfo?.contactNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Number</label>
                        <p className="text-base font-medium">{doctorInfo.doctorInfo.contactNumber}</p>
                      </div>
                    )}
                    {doctorInfo.doctorInfo?.approvalStatus && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Approval Status</label>
                        <p className="text-base font-medium">{doctorInfo.doctorInfo.approvalStatus}</p>
                      </div>
                    )}
                  </div>
                )}

                {doctorInfo.organizationId && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-2">Organization</h3>
                    <p className="text-sm text-muted-foreground">
                      Organization ID: <span className="font-medium">{doctorInfo.organizationId}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowDoctorInfo(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Records Modal */}
        <Dialog open={showRecordsModal} onOpenChange={setShowRecordsModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Your Diagnoses & Prescriptions</DialogTitle>
              <DialogDescription>
                Items associated with your account. (Newest first)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Diagnoses</h3>
                {diagnoses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diagnoses found.</p>
                ) : (
                  <div className="space-y-3">
                    {diagnoses
                      .slice()
                      .sort((a, b) => (b.diagnosedAt || "").localeCompare(a.diagnosedAt || ""))
                      .map((dx) => (
                        <div
                          key={dx.id}
                          className="border rounded-lg p-3 space-y-1 bg-muted/40"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{dx.diagnosisName}</p>
                            <Badge variant="outline">{dx.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Severity: {dx.severity}{dx.isPrimary ? " • Primary" : ""}
                          </p>
                          {dx.diagnosisCode && (
                            <p className="text-sm text-muted-foreground">
                              Code: {dx.diagnosisCode}
                            </p>
                          )}
                          {dx.description && (
                            <p className="text-sm whitespace-pre-wrap">
                              {dx.description}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {dx.onsetDate && <span>Onset: {new Date(dx.onsetDate).toLocaleDateString()} • </span>}
                            {dx.diagnosedAt && <span>Diagnosed: {new Date(dx.diagnosedAt).toLocaleDateString()} </span>}
                            {dx.resolvedAt && <span>• Resolved: {new Date(dx.resolvedAt).toLocaleDateString()}</span>}
                          </div>
                          {dx.notes && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Notes: {dx.notes}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Prescriptions</h3>
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prescriptions found.</p>
                ) : (
                  <div className="space-y-3">
                    {prescriptions
                      .slice()
                      .sort((a, b) => (b.prescribedAt || "").localeCompare(a.prescribedAt || ""))
                      .map((rx) => (
                        <div
                          key={rx.id}
                          className="border rounded-lg p-3 space-y-1 bg-muted/40"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{rx.medicationName}</p>
                            <Badge variant={rx.isActive ? "default" : "secondary"}>
                              {rx.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rx.dosage} • {rx.frequency} • {rx.duration}
                          </p>
                          {rx.instructions && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Instructions: {rx.instructions}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {rx.prescribedAt && <span>Prescribed: {new Date(rx.prescribedAt).toLocaleDateString()} </span>}
                            {rx.expiresAt && <span>• Expires: {new Date(rx.expiresAt).toLocaleDateString()}</span>}
                          </div>
                          {rx.notes && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Notes: {rx.notes}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Lab Requests</h3>
                {labRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lab requests found.</p>
                ) : (
                  <div className="space-y-3">
                    {labRequests
                      .slice()
                      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                      .map((lr) => (
                        <div
                          key={lr.id}
                          className="border rounded-lg p-3 space-y-1 bg-muted/40"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">Lab Request</p>
                            <Badge variant="outline">{lr.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Priority: {lr.priority}</p>
                          {lr.note && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Note: {lr.note}
                            </p>
                          )}
                          {lr.instructions && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Instructions: {lr.instructions}
                            </p>
                          )}
                          {lr.requestedTests && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              Requested Tests: {lr.requestedTests}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {lr.createdAt && <span>Created: {new Date(lr.createdAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowRecordsModal(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
