import { Controller, Get } from "@nestjs/common"

import { Public } from "@/shared/decorators/public.decorator"

import { WebRtcService } from "./webrtc.service"

@Controller({ path: "webrtc", version: "1" })
export class WebRtcController {
	constructor(private readonly webrtcService: WebRtcService) {}

	@Public()
	@Get("test")
	async test() {
		return { success: true, message: "WebRTC endpoint working" }
	}
}
