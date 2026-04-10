import { Test, type TestingModule } from "@nestjs/testing"

import type { V1Outputs } from "@/config/contract-types"

import { TodosController } from "./todos.controller"
import { TodosService } from "./todos.service"

type Todo = V1Outputs["example"]["todo"]["get"]

jest.mock("@repo/db/schema", () => ({
	todos: {
		id: "id",
		title: "title",
		completed: "completed",
		authorId: "authorId",
		createdAt: "createdAt",
		updatedAt: "updatedAt",
	},
}))

jest.mock("@orpc/nest", () => ({
	Implement: () => () => undefined,
}))

jest.mock("@orpc/server", () => ({
	implement: jest.fn(() => ({
		handler: jest.fn((fn: unknown) => fn),
	})),
}))

jest.mock("@/config/api-versions.config", () => ({
	v1: {
		example: {
			todo: { list: {}, get: {}, create: {}, update: {}, delete: {} },
		},
	},
}))

jest.mock("@thallesp/nestjs-better-auth", () => ({
	AllowAnonymous: () => () => undefined,
	Session: () => () => ({ user: { id: "template-user-id" } }),
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
}))

const USER_ID = "template-user-id"
const now = new Date()

describe("TodosController (v1)", () => {
	let app: TestingModule
	let controller: TodosController
	let service: TodosService
	let mockDb: {
		select: jest.Mock
		insert: jest.Mock
		update: jest.Mock
		delete: jest.Mock
	}

	// Factory functions for test data
	const createMockTodo = (overrides?: Partial<Todo>): Todo => ({
		id: 1,
		title: "Test todo",
		completed: false,
		authorId: USER_ID,
		createdAt: now,
		updatedAt: now,
		...overrides,
	})

	// Helper to set up select mock
	const setupSelectMock = (returnData: Todo | Todo[]) => {
		const data = Array.isArray(returnData) ? returnData : [returnData]
		mockDb.select.mockReturnValueOnce({
			from: jest.fn(() => ({
				where: jest.fn(() => Promise.resolve(data)),
				orderBy: jest.fn(() => Promise.resolve(data)),
				then: (resolve: (value: Todo[]) => void) => resolve(data),
			})),
		})
	}

	// Helper to set up insert mock
	const setupInsertMock = (returnData: Todo) => {
		mockDb.insert.mockReturnValueOnce({
			values: jest.fn(() => ({
				returning: jest.fn(async () => [returnData]),
			})),
		})
	}

	// Helper to set up update mock
	const setupUpdateMock = (returnData: Todo) => {
		mockDb.update.mockReturnValueOnce({
			set: jest.fn(() => ({
				where: jest.fn(() => ({
					returning: jest.fn(async () => [returnData]),
				})),
			})),
		})
	}

	// Helper to set up delete mock
	const setupDeleteMock = () => {
		mockDb.delete.mockReturnValueOnce({
			where: jest.fn(() => Promise.resolve(undefined)),
		})
	}

	beforeEach(async () => {
		const dbMock = require("@/common/database/database.client")
		mockDb = dbMock.db

		app = await Test.createTestingModule({
			controllers: [TodosController],
			providers: [TodosService],
		}).compile()

		controller = app.get<TodosController>(TodosController)
		service = app.get<TodosService>(TodosService)
	})

	it("should be defined", () => {
		expect(controller).toBeDefined()
	})

	it("service findAll returns todos", async () => {
		const mockTodos = [
			createMockTodo({ id: 1, title: "First todo example" }),
			createMockTodo({ id: 2, title: "Second todo example", completed: true }),
		]
		setupSelectMock(mockTodos)

		const result = await service.findAll()

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({
			title: "First todo example",
			id: 1,
			completed: false,
		})
		expect(result[1]).toMatchObject({
			title: "Second todo example",
			id: 2,
			completed: true,
		})
	})

	it("service creates a new todo", async () => {
		const newTodo = createMockTodo({ id: 3, title: "Versioned", completed: true })
		setupInsertMock(newTodo)

		const result = await service.create({
			payload: { title: "Versioned", completed: true },
			authorId: USER_ID,
		})

		expect(result).toMatchObject({
			title: "Versioned",
			completed: true,
		})
	})

	it("service updates a todo", async () => {
		const existingTodo = createMockTodo({ id: 3 })
		const updated = createMockTodo({
			id: 3,
			title: "Updated Title",
		})
		setupSelectMock(existingTodo)
		setupUpdateMock(updated)

		const result = await service.update({
			payload: { id: 3, title: "Updated Title" },
		})

		expect(result).toMatchObject({
			id: 3,
			title: "Updated Title",
		})
	})

	it("service deletes a todo", async () => {
		const existingTodo = createMockTodo({ id: 3 })
		setupSelectMock(existingTodo)
		setupDeleteMock()

		await service.delete({ id: 3 })

		expect(mockDb.delete).toHaveBeenCalled()
	})
})
