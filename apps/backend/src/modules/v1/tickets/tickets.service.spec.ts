import { InternalServerErrorException, NotFoundException } from "@nestjs/common"

import { db } from "@/common/database/database.client"

import { TicketsService } from "./tickets.service"

jest.mock("@repo/db/schema", () => ({
	tickets: { id: "id", createdAt: "createdAt" },
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
		insert: jest.fn(),
	},
}))

const mockSelect = db.select as jest.Mock
const mockInsert = db.insert as jest.Mock

describe("TicketsService", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("findAll returns all tickets ordered by createdAt", async () => {
		const rows = [{ id: 1 }, { id: 2 }]
		mockSelect.mockReturnValue({
			from: jest.fn().mockReturnValue({
				orderBy: jest.fn().mockResolvedValue(rows),
			}),
		})

		const service = new TicketsService()
		await expect(service.findAll()).resolves.toEqual(rows)
	})

	it("findOne returns the matching ticket", async () => {
		const ticket = { id: 1, name: "Ada" }
		mockSelect.mockReturnValue({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([ticket]),
			}),
		})

		const service = new TicketsService()
		await expect(service.findOne({ id: 1 })).resolves.toEqual(ticket)
	})

	it("findOne throws NotFoundException when no ticket matches", async () => {
		mockSelect.mockReturnValue({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([]),
			}),
		})

		const service = new TicketsService()
		await expect(service.findOne({ id: 99 })).rejects.toThrow(NotFoundException)
	})

	it("submit inserts and returns the created ticket", async () => {
		const ticket = { id: 1, name: "Ada", priority: "medium" }
		mockInsert.mockReturnValue({
			values: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([ticket]),
			}),
		})

		const service = new TicketsService()
		await expect(
			service.submit({
				authorId: "spec-author",
				payload: { name: "Ada", email: "ada@example.com", subject: "Bug", concern: "It broke" },
			})
		).resolves.toEqual(ticket)
	})

	it("submit throws InternalServerErrorException when insert returns nothing", async () => {
		mockInsert.mockReturnValue({
			values: jest.fn().mockReturnValue({
				returning: jest.fn().mockResolvedValue([]),
			}),
		})

		const service = new TicketsService()
		await expect(
			service.submit({
				authorId: "spec-author",
				payload: { name: "Ada", email: "ada@example.com", subject: "Bug", concern: "It broke" },
			})
		).rejects.toThrow(InternalServerErrorException)
	})
})
