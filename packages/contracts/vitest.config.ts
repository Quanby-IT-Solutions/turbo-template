import { defineConfig } from "vitest/config"
import path from "path"

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
			thresholds: {
				lines: 90,
				functions: 90,
				branches: 85,
				statements: 90,
			},
			exclude: [
				"**/dist/**",
				"**/*.config.*",
				"**/*.setup.*",
				"**/*.spec.*",
				"**/*.test.*",
				"**/*.d.ts",
				"**/node_modules/**",
				"**/modules/v1/examples/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
})
