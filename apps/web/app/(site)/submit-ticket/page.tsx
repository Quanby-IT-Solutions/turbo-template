"use client"

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
import { useSubmitTicketMutation } from "@/features/tickets/api/tickets.hooks"

// Kept in step with CreateTicketSchema: the server bounds `concern` at 5000
// (HY-2 / F-29). Declaring it here too turns a 400 round-trip into an inline
// message, but the server remains the authority — this is a convenience, not
// the check.
const CONCERN_MAX_LENGTH = 5000

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
						Submissions are open — sign in first if you want the ticket linked to your account.
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
	const submitTicket = useSubmitTicketMutation()

	return (
		<form
			onSubmit={event => {
				event.preventDefault()
				// Captured before the await: React nulls `currentTarget` once the
				// synthetic event is done, so reading the form off it afterwards
				// throws. The previous mock reset() only survived because nothing
				// ever reached it.
				const form = event.currentTarget
				const formData = new FormData(form)

				submitTicket.mutate(
					{
						name: String(formData.get("name") ?? ""),
						email: String(formData.get("email") ?? ""),
						subject: String(formData.get("subject") ?? ""),
						priority: formData.get("priority") as "low" | "medium" | "high" | "urgent",
						concern: String(formData.get("concern") ?? ""),
					},
					{ onSuccess: () => form.reset() }
				)
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
						maxLength={CONCERN_MAX_LENGTH}
						placeholder="Describe what is happening…"
						required
					/>
				</Field>
				<FieldDescription className="text-muted-foreground text-xs">
					All submissions are handled by the NestJS tickets module.
				</FieldDescription>
				<Button type="submit" disabled={submitTicket.isPending} className="w-full">
					{submitTicket.isPending ? "Submitting..." : "Submit Ticket"}
				</Button>
				{submitTicket.isSuccess && (
					<p role="status" className="text-sm text-emerald-600">
						Ticket #{submitTicket.data.id} submitted. We will be in touch by email.
					</p>
				)}
				{submitTicket.isError && (
					// `role="alert"` rather than `status`: a failed submission is the one
					// outcome a screen-reader user must not miss, because their input is
					// still in the form and still needs resending.
					<p role="alert" className="text-destructive text-sm">
						Could not submit the ticket. Please check the fields and try again.
					</p>
				)}
			</FieldGroup>
		</form>
	)
}
