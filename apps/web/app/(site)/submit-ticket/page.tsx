"use client"

import { useState } from "react"
import { Ticket01Icon } from "@hugeicons/core-free-icons"

import { PageHeader } from "@/core/components/page-header"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

type FormState = "idle" | "submitting" | "success" | "error"

export default function SubmitTicketPage() {
	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<PageHeader
				icon={Ticket01Icon}
				title="Submit a support ticket"
				description="Mirrors the ticket contract handled by the NestJS backend."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Ticket details</CardTitle>
					<CardDescription>
						Hook the submit handler up to the oRPC call when you are ready.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<SubmitTicketForm />
				</CardContent>
			</Card>
		</section>
	)
}

function SubmitTicketForm() {
	const [state, setState] = useState<FormState>("idle")

	return (
		<form
			onSubmit={async event => {
				event.preventDefault()
				const formData = new FormData(event.currentTarget)

				setState("submitting")
				try {
					// Replace this placeholder with an oRPC mutation or REST call to the backend.
					const payload = Object.fromEntries(formData.entries())
					await new Promise(resolve => setTimeout(resolve, 800))
					void payload
					setState("success")
					event.currentTarget.reset()
				} catch {
					setState("error")
				}
			}}
			className="space-y-4"
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="name">Name</FieldLabel>
					<Input id="name" name="name" placeholder="Jane Doe" required />
				</Field>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input id="email" name="email" type="email" placeholder="you@example.com" required />
				</Field>
				<Field>
					<FieldLabel htmlFor="subject">Subject</FieldLabel>
					<Input id="subject" name="subject" placeholder="How can we help?" required />
				</Field>
				<Field>
					<FieldLabel htmlFor="priority">Priority</FieldLabel>
					<Select name="priority" defaultValue="medium">
						<SelectTrigger id="priority" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="urgent">Urgent</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel htmlFor="concern">Concern</FieldLabel>
					<Textarea
						id="concern"
						name="concern"
						rows={5}
						placeholder="Describe what is happening…"
						required
					/>
				</Field>
				<FieldDescription className="text-muted-foreground text-xs">
					All submissions are handled by the NestJS tickets module. Wire this mock form to the API
					to persist real data.
				</FieldDescription>
				<Button type="submit" disabled={state === "submitting"} className="w-full">
					{state === "submitting" ? "Submitting..." : "Submit Ticket"}
				</Button>
				{state === "success" && (
					<p role="status" className="text-sm text-emerald-600">
						Ticket submitted! Replace the placeholder handler to persist it.
					</p>
				)}
				{state === "error" && (
					<p role="status" className="text-destructive text-sm">
						Something went wrong. Please try again.
					</p>
				)}
			</FieldGroup>
		</form>
	)
}
