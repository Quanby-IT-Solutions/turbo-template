import { describe, expect, it } from "vitest"

import { canAccess, type AccessProfile } from "./access"
import { getAccessibleNavItems, getDashboardRouteTitle, navItems } from "./nav-items"

const noAccess: AccessProfile = {
	roles: [],
	permissions: [],
}

describe("canAccess", () => {
	it("allows base items without requirements", () => {
		expect(canAccess(noAccess, {})).toBe(true)
	})

	it("allows the Admin role to satisfy permission requirements", () => {
		expect(canAccess({ roles: ["Admin"], permissions: [] }, { requiredPermission: "users:manage" })).toBe(
			true
		)
	})

	it("allows exact permission matches", () => {
		expect(
			canAccess(
				{ roles: [], permissions: ["posts:read"] },
				{ requiredPermission: "posts:read" }
			)
		).toBe(true)
	})

	it("allows resource wildcard permission matches", () => {
		expect(
			canAccess(
				{ roles: [], permissions: ["posts:*"] },
				{ requiredPermission: "posts:delete" }
			)
		).toBe(true)
	})

	it("allows any listed permission to match", () => {
		expect(
			canAccess(
				{ roles: [], permissions: ["users:manage"] },
				{ requiredPermission: ["users:read", "users:manage"] }
			)
		).toBe(true)
	})

	it("allows role requirements to match", () => {
		expect(canAccess({ roles: ["Manager"], permissions: [] }, { requiredRole: "Manager" })).toBe(
			true
		)
	})

	it("denies restricted items when no requirement matches", () => {
		expect(canAccess(noAccess, { requiredPermission: "users:read" })).toBe(false)
		expect(canAccess({ roles: ["User"], permissions: [] }, { requiredRole: "Manager" })).toBe(false)
	})
})

describe("navItems", () => {
	it("defines base and RBAC-gated dashboard destinations", () => {
		expect(navItems).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Dashboard", href: "/dashboard" }),
				expect.objectContaining({ label: "Submit Ticket", href: "/submit-ticket" }),
				expect.objectContaining({
					label: "Todos / Posts",
					href: "/todos",
					requiredPermission: "posts:read",
				}),
				expect.objectContaining({
					label: "User Management",
					href: "/user-management",
					section: "Administration",
					requiredPermission: ["users:read", "users:manage"],
				}),
			])
		)
	})

	it("filters visible items from the shared access helper", () => {
		expect(getAccessibleNavItems(noAccess).map(item => item.label)).toEqual([
			"Dashboard",
			"Submit Ticket",
		])

		expect(
			getAccessibleNavItems({ roles: [], permissions: ["posts:*"] }).map(item => item.label)
		).toContain("Todos / Posts")

		expect(
			getAccessibleNavItems({ roles: [], permissions: ["users:read"] }).map(item => item.label)
		).toContain("User Management")

		expect(getAccessibleNavItems({ roles: ["Admin"], permissions: [] }).map(item => item.label)).toEqual(
			["Dashboard", "Submit Ticket", "Todos / Posts", "User Management"]
		)
	})

	it("resolves mobile header titles from dashboard routes", () => {
		expect(getDashboardRouteTitle("/dashboard")).toBe("Dashboard")
		expect(getDashboardRouteTitle("/submit-ticket")).toBe("Submit Ticket")
		expect(getDashboardRouteTitle("/todos")).toBe("Todos / Posts")
		expect(getDashboardRouteTitle("/user-management")).toBe("User Management")
		expect(getDashboardRouteTitle("/account")).toBe("Account")
	})
})
