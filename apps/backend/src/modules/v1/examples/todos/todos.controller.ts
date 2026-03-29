import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { TodosService } from "./todos.service"

@Controller()
export class TodosController {
	constructor(private readonly todosService: TodosService) {}

	@AllowAnonymous()
	@Implement(v1.example.todo.list)
	async listTodos() {
		return implement(v1.example.todo.list).handler(async () => {
			return this.todosService.findAll()
		})
	}

	@AllowAnonymous()
	@Implement(v1.example.todo.get)
	async getTodo() {
		return implement(v1.example.todo.get).handler(async ({ input }) => {
			return this.todosService.findOne({ id: input.id })
		})
	}

	@Implement(v1.example.todo.create)
	async createTodo(
		@Session()
		session: UserSession
	) {
		return implement(v1.example.todo.create).handler(async ({ input }) => {
			return this.todosService.create({ payload: input, authorId: session.user.id })
		})
	}

	@Implement(v1.example.todo.update)
	async updateTodo() {
		return implement(v1.example.todo.update).handler(async ({ input }) => {
			return this.todosService.update({ payload: input })
		})
	}

	@Implement(v1.example.todo.delete)
	async removeTodo() {
		return implement(v1.example.todo.delete).handler(async ({ input }) => {
			return this.todosService.delete({ id: input.id })
		})
	}
}
