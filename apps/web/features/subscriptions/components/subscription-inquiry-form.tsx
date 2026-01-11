"use client"

import React from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"

type Props = {
	contactEndpoint: string
	defaultSubject?: string
}

export function SubscriptionInquiryForm({
	contactEndpoint,
	defaultSubject = "Subscription Inquiry",
}: Props) {
	const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle")
	const [error, setError] = React.useState<string | null>(null)
	const formRef = React.useRef<HTMLFormElement>(null)
	const [showSuccess, setShowSuccess] = React.useState(false)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setStatus("loading")
		setError(null)

		const formData = new FormData(event.currentTarget)
		const name = (formData.get("name") as string) || ""
		const email = (formData.get("email") as string) || ""
		const organization = (formData.get("organization") as string) || ""
		const role = (formData.get("role") as string) || ""
		const message = (formData.get("message") as string) || ""

		const text = [
			`Name: ${name}`,
			`Email: ${email}`,
			`Organization: ${organization}`,
			`Role: ${role}`,
			"",
			"Message:",
			message,
		].join("\n")

		const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 720px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 24px;">
        <div style="text-align: left; margin-bottom: 16px; border-bottom: 3px solid #16a34a; padding-bottom: 12px;">
          <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #16a34a; font-weight: 700;">QHealth</div>
          <h2 style="margin: 6px 0 0; font-size: 24px; font-weight: 700; color: #0f172a;">Subscription Inquiry</h2>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tbody>
            <tr>
              <td style="width: 28%; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Name</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${name || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Email</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${email || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Organization</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${organization || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Role</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${role || "-"}</td>
            </tr>
          </tbody>
        </table>

        <div style="border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 16px;">
          <div style="font-weight: 700; margin-bottom: 6px; font-size: 14px; color: #0f172a;">What do you need?</div>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #0f172a;">${message || "-"}</div>
        </div>

        <p style="margin-top: 18px; font-size: 12px; color: #64748b;">Sent from the QHealth website subscription inquiry form.</p>
      </div>
    `

		try {
			const res = await fetch(contactEndpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject: defaultSubject,
					text,
					html,
				}),
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.message || "Failed to send inquiry")
			}

			setStatus("success")
			setShowSuccess(true)
			formRef.current?.reset()
		} catch (err) {
			setStatus("error")
			setError(err instanceof Error ? err.message : "Failed to send inquiry")
		}
	}

	return (
		<>
			<form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input id="name" name="name" required disabled={status === "loading"} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email *</Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
							disabled={status === "loading"}
						/>
					</div>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="organization">Organization</Label>
						<Input id="organization" name="organization" disabled={status === "loading"} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">Role</Label>
						<Input id="role" name="role" disabled={status === "loading"} />
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="message">What do you need? *</Label>
					<Textarea
						id="message"
						name="message"
						required
						rows={4}
						disabled={status === "loading"}
						placeholder="Tell us about your subscription needs, organization size, or any custom requirements..."
					/>
				</div>
				{error && <div className="text-sm text-destructive">{error}</div>}
				<Button type="submit" disabled={status === "loading"}>
					{status === "loading" ? "Sending..." : "Send Inquiry"}
				</Button>
			</form>
			<Dialog open={showSuccess} onOpenChange={setShowSuccess}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Inquiry Sent!</DialogTitle>
						<DialogDescription>
							Thank you for your interest. We&apos;ll get back to you soon with pricing and rollout
							guidance.
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	)
}
