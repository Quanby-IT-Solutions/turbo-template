import * as path from "node:path"
import { includeIgnoreFile } from "@eslint/compat"
import nextPlugin from "@next/eslint-plugin-next"
import pluginQuery from "@tanstack/eslint-plugin-query"
import prettier from "eslint-config-prettier"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

/**
 * ESLint config preset for Next.js applications
 * Includes: base TypeScript rules, React, Next.js, TanStack Query, and Prettier integration
 */
export const appConfig = defineConfig(
	// Ignore files not tracked by VCS and any config files
	includeIgnoreFile(path.join(import.meta.dirname, "../../.gitignore")),
	{ ignores: ["**/*.config.*", "next-env.d.ts"] },
	{
		files: ["**/*.js", "**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			// Base JavaScript rules
			"no-console": "warn",
			"eqeqeq": ["error", "always"],
			"curly": ["error", "all"],
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-template": "error",
			"no-unreachable": "warn",
			"no-duplicate-imports": "error",
			"no-unused-expressions": "error",
			"no-return-await": "error",
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-new-func": "error",
			"no-script-url": "error",

			// TypeScript-specific rules
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{ checksVoidReturn: { attributes: false } },
			],
		},
	},
	// React Hooks
	reactHooks.configs.flat.recommended,
	// React
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			react: react,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			...react.configs.recommended.rules,
			"react/no-children-prop": "off",
		},
	},
	// Next.js
	// If a project adds settings: { next: { rootDir } }, any rootDir must be a
	// wildcard pattern (e.g. "apps/*/") while the pnpm-workspace.yaml override
	// is in place.
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			// @ts-ignore - nextPlugin has legacy config types incompatible with flat config, but works at runtime
			"@next/next": nextPlugin,
		},
		// @ts-ignore - nextPlugin.configs.recommended.rules has string values incompatible with RuleConfig type
		rules: {
			...nextPlugin.configs.recommended.rules,
			"react/react-in-jsx-scope": "off",
		},
	},
	// TanStack Query
	...pluginQuery.configs["flat/recommended"],
	// Prettier (must be last to override conflicting rules)
	prettier
)

/**
 * Restricts direct access to process.env
 * Use this for apps that leverage t3-env for validated environment variables
 */
export const restrictEnvAccess = defineConfig(
	{ ignores: ["**/env.ts"] },
	{
		files: ["**/*.js", "**/*.ts", "**/*.tsx"],
		rules: {
			"no-restricted-properties": [
				"error",
				{
					object: "process",
					property: "env",
					message: "Use `import { env } from '~/env'` instead to ensure validated types.",
				},
			],
			"no-restricted-imports": [
				"error",
				{
					name: "process",
					importNames: ["env"],
					message: "Use `import { env } from '~/env'` instead to ensure validated types.",
				},
			],
		},
	}
)
