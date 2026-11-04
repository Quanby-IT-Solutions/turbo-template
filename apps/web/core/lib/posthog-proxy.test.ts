// @vitest-environment node
import { describe, expect, it } from "vitest"

import { buildUpstreamRequest, cleanUpstreamResponse, resolvePosthogHosts } from "./posthog-proxy"

const us = { ingest: "https://us.i.posthog.com", assets: "https://us-assets.i.posthog.com" }

describe("resolvePosthogHosts", () => {
	it("is off when browser analytics is off", () => {
		expect(resolvePosthogHosts({ enabled: false, token: "phc_x", host: undefined })).toBeUndefined()
		expect(resolvePosthogHosts({ enabled: true, token: " ", host: undefined })).toBeUndefined()
	})

	it("defaults to the US region", () => {
		expect(resolvePosthogHosts({ enabled: true, token: "phc_x", host: undefined })).toEqual(us)
	})

	it("derives the assets host of another PostHog region, keeping only the origin", () => {
		expect(
			resolvePosthogHosts({
				enabled: true,
				token: "phc_x",
				host: "https://eu.i.posthog.com/some/path/",
			})
		).toEqual({ ingest: "https://eu.i.posthog.com", assets: "https://eu-assets.i.posthog.com" })
	})

	it.each([
		"http://us.i.posthog.com",
		"https://evil.example.com",
		"https://posthog.com.evil.io",
		"not a url",
	])(
		"refuses a host that is not https on posthog.com (%s), so the proxy cannot point anywhere else",
		host => {
			expect(resolvePosthogHosts({ enabled: true, token: "phc_x", host })).toBeUndefined()
		}
	)
})

describe("buildUpstreamRequest", () => {
	it("forwards the event to PostHog without the visitor's cookies or credentials", async () => {
		const incoming = new Request("https://app.example.com/ingest/e/?ver=1.445.1", {
			method: "POST",
			body: "payload",
			headers: {
				"content-type": "text/plain",
				"cookie": "better-auth.session_token=secret",
				"authorization": "Bearer secret",
				"x-forwarded-for": "203.0.113.7",
			},
		})

		const { url, init } = await buildUpstreamRequest(incoming, us)
		const headers = new Headers(init.headers)

		expect(url).toBe("https://us.i.posthog.com/e/?ver=1.445.1")
		expect(init.method).toBe("POST")
		expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe("payload")
		expect(headers.get("content-type")).toBe("text/plain")
		expect(headers.get("x-forwarded-for")).toBe("203.0.113.7")
		expect(headers.get("cookie")).toBeNull()
		expect(headers.get("authorization")).toBeNull()
	})

	it("sends static asset requests to the assets host", async () => {
		const incoming = new Request("https://app.example.com/ingest/static/array.js")

		const { url, init } = await buildUpstreamRequest(incoming, us)

		expect(url).toBe("https://us-assets.i.posthog.com/static/array.js")
		expect(init.body).toBeUndefined()
	})
})

describe("cleanUpstreamResponse", () => {
	it("passes status and body through but never sets a cookie on the app's origin", async () => {
		const upstream = new Response("ok", {
			status: 200,
			headers: { "content-type": "application/json", "set-cookie": "ph=1; Path=/" },
		})

		const response = cleanUpstreamResponse(upstream)

		expect(response.status).toBe(200)
		expect(await response.text()).toBe("ok")
		expect(response.headers.get("content-type")).toBe("application/json")
		expect(response.headers.get("set-cookie")).toBeNull()
	})
})
