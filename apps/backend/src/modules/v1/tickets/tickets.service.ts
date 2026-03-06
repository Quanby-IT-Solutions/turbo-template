import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { desc, eq } from "drizzle-orm"

import { tickets } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { type V1Inputs } from "@/config/contract-types"

type CreateTicketInput = V1Inputs["ticket"]["submit"]
type TicketIdInput = V1Inputs["ticket"]["get"]

@Injectable()
export class TicketsService {
	async findAll() {
		const result = await db.select().from(tickets).orderBy(desc(tickets.createdAt))
		return result
	}

	async findOne({ id }: { id: TicketIdInput["id"] }) {
		const idNum = id as number
		const [ticket] = await db.select().from(tickets).where(eq(tickets.id, idNum))
		if (!ticket) throw new NotFoundException(`Ticket with ID ${idNum} not found`)
		return ticket
	}

	async submit({ payload }: { payload: CreateTicketInput }) {
		const [ticket] = await db
			.insert(tickets)
			.values({
				name: payload.name,
				email: payload.email,
				subject: payload.subject,
				priority: payload.priority ?? "medium",
				concern: payload.concern,
			})
			.returning()
		if (!ticket) throw new InternalServerErrorException("Ticket not created")
		return ticket
	}
}
