import type { Metadata } from "next"

import { TodosView } from "@/features/todos/components/todos-view"
import { getAccess } from "@/features/dashboard/server/get-access"

export const metadata: Metadata = {
	title: "Todos / Posts",
}

export default async function TodosPage() {
	const access = await getAccess()

	return <TodosView access={{ roles: access.roles, permissions: access.permissions }} />
}
