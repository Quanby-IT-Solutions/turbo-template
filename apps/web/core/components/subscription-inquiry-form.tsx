'use client'

import React from "react"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"

type Props = {
  contactEndpoint: string
  defaultSubject?: string
}

export function SubscriptionInquiryForm({ contactEndpoint, defaultSubject = "Subscription Inquiry" }: Props) {
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
      formRef.current?.reset()
      setShowSuccess(true)
    } catch (err: any) {
      setStatus("error")
      setError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  return (
    <>
      <form ref={formRef} className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="contact-name">
          Full name <span className="text-destructive">*</span>
        </Label>
        <Input id="contact-name" name="name" placeholder="Your name" required />
        <p className="text-xs text-muted-foreground">Tell us who we’ll be speaking with.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-email">
          Work email <span className="text-destructive">*</span>
        </Label>
        <Input id="contact-email" name="email" type="email" placeholder="you@company.com" required />
        <p className="text-xs text-muted-foreground">We’ll reply here within one business day.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-org">
          Organization <span className="text-destructive">*</span>
        </Label>
        <Input id="contact-org" name="organization" placeholder="Organization or clinic" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-role">Role</Label>
        <Input id="contact-role" name="role" placeholder="e.g., Admin, CIO, Physician" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="contact-message">
          What do you need? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder="Tell us about your team size, timeline, and any specific requirements."
          rows={5}
          required
        />
        <p className="text-xs text-muted-foreground">
          Examples: rollout timeline, number of clinicians, integrations, compliance needs.
        </p>
      </div>
      <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {status === "success"
            ? "Sent. We typically respond in <24 hours on business days."
            : "We typically respond in <24 hours on business days."}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {status === "error" && <span className="text-xs text-destructive">{error}</span>}
          <Button type="submit" className="w-full sm:w-auto" disabled={status === "loading"}>
            {status === "loading" ? "Sending..." : status === "success" ? "Sent" : "Send inquiry"}
          </Button>
        </div>
      </div>
    </form>
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inquiry sent</DialogTitle>
            <DialogDescription>
              Thanks for reaching out. We received your subscription inquiry and will respond within one business day.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccess(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

