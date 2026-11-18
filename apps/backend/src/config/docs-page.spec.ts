import { renderDocsHtml } from "@/config/docs-page"
import { SCALAR_BUNDLE } from "@/config/scalar-bundle"

/**
 * `\s*` before the closing `>`: the HTML parser accepts `</script >`, so a
 * pattern anchored on `</script>` alone would let that spelling slip past
 * every assertion below.
 */
const SCRIPT_TAG_SOURCE = String.raw`<script\b[^>]*>[\s\S]*?<\/script\s*>`

function scriptTags(html: string): string[] {
	return html.match(new RegExp(SCRIPT_TAG_SOURCE, "gi")) ?? []
}

/**
 * Everything that sits outside a `<script>` element.
 *
 * Fragments are joined with NUL rather than concatenated: removing a script
 * element can butt its neighbours together, and two halves of the surrounding
 * markup must not splice into a `<script` token that was never in the input.
 */
function outsideScriptTags(html: string): string {
	const pattern = new RegExp(SCRIPT_TAG_SOURCE, "gi")
	const parts: string[] = []
	let from = 0

	for (let match = pattern.exec(html); match !== null; match = pattern.exec(html)) {
		parts.push(html.slice(from, match.index))
		from = match.index + match[0].length
	}
	parts.push(html.slice(from))

	return parts.join("\0")
}

describe("renderDocsHtml", () => {
	const html = renderDocsHtml({ specUrl: "/api/v1/spec.json", nonce: "abc+def/==" })
	const tags = scriptTags(html)

	it("emits the pinned bundle and one inline init", () => {
		expect(tags).toHaveLength(2)
		expect(tags[0]).toContain(`src="${SCALAR_BUNDLE.url}"`)
		expect(tags[0]).toContain(`integrity="${SCALAR_BUNDLE.integrity}"`)
		expect(tags[0]).toContain('crossorigin="anonymous"')
		expect(tags[0]).not.toMatch(/\snonce=/)
		expect(tags[1]).toContain('nonce="abc+def/=="')
		expect(tags[1]).toContain("Scalar.createApiReference('#app',")
		expect(tags[1]).toContain('"url":"/api/v1/spec.json"')
		expect(tags[1]).toContain('"theme":"none"')
		expect(tags[1]).toContain('"withDefaultFonts":false')
		expect(tags[1]).toContain('"telemetry":false')
		expect(tags[1]).toContain('"_integration":"nestjs"')
		expect(html).toContain('<div id="app">')
	})

	it("has no other script or inline handler", () => {
		const outsideScripts = outsideScriptTags(html)
		expect(outsideScripts).not.toContain("<script")
		expect(outsideScripts).not.toMatch(/\son[a-z]+\s*=/i)
		expect(html.match(/<script\b/gi)).toHaveLength(2)
	})

	it("escapes a spec URL that contains a closing script tag", () => {
		const hostile = "https://example.test/</script><script>alert(1)</script>"
		const escaped = renderDocsHtml({ specUrl: hostile, nonce: "n-1" })

		expect(scriptTags(escaped)).toHaveLength(2)
		expect(escaped.match(/<\/script\s*>/gi)).toHaveLength(2)
		expect(escaped).toContain("\\u003c/script>")
		expect(escaped).not.toContain("</script><script>")
	})

	it("does not embed an unversioned Scalar URL", () => {
		const marker = "https://cdn.jsdelivr.net/npm/@scalar/api-reference"
		const at = html.indexOf(marker)
		expect(at).toBeGreaterThanOrEqual(0)
		expect(html.charAt(at + marker.length)).toBe("@")
		expect(html).not.toContain(`${marker}/`)
		expect(html).not.toContain(`${marker}"`)
	})
})
