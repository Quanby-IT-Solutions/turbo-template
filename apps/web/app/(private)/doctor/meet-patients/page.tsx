"use client"

import * as React from "react"
import {
  IconVideo,
  IconCopy,
  IconRefresh,
  IconPhoneOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideoOff,
  IconUser,
  IconPill,
  IconFilePlus,
  IconMenu2,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { toast } from "sonner"
import { useWebRTC } from "@/core/hooks/use-webrtc"
import { patientsApi, type PatientInfo } from "@/features/patients/api/patients-api"
import type { User } from "@/services/api/types"
import { prescriptionsApi, type CreatePrescriptionRequest } from "@/features/prescriptions/api/prescriptions-api"
import { diagnosesApi, type CreateDiagnosisRequest } from "@/features/diagnoses/api/diagnoses-api"
import { labRequestsApi, type Priority } from "@/features/lab-requests/api/lab-requests-api"
import { organizationsApi } from "@/features/organizations/api/organizations-api"
import { doctorsApi } from "@/features/doctors/api/doctors-api"

// Safely map User payload coming from data channel into PatientInfo shape
const mapUserToPatientInfo = (user: User): PatientInfo => {
  const maybeInfo = (user as User & { patientInfo?: Record<string, unknown> }).patientInfo
  const info = maybeInfo && typeof maybeInfo === "object" ? maybeInfo : undefined

  const toStringOrUndefined = (val: unknown) =>
    typeof val === "string" ? val : undefined
  const toNumberOrUndefined = (val: unknown) =>
    typeof val === "number" ? val : undefined
  const toStringOrNullOrUndefined = (val: unknown) =>
    typeof val === "string" ? val : val === null ? null : undefined

  const safePatientInfo = info
    ? {
      firstName: toStringOrUndefined(info.firstName),
      middleName: toStringOrUndefined(info.middleName),
      lastName: toStringOrUndefined(info.lastName),
      gender: toStringOrUndefined(info.gender),
      dateOfBirth: toStringOrUndefined(info.dateOfBirth),
      contactNumber: toStringOrUndefined(info.contactNumber),
      address: toStringOrUndefined(info.address),
      weight: toNumberOrUndefined(info.weight),
      height: toNumberOrUndefined(info.height),
      bloodType: toStringOrUndefined(info.bloodType),
      medicalHistory: toStringOrUndefined(info.medicalHistory),
      allergies: toStringOrUndefined(info.allergies),
      medications: toStringOrUndefined(info.medications),
      philHealthId: toStringOrUndefined(info.philHealthId),
      philHealthStatus: toStringOrUndefined(info.philHealthStatus),
      philHealthCategory: toStringOrUndefined(info.philHealthCategory),
      philHealthExpiry: toStringOrUndefined(info.philHealthExpiry),
      philHealthMemberSince: toStringOrUndefined(info.philHealthMemberSince),
      philHealthIdImage: toStringOrNullOrUndefined(info.philHealthIdImage),
    }
    : undefined

  return {
    id: user.id,
    email: user.email,
    patientInfo: safePatientInfo,
  }
}

export default function MeetPatientsPage() {
  const [organizationOptions, setOrganizationOptions] = React.useState<{ value: string; label: string }[]>([])
  const [doctorOptions, setDoctorOptions] = React.useState<{ value: string; label: string }[]>([])
  const [meetingCode, setMeetingCode] = React.useState("")
  const [isInCall, setIsInCall] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isVideoOff, setIsVideoOff] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)
  const [showPatientInfo, setShowPatientInfo] = React.useState(false)
  const [patientInfo, setPatientInfo] = React.useState<PatientInfo | null>(null)
  const [loadingPatientInfo, setLoadingPatientInfo] = React.useState(false)
  const [showPrescriptionModal, setShowPrescriptionModal] = React.useState(false)
  const [isSubmittingPrescription, setIsSubmittingPrescription] = React.useState(false)
  const [showDiagnosisModal, setShowDiagnosisModal] = React.useState(false)
  const [isSubmittingDiagnosis, setIsSubmittingDiagnosis] = React.useState(false)
  const [showLabRequestModal, setShowLabRequestModal] = React.useState(false)
  const [isSubmittingLabRequest, setIsSubmittingLabRequest] = React.useState(false)
  const [prescriptionForm, setPrescriptionForm] = React.useState<CreatePrescriptionRequest>({
    patientId: "",
    consultationId: null,
    roomId: null,
    medicationName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    quantity: null,
    refills: 0,
    expiresAt: null,
    notes: "",
  })
  const [diagnosisForm, setDiagnosisForm] = React.useState<CreateDiagnosisRequest>({
    patientId: "",
    consultationId: null,
    roomId: null,
    diagnosisCode: "",
    diagnosisName: "",
    description: "",
    severity: "MILD",
    status: "ACTIVE",
    onsetDate: "",
    resolvedAt: "",
    notes: "",
    isPrimary: false,
  })
  const [labRequestForm, setLabRequestForm] = React.useState({
    patientId: "",
    targetType: "ORGANIZATION" as "ORGANIZATION" | "DOCTOR",
    targetId: "",
    note: "",
    priority: "NORMAL" as Priority,
    requestedTests: "",
    instructions: "",
    roomId: null as string | null,
  })
  const targetTypeRef = React.useRef<"ORGANIZATION" | "DOCTOR">("ORGANIZATION")
  const [doctorContext, setDoctorContext] = React.useState<{ doctorId: string; organizationId?: string | null } | null>(null)

  const loadTargets = React.useCallback(async (target: "ORGANIZATION" | "DOCTOR") => {
    try {
      if (target === "ORGANIZATION") {
        const res = await organizationsApi.getOrganizations(true)
        if (res.success && Array.isArray(res.data)) {
          setOrganizationOptions(
            res.data.map((org) => ({
              value: org.id,
              label: org.name || org.id,
            }))
          )
        } else {
          setOrganizationOptions([])
        }
      } else {
        const res = await doctorsApi.listDoctors({ limit: 50 })
        if (res.success && res.data?.items) {
          setDoctorOptions(
            res.data.items.map((doc) => ({
              value: doc.id,
              label:
                `${doc.doctorInfo?.firstName || ""} ${doc.doctorInfo?.lastName || ""}`.trim() ||
                doc.email ||
                doc.id,
            }))
          )
        } else {
          setDoctorOptions([])
        }
      }
    } catch (error) {
      console.error("Error loading targets:", error)
    }
  }, [])

  React.useEffect(() => {
    loadTargets(targetTypeRef.current)
  }, [loadTargets])

  // Auto-generate meeting code on mount if not set (e.g., when coming from patient records)
  React.useEffect(() => {
    if (!meetingCode && !isInCall) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      const newCode = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("")
      setMeetingCode(newCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - meetingCode and isInCall are intentionally excluded

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

  // Fetch doctor (requestor) context from room for required doctorId/organizationId
  React.useEffect(() => {
    const fetchDoctorContext = async () => {
      if (!currentRoomId) return
      try {
        const res = await doctorsApi.getDoctorByRoomId(currentRoomId)
        if (res.success && res.data) {
          setDoctorContext({
            doctorId: res.data.id,
            organizationId: res.data.organizationId || null,
          })
        }
      } catch (error) {
        console.error("Error fetching doctor context:", error)
      }
    }
    fetchDoctorContext()
  }, [currentRoomId])

  // Helper to ensure doctor context exists before actions that need doctorId/orgId
  const ensureDoctorContext = React.useCallback(async () => {
    if (doctorContext) return doctorContext
    if (!currentRoomId) return null
    try {
      const res = await doctorsApi.getDoctorByRoomId(currentRoomId)
      if (res.success && res.data) {
        const ctx = { doctorId: res.data.id, organizationId: res.data.organizationId || null }
        setDoctorContext(ctx)
        return ctx
      }
    } catch (error) {
      console.error("Error ensuring doctor context:", error)
    }
    return null
  }, [currentRoomId, doctorContext])

  // Initialize socket on mount and reconnect if disconnected
  React.useEffect(() => {
    // Always initialize socket when component mounts or when navigating to this page
    initSocket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for patient info via data channel
  React.useEffect(() => {
    if (dataChannelMessage && dataChannelMessage.type === "patient-info") {
      const patientInfoMessage = dataChannelMessage as { type: "patient-info"; user: User; timestamp: number }
      console.log("📡 Received patient info via data channel:", patientInfoMessage)

      if (patientInfoMessage.user) {
        const patientData: PatientInfo = mapUserToPatientInfo(patientInfoMessage.user)
        setPatientInfo(patientData)
        console.log("✅ Patient info updated from data channel")
      }
    }
  }, [dataChannelMessage])

  // Debug: Log local stream changes
  React.useEffect(() => {
    console.log("🔍 Local stream state changed:", {
      hasStream: !!localStream,
      streamId: localStream?.id,
      active: localStream?.active,
      tracks: localStream?.getTracks().length,
    })
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

  const generateMeetingCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const newCode = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
    setMeetingCode(newCode)
    toast.success("Meeting code generated")
  }

  const copyMeetingCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode)
      toast.success("Meeting code copied to clipboard")
    } else {
      toast.error("Please generate a meeting code first")
    }
  }

  const startMeeting = async () => {
    if (!meetingCode || meetingCode.length !== 6) {
      toast.error("Please enter a valid 6-character meeting code")
      return
    }

    setIsInitializing(true)
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

      // Join room as doctor
      const response = await join(meetingCode, "doctor")
      console.log("📨 Join response:", response)

      if (response && response.ok) {
        setIsInCall(true)
        setIsInitializing(false)
        toast.success("Meeting started successfully")
      } else {
        const errorMsg = response?.error || "Failed to start meeting"
        console.error("❌ Join failed:", errorMsg)
        toast.error(errorMsg)
        setIsInitializing(false)
      }
    } catch (error: unknown) {
      console.error("Error starting meeting:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start meeting")
      setIsInitializing(false)
    }
  }

  const endMeeting = async () => {
    try {
      await leave()
      setIsInCall(false)
      setMeetingCode("")
      toast.success("Meeting ended")
    } catch (error: unknown) {
      console.error("Error ending meeting:", error)
      toast.error("Failed to end meeting")
    }
  }

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

  const fetchPatientInfo = async (maxRetries = 2) => {
    // First, try to use patient info already received via data channel
    if (patientInfo) {
      setShowPatientInfo(true)
      return
    }

    // If data channel is ready, request patient info and wait briefly before falling back
    if (dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(
          JSON.stringify({
            type: "request-patient-info",
            timestamp: Date.now(),
          })
        )
        // Wait briefly to allow patient to respond via data channel
        await new Promise((resolve) => setTimeout(resolve, 1200))
        if (patientInfo) {
          setShowPatientInfo(true)
          return
        }
      } catch (error) {
        console.error("Error sending request-patient-info:", error)
      }
    }

    // Fallback to API if no patient info from data channel
    if (!currentRoomId) {
      toast.error("No active meeting room")
      return
    }

    setLoadingPatientInfo(true)
    let attempts = 0
    while (attempts <= maxRetries) {
      try {
        const response = await patientsApi.getPatientByRoomId(currentRoomId)
        if (response.success && response.data) {
          setPatientInfo(response.data)
          setShowPatientInfo(true)
          break
        } else if (response.error === "PATIENT_NOT_FOUND" && attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1200))
        } else {
          toast.error(response.message || "Failed to fetch patient information")
          break
        }
      } catch (error: unknown) {
        console.error("Error fetching patient info:", error)
        if (attempts >= maxRetries) {
          toast.error("An error occurred while fetching patient information")
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1200))
        }
      }
      attempts += 1
    }
    setLoadingPatientInfo(false)
  }

  const openPrescriptionModal = async () => {
    // First, try to use patient info already received via data channel
    const existingInfo = patientInfo
    if (existingInfo && typeof existingInfo.id === "string") {
      setPrescriptionForm((prev) => ({
        ...prev,
        patientId: existingInfo.id,
        consultationId: null,
        roomId: currentRoomId || null,
      }))
      setShowPrescriptionModal(true)
      return
    }

    // If data channel is ready, request patient info and wait briefly before falling back
    if (dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(
          JSON.stringify({
            type: "request-patient-info",
            timestamp: Date.now(),
          })
        )
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const infoAfterRequest = patientInfo
        if (infoAfterRequest && typeof infoAfterRequest.id === "string") {
          setPrescriptionForm((prev) => ({
            ...prev,
            patientId: infoAfterRequest.id,
            consultationId: null,
            roomId: currentRoomId || null,
          }))
          setShowPrescriptionModal(true)
          return
        }
      } catch (error) {
        console.error("Error sending request-patient-info:", error)
      }
    }

    // If we have a room ID, try to fetch patient from API
    if (currentRoomId) {
      setLoadingPatientInfo(true)
      let attempts = 0
      const maxRetries = 2
      while (attempts <= maxRetries) {
        try {
          const response = await patientsApi.getPatientByRoomId(currentRoomId)
          if (response.success && response.data) {
            const data = response.data as PatientInfo
            setPatientInfo(data)
            setPrescriptionForm((prev) => ({
              ...prev,
              patientId: data.id,
              consultationId: null,
              roomId: currentRoomId || null,
            }))
            setShowPrescriptionModal(true)
            setLoadingPatientInfo(false)
            return
          } else if (response.error === "PATIENT_NOT_FOUND" && attempts < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          } else {
            break
          }
        } catch (error: unknown) {
          console.error("Error fetching patient info:", error)
          if (attempts >= maxRetries) {
            break
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          }
        }
        attempts += 1
      }
      setLoadingPatientInfo(false)
    }

    // Open form anyway - user can fill it out manually or patient will be set when they join
    setPrescriptionForm((prev) => ({
      ...prev,
      patientId: prev.patientId || "",
      consultationId: null,
      roomId: currentRoomId || null,
    }))
    setShowPrescriptionModal(true)
    if (!currentRoomId) {
      toast.info("Please start a meeting or enter patient ID manually")
    }
  }

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prescriptionForm.patientId || !prescriptionForm.medicationName || !prescriptionForm.dosage || !prescriptionForm.frequency || !prescriptionForm.duration) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmittingPrescription(true)
    try {
      const response = await prescriptionsApi.createPrescription({
        ...prescriptionForm,
        consultationId: null, // roomId is not the consultationId
        roomId: prescriptionForm.roomId ?? currentRoomId ?? null,
        expiresAt: prescriptionForm.expiresAt || undefined,
        instructions: prescriptionForm.instructions || undefined,
        notes: prescriptionForm.notes || undefined,
        quantity: prescriptionForm.quantity ?? null,
        refills: typeof prescriptionForm.refills === "number" ? prescriptionForm.refills : 0,
      })
      if (response.success) {
        toast.success("Prescription created successfully")
        if (dataChannel && dataChannel.readyState === "open") {
          try {
            dataChannel.send(JSON.stringify({ type: "refresh-records", consultationId: currentRoomId || null }))
          } catch (err) {
            console.warn("📡 Failed to notify patient to refresh records:", err)
          }
        }
        setShowPrescriptionModal(false)
        // Reset form
        setPrescriptionForm({
          patientId: "",
          consultationId: null,
          medicationName: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          quantity: null,
          refills: 0,
          expiresAt: null,
          notes: "",
        })
      } else {
        toast.error(response.message || "Failed to create prescription")
      }
    } catch (error: unknown) {
      console.error("Error creating prescription:", error)
      toast.error("An error occurred while creating prescription")
    } finally {
      setIsSubmittingPrescription(false)
    }
  }

  const openDiagnosisModal = async () => {
    const existingInfo = patientInfo
    if (existingInfo && typeof existingInfo.id === "string") {
      setDiagnosisForm((prev) => ({
        ...prev,
        patientId: existingInfo.id,
        consultationId: null,
        roomId: currentRoomId || null,
      }))
      setShowDiagnosisModal(true)
      return
    }

    if (dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(
          JSON.stringify({
            type: "request-patient-info",
            timestamp: Date.now(),
          })
        )
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const infoAfterRequest = patientInfo
        if (infoAfterRequest && typeof infoAfterRequest.id === "string") {
          setDiagnosisForm((prev) => ({
            ...prev,
            patientId: infoAfterRequest.id,
            consultationId: null,
            roomId: currentRoomId || null,
          }))
          setShowDiagnosisModal(true)
          return
        }
      } catch (error) {
        console.error("Error sending request-patient-info:", error)
      }
    }

    // If we have a room ID, try to fetch patient from API
    if (currentRoomId) {
      setLoadingPatientInfo(true)
      let attempts = 0
      const maxRetries = 2
      while (attempts <= maxRetries) {
        try {
          const response = await patientsApi.getPatientByRoomId(currentRoomId)
          if (response.success && response.data) {
            const data = response.data as PatientInfo
            setPatientInfo(data)
            setDiagnosisForm((prev) => ({
              ...prev,
              patientId: data.id,
              consultationId: null,
              roomId: currentRoomId || null,
            }))
            setShowDiagnosisModal(true)
            setLoadingPatientInfo(false)
            return
          } else if (response.error === "PATIENT_NOT_FOUND" && attempts < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          } else {
            break
          }
        } catch (error: unknown) {
          console.error("Error fetching patient info:", error)
          if (attempts >= maxRetries) {
            break
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          }
        }
        attempts += 1
      }
      setLoadingPatientInfo(false)
    }

    // Open form anyway - user can fill it out manually or patient will be set when they join
    setDiagnosisForm((prev) => ({
      ...prev,
      patientId: prev.patientId || "",
      consultationId: null,
      roomId: currentRoomId || null,
    }))
    setShowDiagnosisModal(true)
    if (!currentRoomId) {
      toast.info("Please start a meeting or enter patient ID manually")
    }
  }

  const handleDiagnosisSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!diagnosisForm.patientId || !diagnosisForm.diagnosisName) {
      toast.error("Patient and diagnosis name are required")
      return
    }

    setIsSubmittingDiagnosis(true)
    try {
      const payload = {
        ...diagnosisForm,
        consultationId: null, // consultation not mapped to room in backend
        roomId: diagnosisForm.roomId || currentRoomId || null,
        diagnosisCode: diagnosisForm.diagnosisCode || undefined,
        description: diagnosisForm.description || undefined,
        onsetDate: diagnosisForm.onsetDate || undefined,
        resolvedAt: diagnosisForm.resolvedAt || undefined,
        notes: diagnosisForm.notes || undefined,
      }
      const response = await diagnosesApi.createDiagnosis(payload)
      if (response.success) {
        toast.success("Diagnosis saved successfully")
        if (dataChannel && dataChannel.readyState === "open") {
          try {
            dataChannel.send(JSON.stringify({ type: "refresh-records", consultationId: currentRoomId || null }))
          } catch (err) {
            console.warn("📡 Failed to notify patient to refresh records:", err)
          }
        }
        setShowDiagnosisModal(false)
        setDiagnosisForm({
          patientId: "",
          consultationId: null,
          diagnosisCode: "",
          diagnosisName: "",
          description: "",
          severity: "MILD",
          status: "ACTIVE",
          onsetDate: "",
          resolvedAt: "",
          notes: "",
          isPrimary: false,
        })
      } else {
        toast.error(response.message || "Failed to save diagnosis")
      }
    } catch (error: unknown) {
      console.error("Error creating diagnosis:", error)
      toast.error("An error occurred while saving diagnosis")
    } finally {
      setIsSubmittingDiagnosis(false)
    }
  }

  const openLabRequestModal = async () => {
    // Try to get doctor context, but don't block if not available
    const ctx = await ensureDoctorContext()
    if (!ctx && currentRoomId) {
      toast.warning("Doctor context not found. Some fields may need manual entry.")
    }

    const existingInfo = patientInfo
    if (existingInfo && typeof existingInfo.id === "string") {
      setLabRequestForm((prev) => ({
        ...prev,
        patientId: existingInfo.id,
        roomId: currentRoomId || null,
      }))
      setShowLabRequestModal(true)
      return
    }

    if (dataChannel && dataChannel.readyState === "open") {
      try {
        dataChannel.send(
          JSON.stringify({
            type: "request-patient-info",
            timestamp: Date.now(),
          })
        )
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const infoAfterRequest = patientInfo
        if (infoAfterRequest && typeof infoAfterRequest.id === "string") {
          setLabRequestForm((prev) => ({
            ...prev,
            patientId: infoAfterRequest.id,
            roomId: currentRoomId || null,
          }))
          setShowLabRequestModal(true)
          return
        }
      } catch (error) {
        console.error("Error sending request-patient-info:", error)
      }
    }

    // If we have a room ID, try to fetch patient from API
    if (currentRoomId) {
      setLoadingPatientInfo(true)
      let attempts = 0
      const maxRetries = 2
      while (attempts <= maxRetries) {
        try {
          const response = await patientsApi.getPatientByRoomId(currentRoomId)
          if (response.success && response.data) {
            const data = response.data as PatientInfo
            setPatientInfo(data)
            setLabRequestForm((prev) => ({
              ...prev,
              patientId: data.id,
              roomId: currentRoomId || null,
            }))
            setShowLabRequestModal(true)
            setLoadingPatientInfo(false)
            return
          } else if (response.error === "PATIENT_NOT_FOUND" && attempts < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          } else {
            break
          }
        } catch (error: unknown) {
          console.error("Error fetching patient info:", error)
          if (attempts >= maxRetries) {
            break
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1200))
          }
        }
        attempts += 1
      }
      setLoadingPatientInfo(false)
    }

    // Open form anyway - user can fill it out manually or patient will be set when they join
    setLabRequestForm((prev) => ({
      ...prev,
      patientId: prev.patientId || "",
      roomId: currentRoomId || null,
    }))
    setShowLabRequestModal(true)
    if (!currentRoomId) {
      toast.info("Please start a meeting or enter patient ID manually")
    }
  }

  const handleLabRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!labRequestForm.patientId || !labRequestForm.targetId) {
      toast.error("Patient and recipient are required")
      return
    }

    const ctx = await ensureDoctorContext()
    if (!ctx?.doctorId) {
      toast.error("Doctor context not found. Please rejoin the room and try again.")
      return
    }

    setIsSubmittingLabRequest(true)
    try {
      const payload = {
        ...labRequestForm,
        roomId: labRequestForm.roomId || currentRoomId || null,
        note: labRequestForm.note || undefined,
        requestedTests: labRequestForm.requestedTests || undefined,
        instructions: labRequestForm.instructions || undefined,
        priority: labRequestForm.priority || "NORMAL",
        // Backend requires doctorId (requestor) and organizationId; use room doctor context.
        doctorId: ctx.doctorId,
        organizationId:
          ctx.organizationId ||
          (labRequestForm.targetType === "ORGANIZATION" ? labRequestForm.targetId : undefined),
      }
      const response = await labRequestsApi.createLabRequest(payload)
      if (response.success) {
        toast.success("Lab request created")
        if (dataChannel && dataChannel.readyState === "open") {
          try {
            dataChannel.send(JSON.stringify({ type: "refresh-records", roomId: currentRoomId || null }))
          } catch (err) {
            console.warn("📡 Failed to notify patient to refresh records:", err)
          }
        }
        setShowLabRequestModal(false)
        setLabRequestForm({
          patientId: "",
          targetType: "ORGANIZATION",
          targetId: "",
          note: "",
          priority: "NORMAL" as Priority,
          requestedTests: "",
          instructions: "",
          roomId: null,
        })
      } else {
        toast.error(response.message || "Failed to create lab request")
      }
    } catch (error: unknown) {
      console.error("Error creating lab request:", error)
      toast.error("An error occurred while creating lab request")
    } finally {
      setIsSubmittingLabRequest(false)
    }
  }

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
      <SidebarWrapper role="doctor" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Meet Patients"
          description="Video consultations and patient meetings"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {!isInCall ? (
                  <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                    <Card className="w-full max-w-md">
                      <CardContent className="p-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-foreground bg-muted/50">
                              <div className="relative">
                                <IconVideo className="h-14 w-14" />
                                <div className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">
                                  +
                                </div>
                                <div className="absolute bottom-0 right-0 h-2 w-2 bg-destructive rounded-sm" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-center mb-6">
                          Create Doctor Meeting
                        </h2>

                        {/* Meeting Code Input */}
                        <div className="mb-6">
                          <div className="flex gap-2">
                            <Input
                              value={meetingCode}
                              onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                              placeholder="Enter or generate code"
                              className="flex-1 text-center font-mono text-lg"
                              maxLength={6}
                              disabled={isInitializing}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyMeetingCode}
                              className="h-9 w-9"
                              disabled={!meetingCode || isInitializing}
                            >
                              <IconCopy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={generateMeetingCode}
                              className="h-9 w-9"
                              disabled={isInitializing}
                            >
                              <IconRefresh className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Start Meeting Button */}
                        <Button
                          className="w-full mb-3"
                          size="lg"
                          onClick={startMeeting}
                          disabled={!meetingCode || meetingCode.length !== 6 || isInitializing}
                        >
                          {isInitializing ? "Starting..." : "Start Meeting"}
                        </Button>

                        {/* Connection Status */}
                        <div className="flex justify-center mb-6">
                          {getConnectionStatusBadge()}
                        </div>

                        {/* Descriptive Text */}
                        <div className="space-y-2 text-center text-sm text-muted-foreground">
                          <p>
                            Generate a room ID to start a video consultation with a patient
                          </p>
                          <p>
                            Share this code with your patient to join the meeting
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Video Call Interface */}
                    <div className="relative w-full h-[calc(100vh-300px)] bg-black rounded-lg overflow-hidden">
                      {/* Remote Video (Patient) */}
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

                      {/* Local Video (Doctor) - Picture in Picture */}
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
                          title="Patient actions"
                        >
                          <IconMenu2 className="h-6 w-6" />
                          <span className="sr-only">Patient actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-56">
                          <DropdownMenuItem
                            disabled={loadingPatientInfo}
                            onSelect={(event) => {
                              event.preventDefault()
                              if (loadingPatientInfo) return
                              if (isInCall && currentRoomId) {
                                fetchPatientInfo()
                              } else {
                                toast.info("Please start a meeting first to view patient info")
                              }
                            }}
                          >
                            <IconUser className="mr-2 h-4 w-4" />
                            View patient
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openDiagnosisModal()
                            }}
                          >
                            <IconFilePlus className="mr-2 h-4 w-4" />
                            Diagnosis
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openPrescriptionModal()
                            }}
                          >
                            <IconPill className="mr-2 h-4 w-4" />
                            Prescription
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              openLabRequestModal()
                            }}
                          >
                            <IconFilePlus className="mr-2 h-4 w-4" />
                            Lab request
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

        {/* Patient Information Modal */}
        <Dialog open={showPatientInfo} onOpenChange={setShowPatientInfo}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Patient Information</DialogTitle>
              <DialogDescription>
                Complete patient profile and medical information
              </DialogDescription>
            </DialogHeader>
            {patientInfo && (
              <div className="space-y-4 py-4">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-base font-medium">
                        {patientInfo.patientInfo?.firstName || ""} {patientInfo.patientInfo?.middleName || ""} {patientInfo.patientInfo?.lastName || ""}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base font-medium">{patientInfo.email}</p>
                    </div>
                    {patientInfo.patientInfo?.gender && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Gender</label>
                        <p className="text-base font-medium">{patientInfo.patientInfo.gender}</p>
                      </div>
                    )}
                    {patientInfo.patientInfo?.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="text-base font-medium">
                          {new Date(patientInfo.patientInfo.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {patientInfo.patientInfo?.contactNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Number</label>
                        <p className="text-base font-medium">{patientInfo.patientInfo.contactNumber}</p>
                      </div>
                    )}
                    {patientInfo.patientInfo?.address && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="text-base font-medium">{patientInfo.patientInfo.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Physical Information */}
                {(patientInfo.patientInfo?.weight || patientInfo.patientInfo?.height || patientInfo.patientInfo?.bloodType) && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-2">Physical Information</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {patientInfo.patientInfo.weight && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Weight</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.weight} kg</p>
                        </div>
                      )}
                      {patientInfo.patientInfo.height && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Height</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.height} cm</p>
                        </div>
                      )}
                      {patientInfo.patientInfo.bloodType && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.bloodType}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical Information */}
                {(patientInfo.patientInfo?.medicalHistory || patientInfo.patientInfo?.allergies || patientInfo.patientInfo?.medications) && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-2">Medical Information</h3>
                    {patientInfo.patientInfo.medicalHistory && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Medical History</label>
                        <p className="text-base font-medium whitespace-pre-wrap">{patientInfo.patientInfo.medicalHistory}</p>
                      </div>
                    )}
                    {patientInfo.patientInfo.allergies && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Allergies</label>
                        <p className="text-base font-medium whitespace-pre-wrap">{patientInfo.patientInfo.allergies}</p>
                      </div>
                    )}
                    {patientInfo.patientInfo.medications && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Current Medications</label>
                        <p className="text-base font-medium whitespace-pre-wrap">{patientInfo.patientInfo.medications}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PhilHealth Information */}
                {(patientInfo.patientInfo?.philHealthId || patientInfo.patientInfo?.philHealthStatus || patientInfo.patientInfo?.philHealthCategory) && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold border-b pb-2">PhilHealth Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {patientInfo.patientInfo.philHealthId && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">PhilHealth ID</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.philHealthId}</p>
                        </div>
                      )}
                      {patientInfo.patientInfo.philHealthStatus && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.philHealthStatus}</p>
                        </div>
                      )}
                      {patientInfo.patientInfo.philHealthCategory && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Category</label>
                          <p className="text-base font-medium">{patientInfo.patientInfo.philHealthCategory}</p>
                        </div>
                      )}
                      {patientInfo.patientInfo.philHealthExpiry && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                          <p className="text-base font-medium">
                            {new Date(patientInfo.patientInfo.philHealthExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {patientInfo.patientInfo.philHealthMemberSince && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                          <p className="text-base font-medium">
                            {new Date(patientInfo.patientInfo.philHealthMemberSince).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowPatientInfo(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Prescription Modal */}
        <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Prescription</DialogTitle>
              <DialogDescription>
                Fill in the prescription details for the patient
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePrescriptionSubmit} className="space-y-4 py-4">
              {/* Patient Info Display or Input */}
              {patientInfo ? (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Patient</Label>
                  <p className="text-base font-medium">
                    {patientInfo.patientInfo?.firstName || ""} {patientInfo.patientInfo?.middleName || ""} {patientInfo.patientInfo?.lastName || ""}
                    {patientInfo.email && ` (${patientInfo.email})`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="patientId">
                    Patient ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientId"
                    value={prescriptionForm.patientId}
                    onChange={(e) =>
                      setPrescriptionForm((prev) => ({
                        ...prev,
                        patientId: e.target.value,
                      }))
                    }
                    placeholder="Enter patient ID"
                    required
                  />
                </div>
              )}

              {/* Medication Name */}
              <div className="space-y-2">
                <Label htmlFor="medicationName">
                  Medication Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="medicationName"
                  value={prescriptionForm.medicationName}
                  onChange={(e) =>
                    setPrescriptionForm((prev) => ({
                      ...prev,
                      medicationName: e.target.value,
                    }))
                  }
                  placeholder="e.g., Paracetamol 500mg"
                  required
                />
              </div>

              {/* Dosage and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">
                    Dosage <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dosage"
                    value={prescriptionForm.dosage}
                    onChange={(e) =>
                      setPrescriptionForm((prev) => ({
                        ...prev,
                        dosage: e.target.value,
                      }))
                    }
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">
                    Frequency <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={prescriptionForm.frequency}
                    onValueChange={(value) =>
                      setPrescriptionForm((prev) => ({
                        ...prev,
                        frequency: value,
                      }))
                    }
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once daily">Once Daily</SelectItem>
                      <SelectItem value="twice daily">Twice Daily</SelectItem>
                      <SelectItem value="three times daily">Three Times Daily</SelectItem>
                      <SelectItem value="four times daily">Four Times Daily</SelectItem>
                      <SelectItem value="as needed">As Needed</SelectItem>
                      <SelectItem value="every 6 hours">Every 6 Hours</SelectItem>
                      <SelectItem value="every 8 hours">Every 8 Hours</SelectItem>
                      <SelectItem value="every 12 hours">Every 12 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duration and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duration"
                    value={prescriptionForm.duration}
                    onChange={(e) =>
                      setPrescriptionForm((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    placeholder="e.g., 7 days, 2 weeks"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (optional)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={prescriptionForm.quantity || ""}
                    onChange={(e) =>
                      setPrescriptionForm((prev) => ({
                        ...prev,
                        quantity: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              {/* Refills */}
              <div className="space-y-2">
                <Label htmlFor="refills">Refills</Label>
                <Input
                  id="refills"
                  type="number"
                  min="0"
                  value={prescriptionForm.refills || 0}
                  onChange={(e) =>
                    setPrescriptionForm((prev) => ({
                      ...prev,
                      refills: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  value={prescriptionForm.instructions || ""}
                  onChange={(e) =>
                    setPrescriptionForm((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g., Take with food, Avoid alcohol"
                  rows={3}
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={prescriptionForm.expiresAt || ""}
                  onChange={(e) =>
                    setPrescriptionForm((prev) => ({
                      ...prev,
                      expiresAt: e.target.value || null,
                    }))
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Doctor&apos;s Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={prescriptionForm.notes || ""}
                  onChange={(e) =>
                    setPrescriptionForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes about this prescription"
                  rows={3}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPrescriptionModal(false)}
                  disabled={isSubmittingPrescription}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingPrescription}>
                  {isSubmittingPrescription ? "Creating..." : "Create Prescription"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diagnosis Modal */}
        <Dialog open={showDiagnosisModal} onOpenChange={setShowDiagnosisModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add Diagnosis</DialogTitle>
              <DialogDescription>
                Record a diagnosis for this patient
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDiagnosisSubmit} className="space-y-4 py-4">
              {patientInfo ? (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Patient</Label>
                  <p className="text-base font-medium">
                    {(patientInfo.patientInfo?.firstName || "")} {(patientInfo.patientInfo?.middleName || "")} {(patientInfo.patientInfo?.lastName || "")}
                    {patientInfo.email && ` (${patientInfo.email})`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="diagnosisPatientId">
                    Patient ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="diagnosisPatientId"
                    value={diagnosisForm.patientId}
                    onChange={(e) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        patientId: e.target.value,
                      }))
                    }
                    placeholder="Enter patient ID"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="diagnosisName">
                  Diagnosis Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="diagnosisName"
                  value={diagnosisForm.diagnosisName}
                  onChange={(e) =>
                    setDiagnosisForm((prev) => ({
                      ...prev,
                      diagnosisName: e.target.value,
                    }))
                  }
                  placeholder="e.g., Acute Bronchitis"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosisCode">Diagnosis Code (optional)</Label>
                  <Input
                    id="diagnosisCode"
                    value={diagnosisForm.diagnosisCode || ""}
                    onChange={(e) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        diagnosisCode: e.target.value,
                      }))
                    }
                    placeholder="e.g., J20.9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={diagnosisForm.severity}
                    onValueChange={(value) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        severity: value as CreateDiagnosisRequest["severity"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MILD">Mild</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="SEVERE">Severe</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={diagnosisForm.status}
                    onValueChange={(value) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        status: value as CreateDiagnosisRequest["status"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CHRONIC">Chronic</SelectItem>
                      <SelectItem value="SUSPECTED">Suspected</SelectItem>
                      <SelectItem value="RULED_OUT">Ruled Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isPrimary">Primary Diagnosis</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="isPrimary"
                      type="checkbox"
                      checked={!!diagnosisForm.isPrimary}
                      onChange={(e) =>
                        setDiagnosisForm((prev) => ({
                          ...prev,
                          isPrimary: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">Mark as primary</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onsetDate">Onset Date (optional)</Label>
                  <Input
                    id="onsetDate"
                    type="date"
                    value={diagnosisForm.onsetDate || ""}
                    onChange={(e) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        onsetDate: e.target.value || "",
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resolvedAt">Resolved Date (optional)</Label>
                  <Input
                    id="resolvedAt"
                    type="date"
                    value={diagnosisForm.resolvedAt || ""}
                    onChange={(e) =>
                      setDiagnosisForm((prev) => ({
                        ...prev,
                        resolvedAt: e.target.value || "",
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={diagnosisForm.description || ""}
                  onChange={(e) =>
                    setDiagnosisForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Short description of the diagnosis"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={diagnosisForm.notes || ""}
                  onChange={(e) =>
                    setDiagnosisForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDiagnosisModal(false)}
                  disabled={isSubmittingDiagnosis}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingDiagnosis}>
                  {isSubmittingDiagnosis ? "Saving..." : "Save Diagnosis"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lab Request Modal */}
        <Dialog open={showLabRequestModal} onOpenChange={setShowLabRequestModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Lab Request</DialogTitle>
              <DialogDescription>
                Send a lab request for this patient to another doctor/lab
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLabRequestSubmit} className="space-y-4 py-4">
              {patientInfo ? (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Patient</Label>
                  <p className="text-base font-medium">
                    {(patientInfo.patientInfo?.firstName || "")} {(patientInfo.patientInfo?.middleName || "")} {(patientInfo.patientInfo?.lastName || "")}
                    {patientInfo.email && ` (${patientInfo.email})`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="labRequestPatientId">
                    Patient ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="labRequestPatientId"
                    value={labRequestForm.patientId}
                    onChange={(e) =>
                      setLabRequestForm((prev) => ({
                        ...prev,
                        patientId: e.target.value,
                      }))
                    }
                    placeholder="Enter patient ID"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Send To</Label>
                <Select
                  value={labRequestForm.targetType}
                  onValueChange={(value) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      targetType: value as "ORGANIZATION" | "DOCTOR",
                      targetId: "",
                    }))
                  }
                  onOpenChange={(open) => {
                    if (open) {
                      loadTargets(labRequestForm.targetType)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recipient type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetId">
                  {labRequestForm.targetType === "ORGANIZATION" ? "Organization" : "Doctor"} ID <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={labRequestForm.targetId}
                  onValueChange={(value) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      targetId: value,
                    }))
                  }
                  onOpenChange={(open) => {
                    if (open) {
                      loadTargets(labRequestForm.targetType)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${labRequestForm.targetType === "ORGANIZATION" ? "organization" : "doctor"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(labRequestForm.targetType === "ORGANIZATION" ? organizationOptions : doctorOptions).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={labRequestForm.note}
                  onChange={(e) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Clinical note or reason for lab request"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedTests">Requested Tests (optional)</Label>
                <Textarea
                  id="requestedTests"
                  value={labRequestForm.requestedTests}
                  onChange={(e) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      requestedTests: e.target.value,
                    }))
                  }
                  placeholder="e.g., CBC, CMP, Lipid Panel"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  value={labRequestForm.instructions}
                  onChange={(e) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g., fasting required"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={labRequestForm.priority}
                  onValueChange={(value) =>
                    setLabRequestForm((prev) => ({
                      ...prev,
                      priority: value as Priority,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLabRequestModal(false)}
                  disabled={isSubmittingLabRequest}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingLabRequest}>
                  {isSubmittingLabRequest ? "Creating..." : "Create Lab Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
