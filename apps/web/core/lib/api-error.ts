// Typed error that retains the HTTP status so retry/auth classification does not
// depend on parsing the (backend-overridable) message text.
export class ApiError extends Error {
	readonly status: number
	readonly retryAfter?: number

	constructor(status: number, message: string, retryAfter?: number) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.retryAfter = retryAfter
	}
}
