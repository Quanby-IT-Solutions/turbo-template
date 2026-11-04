import { PostHog } from "posthog-node"

import { createPosthogClient, POSTHOG_FLAG_TIMEOUT_MS } from "./posthog.provider"

// The SDK constructor is replaced so no test opens a connection, and so the
// options the client was built with can be read back.
jest.mock("posthog-node", () => ({ PostHog: jest.fn() }))

const PostHogMock = PostHog as unknown as jest.Mock

type BuiltOptions = {
	host: string
	secretKey?: string
	featureFlagsRequestTimeoutMs: number
	before_send: (event: { event: string; properties?: Record<string, unknown> }) => unknown
}

function builtWith(): { token: string; options: BuiltOptions } {
	const [token, options] = PostHogMock.mock.calls[0] as [string, BuiltOptions]
	return { token, options }
}

describe("createPosthogClient", () => {
	const host = "https://us.i.posthog.com"

	beforeEach(() => PostHogMock.mockClear())

	it("returns null when disabled, without warning", () => {
		const warn = jest.fn()

		expect(createPosthogClient({ enabled: false, token: "phc_x", host }, warn)).toBeNull()
		expect(warn).not.toHaveBeenCalled()
		expect(PostHogMock).not.toHaveBeenCalled()
	})

	it.each([undefined, "", "   "])(
		"returns null and warns once when enabled without a token (%p)",
		token => {
			const warn = jest.fn()

			expect(createPosthogClient({ enabled: true, token, host }, warn)).toBeNull()
			expect(warn).toHaveBeenCalledTimes(1)
			expect(PostHogMock).not.toHaveBeenCalled()
		}
	)

	it("builds a client with the flag timeout when enabled with a token", () => {
		const client = createPosthogClient({ enabled: true, token: "phc_x", host })

		expect(client).not.toBeNull()
		const { token, options } = builtWith()
		expect(token).toBe("phc_x")
		expect(options.host).toBe(host)
		expect(options.featureFlagsRequestTimeoutMs).toBe(POSTHOG_FLAG_TIMEOUT_MS)
		expect(POSTHOG_FLAG_TIMEOUT_MS).toBe(1500)
		expect(options.secretKey).toBeUndefined()
	})

	it("passes the secret key only when one is set", () => {
		createPosthogClient({ enabled: true, token: "phc_x", host, secretKey: "phs_y" })

		expect(builtWith().options.secretKey).toBe("phs_y")
	})

	it("strips deny-listed properties before an event is sent", () => {
		createPosthogClient({ enabled: true, token: "phc_x", host })

		const sent = builtWith().options.before_send({
			event: "x",
			properties: { email: "a@b.c", route: "/todos" },
		})

		expect(sent).toEqual({ event: "x", properties: { route: "/todos" } })
	})
})
