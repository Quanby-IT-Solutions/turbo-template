import { Module } from "@nestjs/common"

import { FeaturePreviewController } from "./feature-preview.controller"

@Module({
	controllers: [FeaturePreviewController],
})
export class FeaturePreviewModule {}
