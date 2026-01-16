"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { getSessionToken } from "@/services/api/client"
import type { User } from "@/services/api/types"

export interface JoinResponse {
  ok: boolean
  error?: string
  participants?: number
  role?: "doctor" | "patient"
}

export interface FaceScanData {
  type: "face-scan-results"
  results: unknown
  status: string
}

export interface FaceScanStatus {
  type: "face-scan-status"
  status: string
  timestamp: number
  prescriptionData?: unknown
  diagnosisData?: unknown
  labRequestData?: unknown
  appointmentData?: unknown
}

export interface FaceScanRequest {
  type: "face-scan-request"
  roomId: string
  timestamp: number
}

export interface PatientInfoMessage {
  type: "patient-info"
  user: User
  timestamp: number
}

export interface RefreshRecordsMessage {
  type: "refresh-records"
  consultationId?: string | null
  roomId?: string | null
}

type DataChannelMessage =
  | FaceScanData
  | FaceScanStatus
  | FaceScanRequest
  | PatientInfoMessage
  | RefreshRecordsMessage

// Get ICE servers from backend (Twilio TURN) or fallback to defaults
const getIceServers = async (): Promise<RTCIceServer[]> => {
  // Try to fetch from backend API first (Twilio TURN tokens)
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
    const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${apiBaseUrl}/v1/webrtc/turn-token`, {
      method: 'GET',
      headers,
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data?.iceServers) {
        console.log('✅ Using Twilio TURN servers from backend')
        return data.data.iceServers as RTCIceServer[]
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch TURN token from backend, using fallback:', error)
  }

  // Fallback: Check environment variable
  const envIceServers = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS
  if (envIceServers) {
    try {
      return JSON.parse(envIceServers) as RTCIceServer[]
    } catch {
      // Continue to default fallback
    }
  }

  // Default STUN servers (fallback)
  console.log('⚠️ Using default STUN servers (no TURN)')
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.stunprotocol.org:3478" },
  ]
}

const getSignalingUrl = (): string => {
  // Use explicit WebRTC signaling URL if set, otherwise derive from API URL
  if (process.env.NEXT_PUBLIC_WEBRTC_SIGNALING_URL) {
    return process.env.NEXT_PUBLIC_WEBRTC_SIGNALING_URL
  }
  // Use the same base URL as the API (backend runs on port 3000)
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
  // Remove /api suffix to get the base URL for Socket.IO
  return apiBaseUrl.replace("/api", "")
}

export function useWebRTC() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [peer, setPeer] = useState<RTCPeerConnection | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<"doctor" | "patient" | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")
  const [isConnected, setIsConnected] = useState(false)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [dataChannelMessage, setDataChannelMessage] = useState<DataChannelMessage | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const currentRoomIdRef = useRef<string | null>(null)

  // Cleanup peer connection
  const cleanupPeer = useCallback((closeSocketRoom: boolean) => {
    // Close data channels gracefully
    if (dataChannelRef.current) {
      try {
        if (dataChannelRef.current.readyState === "open" || dataChannelRef.current.readyState === "connecting") {
          dataChannelRef.current.close()
          console.log("📡 Data channel closed during cleanup")
        }
      } catch (error) {
        // Ignore errors when closing data channel
        console.log("📡 Data channel close error (expected):", error)
      }
      dataChannelRef.current = null
      setDataChannel(null)
    }

    peerRef.current?.getSenders().forEach((s) => {
      try {
        s.track?.stop()
      } catch {
        // Ignore errors
      }
    })
    
    try {
      peerRef.current?.close()
    } catch (error) {
      console.log("📡 Peer close error (expected):", error)
    }
    
    peerRef.current = null
    setPeer(null)

    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)

    remoteStreamRef.current = null
    setRemoteStream(null)

    if (closeSocketRoom) {
      setCurrentRoomId(null)
      currentRoomIdRef.current = null
      setCurrentRole(null)
    }
  }, [])

  // Restart ICE connection
  const restartIce = useCallback(async () => {
    try {
      if (!peerRef.current || !currentRoomId) return
      console.log("🧊 Starting ICE restart...")
      const offer = await peerRef.current.createOffer({ iceRestart: true })
      await peerRef.current.setLocalDescription(offer)
      socketRef.current?.emit("webrtc:offer", { roomId: currentRoomId, sdp: offer })
      console.log("🧊 ICE restart offer sent.")
    } catch (e) {
      console.error("❌ Manual ICE restart failed:", e)
    }
  }, [currentRoomId])

  // Create and send offer
  const createAndSendOffer = useCallback(async () => {
    const roomId = currentRoomIdRef.current || currentRoomId
    if (!peerRef.current || !roomId) {
      console.error("❌ Cannot create offer: peer or roomId missing", {
        hasPeer: !!peerRef.current,
        currentRoomId,
        currentRoomIdRef: currentRoomIdRef.current,
      })
      return
    }

    if (
      peerRef.current.signalingState === "have-local-offer" ||
      peerRef.current.signalingState === "have-remote-offer"
    ) {
      console.log("🧩 Signaling state:", peerRef.current.signalingState, "- skipping offer creation")
      return
    }

    try {
      console.log("🧩 Creating offer, current signaling state:", peerRef.current.signalingState)
      console.log("📊 Peer state before offer:", {
        signalingState: peerRef.current.signalingState,
        connectionState: peerRef.current.connectionState,
        iceConnectionState: peerRef.current.iceConnectionState,
        senders: peerRef.current.getSenders().length,
        receivers: peerRef.current.getReceivers().length,
      })
      
      const offer = await peerRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false,
      })
      console.log("🧩 Offer created:", offer.type)
      console.log("🧩 Offer SDP preview:", offer.sdp?.substring(0, 200))

      await peerRef.current.setLocalDescription(offer)
      console.log("🧩 Local description set")
      console.log("📊 Peer state after setting local description:", {
        signalingState: peerRef.current.signalingState,
        connectionState: peerRef.current.connectionState,
      })

      console.log("📤 Emitting offer to room:", roomId)
      socketRef.current?.emit("webrtc:offer", { roomId, sdp: offer }, (ack?: unknown) => {
        console.log("📤 Offer emit acknowledgment:", ack)
      })
      console.log("✅ Offer sent successfully")
    } catch (error) {
      console.error("❌ Error creating/sending offer:", error)
      console.error("❌ Error details:", {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      })
    }
  }, [currentRoomId])

  // Initialize RTCPeerConnection
  const initPeer = useCallback(async () => {
    if (peerRef.current) {
      console.log("✅ Peer connection already initialized")
      return
    }

    const iceServers = await getIceServers()
    console.log("🧊 Using ICE servers:", iceServers)

    const config: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceTransportPolicy: "all",
    }

    const newPeer = new RTCPeerConnection(config)

    // Create data channel for face scan communication
    try {
      const channel = newPeer.createDataChannel("face-scan-channel", {
        ordered: true,
      })

      channel.onopen = () => {
        console.log("📡 Data channel opened for face scan communication")
      }

      channel.onclose = () => {
        console.log("📡 Data channel closed")
      }

      channel.onerror = (error) => {
        // Check if peer is still connected before logging as error
        if (peerRef.current?.connectionState === "connected" || peerRef.current?.connectionState === "connecting") {
          console.warn("📡 Data channel error (peer may be disconnecting):", error)
        } else {
          console.log("📡 Data channel error (expected - peer disconnected)")
        }
      }

      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as FaceScanData | FaceScanStatus | FaceScanRequest | PatientInfoMessage
          console.log("📡 Data channel message received:", data)
          setDataChannelMessage(data)
        } catch (error) {
          console.error("📡 Error parsing data channel message:", error)
        }
      }

      dataChannelRef.current = channel
      setDataChannel(channel)
    } catch (error) {
      console.error("📡 Error creating data channel:", error)
    }

    newPeer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 ICE candidate generated:", {
          candidate: event.candidate.candidate?.substring(0, 100),
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        })
        const roomId = currentRoomIdRef.current || currentRoomId
        if (roomId) {
          socketRef.current?.emit("webrtc:ice-candidate", {
            roomId,
            candidate: event.candidate,
          })
          console.log("🧊 ICE candidate sent to room:", roomId)
        } else {
          console.warn("⚠️ ICE candidate generated but no roomId")
        }
      } else {
        console.log("🧊 ICE candidate gathering complete (null candidate)")
      }
    }

    // Create a single remote stream that accumulates all tracks
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream()
    }
    
    newPeer.ontrack = (event) => {
      console.log("🎥 Track received:", event.track.kind, event.streams)
      console.log("🎥 Track details:", {
        id: event.track.id,
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams.length,
      })
      
      // Get or create remote stream
      let stream = remoteStreamRef.current
      
      if (!stream) {
        console.log("📹 Creating new remote stream")
        stream = new MediaStream()
        remoteStreamRef.current = stream
      }
      
      // Add track to stream if not already present
      const existingTrack = stream.getTracks().find(t => t.id === event.track.id)
      if (!existingTrack) {
        stream.addTrack(event.track)
        console.log(`✅ Added ${event.track.kind} track to remote stream`)
        console.log("📹 Remote stream now has", stream.getTracks().length, "tracks")
        
        // Update state to trigger re-render
        setRemoteStream(new MediaStream(stream.getTracks()))
      } else {
        console.log(`⚠️ Track ${event.track.id} already in stream`)
      }
      
      // Also handle case where event has streams
      if (event.streams && event.streams.length > 0) {
        const eventStream = event.streams[0]
        eventStream.getTracks().forEach((track) => {
          const existing = stream!.getTracks().find(t => t.id === track.id)
          if (!existing) {
            stream!.addTrack(track)
            console.log(`✅ Added ${track.kind} track from event stream`)
          }
        })
        // Update state
        setRemoteStream(new MediaStream(stream.getTracks()))
      }
    }

    newPeer.onconnectionstatechange = () => {
      const state = newPeer.connectionState
      setConnectionState(state)
      console.log("🔗 Peer connection state changed:", state)

      if (state === "failed") {
        console.warn("⚠️ Connection failed, attempting recovery...")
        restartIce()
      } else if (state === "disconnected") {
        setTimeout(() => {
          if (newPeer.connectionState === "disconnected") {
            console.warn("⚠️ Still disconnected, attempting recovery...")
            restartIce()
          }
        }, 5000)
      }
    }

    newPeer.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state changed:", newPeer.iceConnectionState)
      if (newPeer.iceConnectionState === "failed") {
        console.warn("⚠️ ICE connection failed, attempting ICE restart...")
        restartIce()
      }
    }

    newPeer.ondatachannel = (event) => {
      console.log("📡 Data channel received:", event.channel.label)
      const channel = event.channel
      channel.onopen = () => {
        console.log("📡 Remote data channel opened")
      }
      channel.onclose = () => {
        console.log("📡 Remote data channel closed")
      }
      channel.onerror = (error) => {
        // Check if peer is still connected before logging as error
        if (peerRef.current?.connectionState === "connected" || peerRef.current?.connectionState === "connecting") {
          console.warn("📡 Remote data channel error (peer may be disconnecting):", error)
        } else {
          console.log("📡 Remote data channel error (expected - peer disconnected)")
        }
      }
      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as FaceScanData | FaceScanStatus | FaceScanRequest | PatientInfoMessage
          console.log("📡 Remote data channel message received:", data)
          setDataChannelMessage(data)
        } catch (error) {
          console.error("📡 Error parsing remote data channel message:", error)
        }
      }
    }

    peerRef.current = newPeer
    setPeer(newPeer)
  }, [currentRoomId, restartIce])

  // Initialize Socket.IO connection
  const initSocket = useCallback(() => {
    // If socket exists but is disconnected, disconnect it first to allow reconnection
    if (socketRef.current && !socketRef.current.connected) {
      console.log("🔌 Disconnecting existing socket to allow reconnection")
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    if (socketRef.current?.connected) {
      console.log("✅ Socket.IO already connected")
      return
    }

    const url = getSignalingUrl()
    const token = getSessionToken()

    console.log("🔌 Connecting to Socket.IO server:", url)

    const newSocket = io(url, {
      transports: ["websocket"],
      withCredentials: true,
      auth: token ? { token: token.startsWith("Bearer ") ? token.split(" ")[1] : token } : undefined,
    })

    newSocket.on("connect", () => {
      console.log("✅ Socket.IO connected successfully")
      setIsConnected(true)
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error)
      setIsConnected(false)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", reason)
      setIsConnected(false)
    })

    // Global listener for join response (for debugging - individual join() calls set up their own listeners)
    newSocket.on("webrtc:join-response", (response: JoinResponse) => {
      console.log("📨 [GLOBAL] Join response received via event:", response)
    })

    // Register WebRTC event handlers
    newSocket.on("webrtc:peer-joined", async (data: { socketId: string; role: string }) => {
      console.log("👥 Peer joined:", data)
      console.log("👥 Current local stream:", localStreamRef.current ? "exists" : "missing")
      console.log("👥 Current peer connection:", peerRef.current ? "exists" : "missing")
      
      if (!peerRef.current) {
        console.log("🔧 Initializing peer connection...")
        await initPeer()
      }
      
      // Ensure local stream is added to peer connection
      if (localStreamRef.current && peerRef.current) {
        console.log("📹 Adding local stream tracks to peer connection...")
        const existingSenders = peerRef.current.getSenders()
        const existingTrackIds = new Set(existingSenders.map(s => s.track?.id).filter(Boolean))
        
        localStreamRef.current.getTracks().forEach((track) => {
          if (!existingTrackIds.has(track.id)) {
            console.log(`➕ Adding ${track.kind} track:`, track.id)
            peerRef.current?.addTrack(track, localStreamRef.current!)
          } else {
            console.log(`⏭️ Skipping ${track.kind} track (already added):`, track.id)
          }
        })
        console.log("✅ Local stream tracks added. Total senders:", peerRef.current.getSenders().length)
      } else {
        console.warn("⚠️ Local stream or peer connection not ready")
      }
      
      // Wait a bit for the peer to be ready, then create and send offer
      setTimeout(async () => {
        console.log("📤 Creating and sending offer...")
        console.log("📊 Peer state before offer:", {
          signalingState: peerRef.current?.signalingState,
          connectionState: peerRef.current?.connectionState,
          iceConnectionState: peerRef.current?.iceConnectionState,
          senders: peerRef.current?.getSenders().length || 0,
        })
        try {
          await createAndSendOffer()
          console.log("✅ Offer sent successfully")
        } catch (error) {
          console.error("❌ Error creating/sending offer:", error)
        }
      }, 1000)
    })

    newSocket.on("webrtc:offer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.log("📥 Received offer:", sdp)
      console.log("📥 Offer type:", sdp.type)
      
      if (!peerRef.current) {
        console.log("🔧 Initializing peer connection for offer...")
        await initPeer()
      }
      
      // Ensure local stream is added before creating answer
      if (localStreamRef.current && peerRef.current) {
        console.log("📹 Adding local stream tracks before creating answer...")
        const existingSenders = peerRef.current.getSenders()
        const existingTrackIds = new Set(existingSenders.map(s => s.track?.id).filter(Boolean))
        
        localStreamRef.current.getTracks().forEach((track) => {
          if (!existingTrackIds.has(track.id)) {
            console.log(`➕ Adding ${track.kind} track:`, track.id)
            peerRef.current?.addTrack(track, localStreamRef.current!)
          }
        })
        console.log("✅ Local stream tracks added. Total senders:", peerRef.current.getSenders().length)
      }
      
      try {
        console.log("🧩 Setting remote description, current signaling state:", peerRef.current!.signalingState)
        await peerRef.current!.setRemoteDescription(new RTCSessionDescription(sdp))
        console.log("✅ Remote description set successfully")
        console.log("📊 Peer state after setting remote description:", {
          signalingState: peerRef.current!.signalingState,
          connectionState: peerRef.current!.connectionState,
        })
        
        const answer = await peerRef.current!.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        console.log("📝 Answer created:", answer.type)
        console.log("📝 Answer SDP preview:", answer.sdp?.substring(0, 200))
        
        await peerRef.current!.setLocalDescription(answer)
        console.log("✅ Local description set successfully")
        console.log("📊 Peer state after setting local description:", {
          signalingState: peerRef.current!.signalingState,
          connectionState: peerRef.current!.connectionState,
        })
        
        const roomId = currentRoomIdRef.current || currentRoomId
        console.log("📤 Sending answer to room:", roomId)
        if (roomId) {
          newSocket.emit("webrtc:answer", { roomId, sdp: answer }, (ack?: unknown) => {
            console.log("📤 Answer emit acknowledgment:", ack)
          })
          console.log("✅ Answer sent successfully")
        } else {
          console.error("❌ No currentRoomId, cannot send answer")
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error)
        console.error("❌ Error details:", {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
        })
      }
    })

    newSocket.on("webrtc:answer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.log("📥 Received answer:", sdp)
      console.log("📥 Answer details:", {
        type: sdp.type,
        sdp: sdp.sdp?.substring(0, 100) + "...",
      })
      if (!peerRef.current) {
        console.error("❌ No peer connection when receiving answer")
        return
      }
      try {
        console.log("🧩 Setting remote description (answer), current signaling state:", peerRef.current.signalingState)
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        console.log("✅ Remote description (answer) set successfully")
        console.log("🧩 New signaling state:", peerRef.current.signalingState)
        console.log("🧊 ICE connection state:", peerRef.current.iceConnectionState)
        console.log("🔗 Connection state:", peerRef.current.connectionState)
        console.log("📊 Receivers count:", peerRef.current.getReceivers().length)
        console.log("📊 Transceivers count:", peerRef.current.getTransceivers().length)
        console.log("🔗 Connection should now be established")
      } catch (error) {
        console.error("❌ Error handling answer:", error)
      }
    })

    newSocket.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      console.log("🧊 Received ICE candidate:", {
        candidate: candidate.candidate?.substring(0, 100),
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
      })
      if (!peerRef.current) {
        console.warn("⚠️ Received ICE candidate but no peer connection")
        return
      }
      if (!candidate) {
        console.warn("⚠️ Received null ICE candidate")
        return
      }
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log("✅ ICE candidate added successfully")
        console.log("📊 ICE connection state after adding candidate:", peerRef.current.iceConnectionState)
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error)
        console.error("❌ Error details:", {
          name: (error as Error).name,
          message: (error as Error).message,
        })
      }
    })

    newSocket.on("webrtc:peer-left", () => {
      console.log("👋 Peer left, cleaning up...")
      
      // Close data channels gracefully before cleanup
      if (dataChannelRef.current) {
        try {
          if (dataChannelRef.current.readyState === "open") {
            dataChannelRef.current.close()
            console.log("📡 Local data channel closed gracefully")
          }
        } catch (error) {
          console.log("📡 Error closing data channel (expected):", error)
        }
        dataChannelRef.current = null
        setDataChannel(null)
      }
      
      // Clear remote stream but keep peer connection for potential reconnection
      remoteStreamRef.current = null
      setRemoteStream(null)
      
      console.log("✅ Peer left cleanup completed")
    })

    socketRef.current = newSocket
    setSocket(newSocket)
  }, [initPeer, createAndSendOffer, cleanupPeer, currentRoomId])

  // Get user media (camera and microphone)
  const getUserMedia = useCallback(
    async (constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1,
      },
      video: {
        width: { ideal: 1280, min: 640, max: 1920 },
        height: { ideal: 720, min: 480, max: 1080 },
        frameRate: { ideal: 30, min: 15, max: 60 },
        facingMode: "user",
      },
    }): Promise<MediaStream> => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("📹 getUserMedia stream obtained:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      })
      
      // Log track details
      stream.getTracks().forEach((track) => {
        console.log(`📹 ${track.kind} track:`, {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
        })
        peerRef.current?.addTrack(track, stream)
      })
      
      localStreamRef.current = stream
      setLocalStream(stream)
      console.log("✅ Local stream set in state and ref")
      return stream
    },
    []
  )

  // Wait for socket to be connected (with timeout)
  const waitForSocketConnection = useCallback(
    (timeoutMs: number = 10000): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already connected
        if (socketRef.current?.connected) {
          console.log("✅ Socket already connected")
          resolve()
          return
        }

        // If socket doesn't exist, initialize it
        if (!socketRef.current) {
          console.log("🔌 Socket not initialized, initializing...")
          initSocket()
        }

        const startTime = Date.now()
        let checkInterval: NodeJS.Timeout | null = null
        let connectHandler: (() => void) | null = null

        // Cleanup function
        const cleanup = () => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          if (connectHandler && socketRef.current) {
            socketRef.current.off("connect", connectHandler)
            connectHandler = null
          }
        }

        // Polling check
        checkInterval = setInterval(() => {
          if (socketRef.current?.connected) {
            cleanup()
            resolve()
          } else if (Date.now() - startTime > timeoutMs) {
            cleanup()
            reject(new Error("Socket connection timeout"))
          }
        }, 100)

        // Also listen for connect event (more reliable)
        connectHandler = () => {
          cleanup()
          resolve()
        }

        if (socketRef.current) {
          socketRef.current.once("connect", connectHandler)
        }
      })
    },
    [initSocket]
  )

  // Join a room
  const join = useCallback(
    async (roomId: string, role: "doctor" | "patient" = "doctor"): Promise<JoinResponse> => {
      setCurrentRoomId(roomId)
      currentRoomIdRef.current = roomId // Update ref immediately
      console.log("🚪 Attempting to join room:", roomId, "as", role)
      console.log("🔌 Socket connected:", socketRef.current?.connected)

      // Wait for socket connection if not already connected
      if (!socketRef.current?.connected) {
        console.log("⏳ Waiting for socket connection...")
        try {
          await waitForSocketConnection()
          console.log("✅ Socket connected, proceeding with join")
        } catch (error) {
          console.error("❌ Failed to connect socket:", error)
          throw new Error("Socket connection timeout. Please try again.")
        }
      }

      // Double-check socket is connected
      if (!socketRef.current?.connected) {
        throw new Error("Socket not connected after waiting")
      }

      return new Promise((resolve, reject) => {

        let resolved = false
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          if (!resolved) {
            console.error("❌ Join room timeout after 10 seconds")
            resolved = true
            reject(new Error("Join room timeout"))
          }
        }, 10000)

        // Listen for join response event (primary method since NestJS doesn't support callbacks well)
        const responseHandler = (resp: JoinResponse) => {
          if (!resolved) {
            clearTimeout(timeout)
            resolved = true
            console.log("📨 [JOIN FUNCTION] Join response received via event:", resp)
            if (resp?.ok && resp.role) {
              setCurrentRole(resp.role)
            }
            console.log("✅ Joined room successfully:", {
              roomId,
              role: resp.role,
              participants: resp.participants,
            })
            // Remove listener to prevent memory leaks
            if (socketRef.current) {
              socketRef.current.off("webrtc:join-response", responseHandler)
            }
            resolve(resp)
          }
        }
        
        // Set up listener BEFORE emitting (use 'on' instead of 'once' to ensure it's set up)
        if (socketRef.current) {
          socketRef.current.on("webrtc:join-response", responseHandler)
        }
        
        // Emit join request with the specified role
        console.log("📤 Emitting join request:", { roomId, role })
        if (socketRef.current) {
          socketRef.current.emit("webrtc:join", { roomId, role })
        } else {
          clearTimeout(timeout)
          reject(new Error("Socket reference lost"))
        }
      })
    },
    [waitForSocketConnection]
  )

  // Leave room
  const leave = useCallback(async () => {
    const roomId = currentRoomIdRef.current || currentRoomId
    if (roomId) {
      socketRef.current?.emit("webrtc:leave", { roomId })
    }
    cleanupPeer(true)
  }, [currentRoomId, cleanupPeer])

  // Send face scan results via data channel
  const sendFaceScanResults = useCallback((results: unknown, status: string) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      const data: FaceScanData = {
        type: "face-scan-results",
        results,
        status,
      }
      try {
        dataChannelRef.current.send(JSON.stringify(data))
        console.log("📡 Face scan results sent via data channel:", data)
      } catch (error) {
        console.error("📡 Error sending face scan results:", error)
      }
    } else {
      console.warn("📡 Data channel not ready for sending face scan results")
    }
  }, [])

  // Send face scan request to patient via data channel
  const sendFaceScanRequest = useCallback((request: FaceScanRequest) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify(request))
        console.log("📡 Face scan request sent via data channel:", request)
      } catch (error) {
        console.error("📡 Error sending face scan request:", error)
      }
    } else {
      console.warn("📡 Data channel not ready for sending face scan request")
    }
  }, [])

  // Send face scan status update via data channel
  const sendFaceScanStatus = useCallback((status: FaceScanStatus) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify(status))
        console.log("📡 Face scan status sent via data channel:", status)
      } catch (error) {
        console.error("📡 Error sending face scan status:", error)
      }
    } else {
      console.warn("📡 Data channel not ready for sending face scan status")
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPeer(true)
      socketRef.current?.disconnect()
    }
  }, [cleanupPeer])

  return {
    // State
    socket,
    peer,
    localStream,
    remoteStream,
    currentRoomId,
    currentRole,
    connectionState,
    isConnected,
    dataChannel,
    dataChannelMessage,

    // Methods
    initSocket,
    initPeer,
    getUserMedia,
    join,
    leave,
    sendFaceScanResults,
    sendFaceScanRequest,
    sendFaceScanStatus,
    restartIce,
    createAndSendOffer,
  }
}
