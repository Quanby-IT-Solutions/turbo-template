/**
 * Pinned browser bundle for the API docs page.
 *
 * `@scalar/nestjs-api-reference` stays installed as the version anchor. Its
 * `devDependencies["@scalar/api-reference"]` is the bundle this page loads.
 * Bumping that integration means bumping `version` and recomputing `integrity`
 * from the same file in the same commit. The unit test fails when the version,
 * the URL, and the hash do not move together.
 *
 * Recompute `integrity` with:
 * `curl -sS "<url>" | openssl dgst -sha384 -binary | base64`
 */
export const SCALAR_BUNDLE = {
	version: "1.43.7",
	url: "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.7/dist/browser/standalone.js",
	integrity: "sha384-AVyYs5hutJJLczvfLlSHs6P0OZIiT2DIoNhosMicA1u/LNftpxwoe4/I443/Y0SL",
} as const
