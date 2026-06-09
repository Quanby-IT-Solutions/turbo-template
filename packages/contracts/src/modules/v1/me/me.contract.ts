import { oc } from "@orpc/contract"

import { MePermissionsSchema } from "./me.schema.js"

export const meContract = {
	permissions: oc
		.route({
			method: "GET",
			path: "/me/permissions",
			summary: "Get current user permissions",
			description: "Return the current user's role names and effective permission names.",
			tags: ["Me"],
		})
		.output(MePermissionsSchema),
}
