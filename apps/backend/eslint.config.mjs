import { defineConfig } from "eslint/config"

import { apiConfig } from "@repo/eslint-config/nest"

export default defineConfig(
	{
		ignores: ["eslint.config.mjs", "dist/**", "src/metadata.ts"],
	},
	apiConfig,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
		},
	}
)
