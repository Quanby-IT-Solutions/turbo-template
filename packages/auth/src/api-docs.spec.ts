import { describe, expect, it } from "vitest"

import { isApiDocsEnabled } from "./api-docs.js"
import { buildAuthPlugins } from "./auth-plugins.js"
import { booleanFromEnv } from "./mailer/bool-schema.js"

// DOMAIN-MODEL decision table: backend docs on iff the openAPI plugin is
// registered. Flag strings go through the same strict parser both packages use.
const NODE_ENVS = ["development", undefined, "test", "production"] as const
const FLAGS = [undefined, true, false, "1", "0"] as const

type NodeEnv = (typeof NODE_ENVS)[number]
type Flag = (typeof FLAGS)[number]

function parseFlag(flag: Flag): boolean | undefined {
	if (flag === undefined) return undefined
	return booleanFromEnv.parse(flag)
}

function expectedDocs(nodeEnv: NodeEnv, flag: Flag): boolean {
	if (flag === true || flag === "1") return true
	if (flag === false || flag === "0") return false
	return (nodeEnv ?? "development") === "development"
}

const CASES = NODE_ENVS.flatMap(nodeEnv => FLAGS.map(flag => [nodeEnv, flag] as const))

describe("NODE_ENV x ENABLE_API_DOCS matrix", () => {
	it.each(CASES)(
		"backend docs decision matches openAPI plugin registration (NODE_ENV=%s, flag=%s)",
		(nodeEnv, flag) => {
			const docsEnabled = isApiDocsEnabled(nodeEnv, parseFlag(flag))
			const plugins = buildAuthPlugins(docsEnabled)
			const pluginRegistered = plugins.some(plugin => plugin.id === "open-api")

			expect(docsEnabled).toBe(expectedDocs(nodeEnv, flag))
			expect(pluginRegistered).toBe(docsEnabled)
			expect(plugins).toHaveLength(docsEnabled ? 1 : 0)
		}
	)
})
