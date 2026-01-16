import {
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
		
		// Set up raw Socket.IO listener for join (in case @SubscribeMessage doesn't work)
		client.on("webrtc:join", (payload: { roomId: string; role?: string }) => {
			this.handleJoinRaw(payload, client)
		})
	}
	
	// Raw handler for join (called directly from Socket.IO listener)
	private handleJoinRaw(payload: { roomId: string; role?: string }, client: Socket) {
		const { roomId, role } = payload
		console.log("🚪 [RAW] Join request received:", { roomId, role, socketId: client.id })

		const room = this.server.sockets.adapter.rooms.get(roomId)
		const currentSize = room ? room.size : 0

		let response: { ok: boolean; error?: string; participants?: number; role?: string }

		if (currentSize >= 2) {
			response = { ok: false, error: "ROOM_FULL" }
			console.log("❌ Room full:", roomId)
		} else {
			const roles = this.roomRoles.get(roomId) || {}
			if ((role === "doctor" && roles.doctorSocket) || (role === "patient" && roles.patientSocket)) {
				response = { ok: false, error: "ROLE_TAKEN" }
				console.log("❌ Role taken:", { roomId, role })
			} else {
				if (role === "doctor") {
					roles.doctorSocket = client.id
				} else if (role === "patient") {
					roles.patientSocket = client.id
				}

				this.roomRoles.set(roomId, roles)
				client.join(roomId)
				client.to(roomId).emit("webrtc:peer-joined", { socketId: client.id, role })

				response = { ok: true, participants: currentSize + 1, role: role || undefined }
				console.log("✅ Join successful:", { roomId, role, participants: response.participants })
			}
		}

		// Emit response as event
		console.log("📤 [RAW] Emitting join response:", response)
		client.emit("webrtc:join-response", response)
	}

	handleDisconnect(client: Socket) {
		console.log("🔌 Socket.IO client disconnected:", client.id)

		// Clean up room roles
		for (const [roomId, roles] of this.roomRoles.entries()) {
			if (roles.doctorSocket === client.id || roles.patientSocket === client.id) {
				this.roomRoles.delete(roomId)
			}
		}
	}

	@SubscribeMessage("webrtc:join")
	handleJoin(@MessageBody() payload: { roomId: string; role?: string }, client: Socket) {
		const { roomId, role } = payload
		console.log("🚪 Join request received:", { roomId, role, socketId: client.id })

		const room = this.server.sockets.adapter.rooms.get(roomId)
		const currentSize = room ? room.size : 0

		let response: { ok: boolean; error?: string; participants?: number; role?: string }

		if (currentSize >= 2) {
			response = { ok: false, error: "ROOM_FULL" }
			console.log("❌ Room full:", roomId)
		} else {
			const roles = this.roomRoles.get(roomId) || {}
			if ((role === "doctor" && roles.doctorSocket) || (role === "patient" && roles.patientSocket)) {
				response = { ok: false, error: "ROLE_TAKEN" }
				console.log("❌ Role taken:", { roomId, role })
			} else {
				if (role === "doctor") {
					roles.doctorSocket = client.id
				} else if (role === "patient") {
					roles.patientSocket = client.id
				}

				this.roomRoles.set(roomId, roles)
				client.join(roomId)
				client.to(roomId).emit("webrtc:peer-joined", { socketId: client.id, role })

				response = { ok: true, participants: currentSize + 1, role: role || undefined }
				console.log("✅ Join successful:", { roomId, role, participants: response.participants })
			}
		}

		// Emit response as event (NestJS return value might not work with Socket.IO callbacks)
		console.log("📤 Emitting join response:", response)
		client.emit("webrtc:join-response", response)
		
		// Also return for NestJS (though callback might not work)
		return response
	}

	@SubscribeMessage("webrtc:offer")
	handleOffer(@MessageBody() payload: { roomId: string; sdp?: any }, client: Socket) {
		if (!payload?.roomId || !payload?.sdp) return
		client.to(payload.roomId).emit("webrtc:offer", { from: client.id, sdp: payload.sdp })
	}

	@SubscribeMessage("webrtc:answer")
	handleAnswer(@MessageBody() payload: { roomId: string; sdp?: any }, client: Socket) {
		if (!payload?.roomId || !payload?.sdp) return
		client.to(payload.roomId).emit("webrtc:answer", { from: client.id, sdp: payload.sdp })
	}

	@SubscribeMessage("webrtc:ice-candidate")
	handleIceCandidate(@MessageBody() payload: { roomId: string; candidate?: any }, client: Socket) {
		if (!payload?.roomId || !payload?.candidate) return
		client.to(payload.roomId).emit("webrtc:ice-candidate", { from: client.id, candidate: payload.candidate })
	}

	@SubscribeMessage("webrtc:leave")
	handleLeave(@MessageBody() payload: { roomId: string }, client: Socket) {
		const { roomId } = payload
		if (!roomId) return

		const roles = this.roomRoles.get(roomId)
		if (roles) {
			if (roles.doctorSocket === client.id) {
				roles.doctorSocket = undefined
			}
			if (roles.patientSocket === client.id) {
				roles.patientSocket = undefined
			}
			if (!roles.doctorSocket && !roles.patientSocket) {
				this.roomRoles.delete(roomId)
			} else {
				this.roomRoles.set(roomId, roles)
			}
		}

		client.leave(roomId)
		client.to(roomId).emit("webrtc:peer-left", { socketId: client.id })
	}
}
