// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import { GET, POST } from "./route"

describe("/ingest proxy route", () => {
	it("answers 404 and calls nothing when browser analytics is off", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch")

		const get = await GET(new Request("https://app.example.com/ingest/flags/?v=2"))
		const post = await POST(
			new Request("https://app.example.com/ingest/e/", { method: "POST", body: "x" })
		)

		expect(get.status).toBe(404)
		expect(post.status).toBe(404)
		expect(fetchSpy).not.toHaveBeenCalled()
	})
})
