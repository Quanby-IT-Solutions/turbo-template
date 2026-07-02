import { Module } from "@nestjs/common"

import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"

import { TodosController } from "./todos.controller"
import { TodosService } from "./todos.service"

@Module({
	controllers: [TodosController],
	providers: [TodosService, IdempotencyInterceptor],
})
export class TodosModule {}
