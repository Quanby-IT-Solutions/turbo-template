import { defineConfig } from "eslint/config"

import { packageConfig } from "@repo/eslint-config/pkg"

export default defineConfig(
	{
		ignores: ["eslint.config.mjs", "dist/**"],
	},
	packageConfig
)
