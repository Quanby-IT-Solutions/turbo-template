import { describe, expect, it } from "vitest"

import { parseOriginList } from "./origin-list.js"

// AC-5 / F-32: origin allowlists were split on "," with no trim and no empty
// filter, so a list written with spaces produced entries matching nothing, and
// a trailing comma produced an empty string — which some origin checks treat
// as "any". Both fail silently.

describe("parseOriginList", () => {
	it("splits a plain list", () => {
		expect(parseOriginList("http://a.test,http://b.test")).toEqual([
			"http://a.test",
			"http://b.test",
		])
	})

	it("trims spaces written after the commas", () => {
		expect(parseOriginList("http://a.test, http://b.test ,  http://c.test")).toEqual([
			"http://a.test",
			"http://b.test",
			"http://c.test",
		])
	})

	it("drops the empty entry a trailing comma produces", () => {
		expect(parseOriginList("http://a.test,")).toEqual(["http://a.test"])
	})

	it("drops empties anywhere in the list", () => {
		expect(parseOriginList("http://a.test,,http://b.test")).toEqual([
			"http://a.test",
			"http://b.test",
		])
	})

	it.each([undefined, "", "   ", ",", " , "])("yields no origins for %p", raw => {
		// Never an array containing "" — an empty origin is the dangerous case.
		expect(parseOriginList(raw)).toEqual([])
	})
})
