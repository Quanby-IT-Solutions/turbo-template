import type { CaptureResult } from "posthog-js"
import { afterEach, describe, expect, it, vi } from "vitest"

import { posthogInitOptions, resolvePosthogToken } from "./posthog-config"

const names = { flagName: "NEXT_PUBLIC_POSTHOG_ENABLED", tokenName: "NEXT_PUBLIC_POSTHOG_TOKEN" }

describe("resolvePosthogToken", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("is off without a word when the flag is off, even with a token parked", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

		expect(resolvePosthogToken({ ...names, token: "phc_x", flagEnabled: false })).toBeUndefined()
		expect(
			resolvePosthogToken({ ...names, token: "phc_x", flagEnabled: undefined })
		).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})

	it.each([undefined, "", "   "])(
		"warns once and stays off when the flag is on without a token (%j)",
		token => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

			expect(resolvePosthogToken({ ...names, token, flagEnabled: true })).toBeUndefined()
			expect(warn).toHaveBeenCalledTimes(1)
		}
	)

	it("returns the trimmed token when the flag and a token are both set", () => {
		expect(resolvePosthogToken({ ...names, token: " phc_x ", flagEnabled: true })).toBe("phc_x")
	})
})

describe("posthogInitOptions", () => {
	it("sends through the same-origin proxy with the privacy defaults", () => {
		expect(posthogInitOptions()).toMatchObject({
			api_host: "/ingest",
			ui_host: "https://us.posthog.com",
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			disable_session_recording: true,
			disable_surveys: true,
			disable_external_dependency_loading: true,
			// Autocapture records the text of whatever is clicked, and that text
			// can be an email address on screen; the scrub only sees key names.
			autocapture: false,
		})
	})

	it("strips deny-listed properties before an event leaves the browser", () => {
		const beforeSend = posthogInitOptions().before_send as (
			event: CaptureResult | null
		) => CaptureResult | null
		const event = {
			event: "$pageview",
			properties: { email: "a@b.c", $current_url: "/dashboard" },
		} as unknown as CaptureResult

		expect(beforeSend(event)?.properties).toEqual({ $current_url: "/dashboard" })
	})

	it("keeps PostHog's own project token, or posthog-js drops the event", () => {
		// Every posthog-js event carries the public project token as
		// properties.token. The deny-list has "token" (password-reset tokens), so
		// a plain scrub removed it and posthog-js dropped every event (live walk).
		const beforeSend = posthogInitOptions().before_send as (
			event: CaptureResult | null
		) => CaptureResult | null
		const event = {
			event: "$pageview",
			properties: { token: "phc_project", email: "a@b.c", form: { token: "reset-secret" } },
		} as unknown as CaptureResult

		expect(beforeSend(event)?.properties).toEqual({ token: "phc_project", form: {} })
	})

	it("passes a dropped event through as dropped", () => {
		const beforeSend = posthogInitOptions().before_send as (
			event: CaptureResult | null
		) => CaptureResult | null

		expect(beforeSend(null)).toBeNull()
	})
})
