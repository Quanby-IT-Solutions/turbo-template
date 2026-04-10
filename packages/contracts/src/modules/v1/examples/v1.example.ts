import { oc } from "@orpc/contract"

import { todoContract } from "./todos/todos.contract.js"

/**
 * V1 contract router (versioned paths: /v1/todos, /v1/health)
 * Assembles all v1 feature contracts and applies the /example prefix
 */
export const v1Example = oc.prefix("/example").router(
	oc.router({
		todo: todoContract,
	})
)
