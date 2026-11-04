/** The load balancer's health route. */
export const HEALTH_CHECK_PATH = "/api/v1/health"

/**
 * The path itself or one under it, at the start of the value or after the
 * method in a span name (`GET /api/v1/health`). Not a prefix match:
 * `/api/v1/health-report` is a different route and stays traced.
 */
const HEALTH_CHECK = /(?:^|\s)\/api\/v1\/health(?=$|[/?#])/

/** Whether a request path, route or span name is the health check. */
export function isHealthCheckPath(value: string): boolean {
	return HEALTH_CHECK.test(value)
}
