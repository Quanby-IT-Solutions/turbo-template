import { SubmitTicketForm } from "@/features/tickets/components/submit-ticket-form"

export default function SubmitTicketPage() {
	return (
		<div className="space-y-4 p-4 pt-0">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Submit a Ticket</h1>
				<p className="text-muted-foreground">
					Tell us what you are facing and our support team will follow up.
				</p>
			</div>
			<SubmitTicketForm />
		</div>
	)
}
