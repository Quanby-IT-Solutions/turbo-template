import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		globals: true,
		passWithNoTests: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			all: false,
			thresholds: {
				lines: 60,
				functions: 60,
				branches: 50,
				statements: 60,
			},
			include: ["features/**/*.{ts,tsx}", "core/**/*.{ts,tsx}", "services/**/*.{ts,tsx}"],
			exclude: [
				"**/*.config.*",
				"**/*.setup.*",
				"**/*.spec.*",
				"**/*.test.*",
				"**/*.d.ts",
				"node_modules",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
	},
})
