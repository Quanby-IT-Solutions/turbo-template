import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================
export const TicketPrioritySchema = z.enum(["low", "medium", "high", "urgent"])
export const TicketStatusSchema = z.enum(["received", "in_progress", "resolved", "closed"])

const baseTicketSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	email: z.string().email("Invalid email address"),
	subject: z.string().min(1, "Subject is required").max(255, "Subject too long"),
	priority: TicketPrioritySchema.default("medium"),
	concern: z.string().min(1, "Concern is required"),
	status: TicketStatusSchema.default("received"),
	authorId: z.string().nullable(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? new Date(val) : val)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? new Date(val) : val)),
})

export const TicketSchema = baseTicketSchema

export const TicketIdSchema = z.object({
	id: z.coerce.number().int().positive(),
})

export const CreateTicketSchema = TicketSchema.pick({
	name: true,
	email: true,
	subject: true,
	priority: true,
	concern: true,
})
