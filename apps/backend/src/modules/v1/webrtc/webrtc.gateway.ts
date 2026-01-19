import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"

@WebSocketGateway({
	cors: {
		origin: "*",
		credentials: true,
	},
})
export class WebRtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server

	private roomRoles = new Map<string, { doctorSocket?: string; patientSocket?: string }>()

	handleConnection(client: Socket) {
		console.log("🔌 Socket.IO client connected:", client.id)
	}

	handleDisconnect(client: Socket) {
		console.log("🔌 Socket.IO client disconnected:", client.id)

		// Clean up room roles (only clear the disconnected socket)
		for (const [roomId, roles] of this.roomRoles.entries()) {
			let changed = false
			if (roles.doctorSocket === client.id) {
				roles.doctorSocket = undefined
				changed = true
			}
			if (roles.patientSocket === client.id) {
				roles.patientSocket = undefined
				changed = true
			}
			if (changed) {
				if (!roles.doctorSocket && !roles.patientSocket) {
					this.roomRoles.delete(roomId)
				} else {
					this.roomRoles.set(roomId, roles)
				}
			}
		}
	}

	@SubscribeMessage("webrtc:join")
	handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; role?: string }) {
		const { roomId, role } = payload
		// Normalize roomId: uppercase, trim, alphanumeric only (for consistency)
		const normalizedRoomId = roomId.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
		console.log("🚪 Join request received:", { roomId, normalizedRoomId, role, socketId: client.id })

		const room = this.server.sockets.adapter.rooms.get(normalizedRoomId)
		const currentSize = room ? room.size : 0
		const roles = this.roomRoles.get(normalizedRoomId) || {}

		let response: { ok: boolean; error?: string; participants?: number; role?: string }

		// SECURITY: Patients can only join if a doctor is already in the room
		if (role === "patient" && !roles.doctorSocket) {
			response = { ok: false, error: "DOCTOR_NOT_IN_ROOM" }
			console.log("❌ Patient cannot join - no doctor in room:", normalizedRoomId)
			client.emit("webrtc:join-response", response)
			return response
		}

		if (currentSize >= 2) {
			response = { ok: false, error: "ROOM_FULL" }
			console.log("❌ Room full:", normalizedRoomId)
		} else if ((role === "doctor" && roles.doctorSocket) || (role === "patient" && roles.patientSocket)) {
			response = { ok: false, error: "ROLE_TAKEN" }
			console.log("❌ Role taken:", { roomId: normalizedRoomId, role })
		} else {
			// Update roles BEFORE joining to ensure state is correct
			if (role === "doctor") {
				roles.doctorSocket = client.id
			} else if (role === "patient") {
				roles.patientSocket = client.id
			}

			this.roomRoles.set(normalizedRoomId, roles)
			
			// Join the room first
			client.join(normalizedRoomId)

			// Trigger signaling ONLY for the already-present peer (avoid offer-collision).
			// With our security rule, doctor is always first, patient is second.
			setTimeout(() => {
				const updatedRoom = this.server.sockets.adapter.rooms.get(normalizedRoomId)
				const updatedSize = updatedRoom ? updatedRoom.size : 0
				console.log("👥 Room state after join:", { roomId: normalizedRoomId, size: updatedSize, roles })

				// Notify the other participant (NOT the joiner) that a peer joined.
				// This is what triggers offer/answer flow on the doctor side.
				if (updatedSize >= 2) {
					console.log("📤 Emitting webrtc:peer-joined to existing participant in room:", normalizedRoomId)
					client.to(normalizedRoomId).emit("webrtc:peer-joined", { socketId: client.id, role })
				}
			}, 0)

			response = { ok: true, participants: currentSize + 1, role: role || undefined }
			console.log("✅ Join successful:", { roomId: normalizedRoomId, role, participants: response.participants })
		}

		// Emit response as event (NestJS return value might not work with Socket.IO callbacks)
		console.log("📤 Emitting join response:", response)
		client.emit("webrtc:join-response", response)
		
		// Also return for NestJS (though callback might not work)
		return response
	}

	@SubscribeMessage("webrtc:offer")
	handleOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; sdp?: any }) {
		if (!payload?.roomId || !payload?.sdp) return
		const normalizedRoomId = payload.roomId.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
		client.to(normalizedRoomId).emit("webrtc:offer", { from: client.id, sdp: payload.sdp })
	}

	@SubscribeMessage("webrtc:answer")
	handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; sdp?: any }) {
		if (!payload?.roomId || !payload?.sdp) return
		const normalizedRoomId = payload.roomId.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
		client.to(normalizedRoomId).emit("webrtc:answer", { from: client.id, sdp: payload.sdp })
	}

	@SubscribeMessage("webrtc:ice-candidate")
	handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; candidate?: any }) {
		if (!payload?.roomId || !payload?.candidate) return
		const normalizedRoomId = payload.roomId.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")
		client.to(normalizedRoomId).emit("webrtc:ice-candidate", { from: client.id, candidate: payload.candidate })
	}

	@SubscribeMessage("webrtc:leave")
	handleLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string }) {
		const { roomId } = payload
		if (!roomId) return
		const normalizedRoomId = roomId.toUpperCase().trim().replace(/[^A-Z0-9]/g, "")

		const roles = this.roomRoles.get(normalizedRoomId)
		if (roles) {
			if (roles.doctorSocket === client.id) {
				roles.doctorSocket = undefined
			}
			if (roles.patientSocket === client.id) {
				roles.patientSocket = undefined
			}
			if (!roles.doctorSocket && !roles.patientSocket) {
				this.roomRoles.delete(normalizedRoomId)
			} else {
				this.roomRoles.set(normalizedRoomId, roles)
			}
		}

		client.leave(normalizedRoomId)
		client.to(normalizedRoomId).emit("webrtc:peer-left", { socketId: client.id })
	}
}
