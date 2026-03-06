import { z } from "zod"

export const TicketPrioritySchema = z.enum(["low", "medium", "high", "urgent"])

export const SubmitTicketSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Please enter a valid email address"),
	subject: z.string().min(5, "Subject must be at least 5 characters"),
	priority: TicketPrioritySchema,
	concern: z.string().min(20, "Concern must be at least 20 characters"),
})

export type SubmitTicket = z.infer<typeof SubmitTicketSchema>