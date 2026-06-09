import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		globals: true,
		passWithNoTests: true,
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
			],
		},
	},
	resolve: {
		alias: {
			"@repo/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
			"@repo/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
			"@repo/db/schema": path.resolve(__dirname, "../../packages/db/src/schema.ts"),
			"@repo/db/client": path.resolve(__dirname, "../../packages/db/src/client.ts"),
			"@": path.resolve(__dirname, "."),
		},
	},
})
