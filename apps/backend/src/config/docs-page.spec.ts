import { renderDocsHtml } from "@/config/docs-page"
import { SCALAR_BUNDLE } from "@/config/scalar-bundle"

function scriptTags(html: string): string[] {
	return html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []
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
		const outsideScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		expect(outsideScripts).not.toContain("<script")
		expect(outsideScripts).not.toMatch(/\son[a-z]+\s*=/i)
		expect(html.match(/<script\b/gi)).toHaveLength(2)
	})

	it("escapes a spec URL that contains a closing script tag", () => {
		const hostile = "https://example.test/</script><script>alert(1)</script>"
		const escaped = renderDocsHtml({ specUrl: hostile, nonce: "n-1" })

		expect(scriptTags(escaped)).toHaveLength(2)
		expect(escaped.match(/<\/script>/gi)).toHaveLength(2)
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
