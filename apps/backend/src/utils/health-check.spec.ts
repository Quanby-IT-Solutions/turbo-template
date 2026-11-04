import { isHealthCheckPath } from "./health-check"

describe("isHealthCheckPath", () => {
	it.each([
		"/api/v1/health",
		"/api/v1/health/",
		"/api/v1/health?probe=lb",
		"/api/v1/health/ready",
		"GET /api/v1/health",
	])("matches %p", value => {
		expect(isHealthCheckPath(value)).toBe(true)
	})

	it.each([
		"/api/v1/healthcheck-anything",
		"/api/v1/health-report",
		"/api/v1/users?next=/api/v1/health",
		"/x/api/v1/health",
		"",
	])("does not match %p", value => {
		expect(isHealthCheckPath(value)).toBe(false)
	})
})
