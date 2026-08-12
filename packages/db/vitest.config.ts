import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		passWithNoTests: true,
		// `tsc` emits the specs into `dist/` alongside the source, so without this
		// every suite runs twice — once from source and once from a compiled copy
		// that is stale whenever the build watcher is not running. Only source is
		// ever collected. Matches packages/auth.
		exclude: ["**/node_modules/**", "**/dist/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
			// Schema/migration/seed-script files are declarative or require a live
			// database; only the pure logic modules carry meaningful coverage.
			include: ["src/seed-guard.ts", "src/utils/**"],
			exclude: [
				"**/*.config.*",
				"**/*.setup.*",
				"**/*.spec.*",
				"**/*.test.*",
				"**/*.d.ts",
				"**/node_modules/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
})
