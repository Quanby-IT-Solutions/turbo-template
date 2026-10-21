import { Logger, RequestMethod } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { LoggerModule } from "nestjs-pino"

const UNSUPPORTED = "Unsupported route path"

function loggerModule(path: string) {
	return LoggerModule.forRoot({
		pinoHttp: { level: "silent", autoLogging: false },
		forRoutes: [{ path, method: RequestMethod.ALL }],
	})
}

async function bootWithPrefix(path: string) {
	const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
	const moduleRef = await Test.createTestingModule({
		imports: [loggerModule(path)],
	}).compile()
	const app = moduleRef.createNestApplication({ logger: false })
	app.setGlobalPrefix("api")
	await app.init()
	const warnings = warn.mock.calls.map(call => String(call[0]))
	await app.close()
	warn.mockRestore()
	return warnings
}

describe("LoggerModule route", () => {
	it("passes the v8 wildcard to LoggerModule.forRoot", () => {
		const source = readFileSync(join(__dirname, "app.module.ts"), "utf8")

		expect(source).toContain('forRoutes: [{ path: "{*path}", method: RequestMethod.ALL }]')
	})

	it("does not emit a legacy-route warning for {*path} under the api prefix", async () => {
		const warnings = await bootWithPrefix("{*path}")

		expect(warnings.some(message => message.includes("LegacyRouteConverter"))).toBe(false)
		expect(warnings.some(message => message.includes(UNSUPPORTED))).toBe(false)
	})

	it("still warns for the legacy * wildcard under the api prefix", async () => {
		const warnings = await bootWithPrefix("*")

		expect(warnings.some(message => message.includes(UNSUPPORTED))).toBe(true)
	})
})
