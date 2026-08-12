import { MAX_REQUEST_ID_LENGTH, sanitizeRequestId } from "@/utils/log-redaction"

/**
 * LG-2 / F-37 — an inbound X-Request-Id is validated before it is trusted.
 *
 * It used to be taken verbatim: unbounded, written into structured logs, and
 * echoed back on the response. A newline forges log lines, since the id lands
 * in structured output a log reader parses; an unbounded reflected value is a
 * header-injection and cache-poisoning surface.
 */

/** Built from char codes so the spec file contains no literal control bytes. */
const NUL = String.fromCharCode(0)
const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)

describe("sanitizeRequestId", () => {
	it.each([
		["a UUID", "3f2504e0-4f89-11d3-9a0c-0305e82c3301"],
		["a ULID", "01ARZ3NDEKTSV4RRFFQ69G5FAV"],
		["a dotted trace id", "trace.1234:56"],
		["an underscored id", "req_abc-123"],
	])("accepts %s", (_label, id) => {
		expect(sanitizeRequestId(id)).toBe(id)
	})

	it.each([
		["a newline (log forging)", `abc${LF}info: forged log line`],
		["a CRLF (header injection)", `abc${CR}${LF}Set-Cookie: evil=1`],
		["a null byte", `abc${NUL}def`],
		["a space", "abc def"],
		["a header terminator", "abc: value"],
		["a slash", "abc/def"],
		["an empty string", ""],
	])("rejects %s", (_label, id) => {
		expect(sanitizeRequestId(id)).toBeNull()
	})

	it("rejects anything over the length cap", () => {
		expect(sanitizeRequestId("a".repeat(MAX_REQUEST_ID_LENGTH + 1))).toBeNull()
	})

	it("accepts a value exactly at the cap", () => {
		const id = "a".repeat(MAX_REQUEST_ID_LENGTH)
		expect(sanitizeRequestId(id)).toBe(id)
	})

	it("takes the first value when the header repeats", () => {
		expect(sanitizeRequestId(["first-id", "second-id"])).toBe("first-id")
	})

	it.each([[undefined], [null], [42], [{}]])("rejects the non-string %p", value => {
		expect(sanitizeRequestId(value)).toBeNull()
	})
})
