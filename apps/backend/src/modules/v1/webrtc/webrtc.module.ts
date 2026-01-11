import { Module } from "@nestjs/common"

import { WebRtcController } from "./webrtc.controller"
import { WebRtcGateway } from "./webrtc.gateway"
import { WebRtcService } from "./webrtc.service"

@Module({
	controllers: [WebRtcController],
	providers: [WebRtcService, WebRtcGateway],
	exports: [WebRtcService, WebRtcGateway],
})
export class WebRtcModule {}
