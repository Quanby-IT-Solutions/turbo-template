import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// ESM-safe directory resolution (this package is "type": "module")
const rootDir = fileURLToPath(new URL(".", import.meta.url))
const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		globals: true,
		passWithNoTests: true,
		// `next build` copies the whole app (tests included) into
		// `.next/standalone`. Without this, every suite runs twice — once from
		// source and once from a build snapshot that is stale the moment anyone
		// edits a file, so a broken change can be reported green by its own
		// outdated copy. Only source is ever collected.
		exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
			thresholds: {
				lines: 60,
				functions: 60,
				branches: 50,
				statements: 60,
			},
			exclude: [
				"**/*.config.*",
				"**/*.setup.*",
				"**/*.spec.*",
				"**/*.test.*",
				"**/*.d.ts",
				"**/node_modules/**",
				"**/features/todos/**",
			],
		},
	},
	resolve: {
		alias: {
			"@repo/contracts": fromRoot("../../packages/contracts/src/index.ts"),
			// `@repo/observability` publishes only compiled `dist` artifacts, which
			// are not checked in. Resolve it from source so the suite runs in a
			// clean checkout without a prior manual package build.
			"@repo/observability": fromRoot("../../packages/observability/src/index.ts"),
			"@repo/auth": fromRoot("../../packages/auth/src/index.ts"),
			"@repo/db/schema": fromRoot("../../packages/db/src/schema.ts"),
			"@repo/db/client": fromRoot("../../packages/db/src/client.ts"),
			"@": rootDir,
		},
	},
})
