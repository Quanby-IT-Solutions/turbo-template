// PWA icon generator.
//
// Reads a source asset and renders every icon size the manifest and layout
// reference. Run with: `pnpm --filter @repo/web pwa:icons`.
//
// TODO: Replace pwa-source.svg with real brand artwork before shipping.

import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ICONS_DIR = path.resolve(__dirname, "../public/icons")
const PUBLIC_DIR = path.resolve(__dirname, "../public")
const SOURCE_SVG = path.join(ICONS_DIR, "pwa-source.svg")
const APP_CONFIG_TS = path.resolve(__dirname, "../core/lib/app-config.ts")

const FALLBACK_THEME_COLOR = "#4f46e5"

/**
 * Extract APP_THEME_COLOR from `core/lib/app-config.ts` by reading it as raw
 * text. Node ESM cannot import TypeScript directly without a build step, so a
 * narrow regex keeps the generator in sync with the shared app config while
 * avoiding any compile step. Falls back to the brand indigo if parsing fails.
 */
async function readThemeColor() {
	try {
		const source = await readFile(APP_CONFIG_TS, "utf8")
		const match = source.match(/export\s+const\s+APP_THEME_COLOR\s*=\s*["']([^"']+)["']/)

		if (match) {
			return match[1]
		}

		console.warn(`[pwa:icons] APP_THEME_COLOR not found in ${APP_CONFIG_TS}, using fallback`)
	} catch (err) {
		console.warn(`[pwa:icons] failed to read ${APP_CONFIG_TS} (${err.message}), using fallback`)
	}

	return FALLBACK_THEME_COLOR
}

// Brand color sourced from the shared app config so regenerated icons never
// desync from the manifest/layout theme color during rebranding. Populated in
// `main()` via `readThemeColor()`.
let THEME_COLOR = FALLBACK_THEME_COLOR

/**
 * Resolve the source image buffer. Prefers the committed SVG; falls back to a
 * solid-indigo square if the SVG is missing so the script never hard-fails.
 */
async function getSourceBuffer() {
	if (existsSync(SOURCE_SVG)) {
		return readFile(SOURCE_SVG)
	}

	console.warn(`[pwa:icons] ${SOURCE_SVG} not found, using solid-indigo fallback`)

	return sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: THEME_COLOR,
		},
	})
		.png()
		.toBuffer()
}

async function main() {
	THEME_COLOR = await readThemeColor()

	await mkdir(ICONS_DIR, { recursive: true })

	const source = await getSourceBuffer()

	// Standard square PNGs.
	const standard = [
		{ file: "icon-192.png", size: 192 },
		{ file: "icon-512.png", size: 512 },
		{ file: "apple-touch-icon.png", size: 180 },
	]

	for (const { file, size } of standard) {
		const out = path.join(ICONS_DIR, file)
		await sharp(source).resize(size, size, { fit: "contain" }).png().toFile(out)
		console.log(`[pwa:icons] wrote ${out}`)
	}

	// Maskable icon: shrink artwork into a ~80% safe zone with a theme-color
	// background so platform masks never clip the lettermark.
	{
		const size = 512
		const safe = Math.round(size * 0.8)
		const out = path.join(ICONS_DIR, "icon-512-maskable.png")
		await sharp(source)
			.resize(safe, safe, { fit: "contain" })
			.extend({
				top: (size - safe) / 2,
				bottom: (size - safe) / 2,
				left: (size - safe) / 2,
				right: (size - safe) / 2,
				background: THEME_COLOR,
			})
			.png()
			.toFile(out)
		console.log(`[pwa:icons] wrote ${out}`)
	}

	// favicon: written to the public root so browsers and Next's default favicon
	// resolution serve it at `/favicon.ico` (the canonical browser-facing icon).
	// sharp cannot emit true multi-size ICO, so we ship a 32x32 PNG under the
	// .ico name. For a true multi-size ICO, use a dedicated tool (e.g.
	// png-to-ico) or replace manually.
	{
		const out = path.join(PUBLIC_DIR, "favicon.ico")
		const buf = await sharp(source).resize(32, 32, { fit: "contain" }).png().toBuffer()
		await writeFile(out, buf)
		console.log(`[pwa:icons] wrote ${out} (PNG-backed placeholder)`)

		const iconsOut = path.join(ICONS_DIR, "favicon.ico")
		await writeFile(iconsOut, buf)
		console.log(`[pwa:icons] wrote ${iconsOut} (PNG-backed placeholder)`)
	}

	console.log("[pwa:icons] done")
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
