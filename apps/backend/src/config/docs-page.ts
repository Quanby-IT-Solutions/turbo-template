import { SCALAR_BUNDLE } from "@/config/scalar-bundle"

/**
 * HTML for the API docs page. Served by `setupSwagger`.
 *
 * The page loads one pinned bundle (integrity + CORS mode) and an inline
 * `Scalar.createApiReference` call. The inline script is the only one that
 * carries the per-request nonce. `<` in the config JSON is escaped so a spec
 * URL cannot close the script element.
 */
export function renderDocsHtml({ specUrl, nonce }: { specUrl: string; nonce: string }): string {
	const config = JSON.stringify({
		url: specUrl,
		theme: "none",
		withDefaultFonts: false,
		telemetry: false,
		_integration: "nestjs",
	}).replace(/</g, "\\u003c")

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API Reference</title>
<link rel="icon" href="data:,">
</head>
<body>
<div id="app"></div>
<script src="${SCALAR_BUNDLE.url}" integrity="${SCALAR_BUNDLE.integrity}" crossorigin="anonymous"></script>
<script nonce="${nonce}">Scalar.createApiReference('#app', ${config})</script>
</body>
</html>
`
}
