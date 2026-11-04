import { Module } from "@nestjs/common"

import { FeaturePreviewModule } from "./feature-preview/feature-preview.module"
import { TodosModule } from "./todos/todos.module"

@Module({
	imports: [TodosModule, FeaturePreviewModule],
})
export class ExamplesModule {}
