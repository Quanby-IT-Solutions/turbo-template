/**
 * Mobile tests need the Flutter SDK. Web and backend adopters do not.
 * Missing Flutter skips this package with exit 0 so `pnpm test` can finish.
 * When Flutter is on PATH, this runs `flutter test --coverage` and keeps its status.
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { delimiter, join } from "node:path"

const executableNames =
	process.platform === "win32" ? ["flutter.cmd", "flutter.bat", "flutter.exe"] : ["flutter"]

function flutterOnPath() {
	const pathValue = process.env.PATH ?? ""
	return pathValue.split(delimiter).some(dir => {
		if (!dir) return false
		return executableNames.some(name => existsSync(join(dir, name)))
	})
}

if (!flutterOnPath()) {
	console.log("Flutter is required for mobile tests and was skipped.")
	process.exit(0)
}

const result = spawnSync("flutter", ["test", "--coverage"], {
	stdio: "inherit",
	shell: process.platform === "win32",
})

if (result.error) {
	console.error(result.error.message)
	process.exit(1)
}

process.exit(result.status === null ? 1 : result.status)
