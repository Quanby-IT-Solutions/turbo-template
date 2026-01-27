/// <reference types="node" />
import { config } from "dotenv"
import { resolve } from "node:path"
import { defineConfig } from "drizzle-kit"

// Load .env from project root (two levels up from packages/db)
config({ path: resolve(__dirname, "../../.env") })

export default defineConfig({
	schema: "./dist/schema/index.js",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL || "",
	},
})
