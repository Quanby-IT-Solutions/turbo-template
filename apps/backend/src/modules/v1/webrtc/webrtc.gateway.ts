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

		const room = this.server.sockets.adapter.rooms.get(roomId)
		const currentSize = room ? room.size : 0

		if (currentSize >= 2) {
			return { ok: false, error: "ROOM_FULL" }
		}

		const roles = this.roomRoles.get(roomId) || {}
		if ((role === "doctor" && roles.doctorSocket) || (role === "patient" && roles.patientSocket)) {
			return { ok: false, error: "ROLE_TAKEN" }
		}

		if (role === "doctor") {
			roles.doctorSocket = client.id
		} else if (role === "patient") {
			roles.patientSocket = client.id
		}

		this.roomRoles.set(roomId, roles)
		client.join(roomId)
		client.to(roomId).emit("webrtc:peer-joined", { socketId: client.id, role })

		return { ok: true, participants: currentSize + 1, role }
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
