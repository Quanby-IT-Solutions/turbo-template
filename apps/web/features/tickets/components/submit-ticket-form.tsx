"use client"

import { useState } from "react"
import { useForm } from "@tanstack/react-form"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Spinner } from "@/core/components/ui/spinner"
import { Textarea } from "@/core/components/ui/textarea"

import { useSubmitTicketMutation } from "../api/submit-ticket.hooks"
import { SubmitTicketSchema, type SubmitTicket } from "../api/submit-ticket.schema"

const priorityOptions = ["low", "medium", "high", "urgent"] as const

export function SubmitTicketForm({ asCard = true }: { asCard?: boolean }) {
	const [submittedTicket, setSubmittedTicket] = useState<{ id: number } | null>(null)
	const { mutateAsync: submitTicket, isPending, error, reset } = useSubmitTicketMutation()
	const defaultValues: SubmitTicket = {
		name: "",
		email: "",
		subject: "",
		priority: "medium",
		concern: "",
	}

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: SubmitTicketSchema,
		},
		onSubmit: async ({ value }) => {
			reset()
			setSubmittedTicket(null)

			const result = await submitTicket({
				name: value.name.trim(),
				email: value.email.trim(),
				subject: value.subject.trim(),
				priority: value.priority,
				concern: value.concern.trim(),
			})

			setSubmittedTicket({ id: result.id })
			form.reset()
		},
	})

	const formContent = (
		<>
			{error && (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>
						{error.message || "Failed to submit ticket. Please try again."}
					</AlertDescription>
				</Alert>
			)}

			{submittedTicket && (
				<Alert className="mb-4">
					<AlertDescription>
						Your ticket was submitted successfully. Ticket ID:{" "}
						<strong>#{submittedTicket.id}</strong>
					</AlertDescription>
				</Alert>
			)}

			<form
				onSubmit={e => {
					e.preventDefault()
					form.handleSubmit()
				}}
			>
				<FieldGroup>
					<form.Field
						name="name"
						children={field => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder="Jane Doe"
										disabled={isPending}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					/>

					<form.Field
						name="email"
						children={field => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Email</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder="you@company.com"
										disabled={isPending}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					/>

					<form.Field
						name="subject"
						children={field => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Subject</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder="Unable to access dashboard"
										disabled={isPending}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					/>

					<form.Field
						name="priority"
						children={field => (
							<Field>
								<FieldLabel htmlFor={field.name}>Priority</FieldLabel>
								<select
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={e =>
										field.handleChange(e.target.value as (typeof priorityOptions)[number])
									}
									disabled={isPending}
									className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-[3px]"
								>
									{priorityOptions.map(option => (
										<option key={option} value={option}>
											{option.charAt(0).toUpperCase() + option.slice(1)}
										</option>
									))}
								</select>
							</Field>
						)}
					/>

					<form.Field
						name="concern"
						children={field => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Describe Your Concern</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder="Please include what happened, when it happened, and any error message you saw."
										rows={6}
										disabled={isPending}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					/>

					<Field>
						<Button type="submit" disabled={isPending} className="hover:cursor-pointer">
							{isPending && <Spinner className="mr-2 size-4" />}
							{isPending ? "Submitting..." : "Submit Ticket"}
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</>
	)

	if (!asCard) {
		return <div>{formContent}</div>
	}

	return (
		<Card className="border">
			<CardHeader>
				<CardTitle>Submit a Support Ticket</CardTitle>
			</CardHeader>
			<CardContent>{formContent}</CardContent>
		</Card>
	)
}
