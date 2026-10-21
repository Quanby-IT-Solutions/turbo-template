import type { Metadata } from "next"

import { UserManagementView } from "@/features/user-management/components/user-management-view"

export const metadata: Metadata = {
	title: "User Management",
}

export default function UserManagementPage() {
	return <UserManagementView />
}
