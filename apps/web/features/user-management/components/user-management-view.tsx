"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { RolesPanel } from "@/features/user-management/components/roles-panel"
import { UsersPanel } from "@/features/user-management/components/users-panel"

export function UserManagementView() {
	return (
		<section className="flex w-full flex-col gap-6">
			<div>
				<h1 className="text-2xl font-bold">User Management</h1>
				<p className="text-muted-foreground">Manage roles, permissions, and user assignments.</p>
			</div>

			<Tabs defaultValue="roles">
				<TabsList>
					<TabsTrigger value="roles">Roles</TabsTrigger>
					<TabsTrigger value="users">Users</TabsTrigger>
				</TabsList>
				<TabsContent value="roles" className="pt-4">
					<RolesPanel />
				</TabsContent>
				<TabsContent value="users" className="pt-4">
					<UsersPanel />
				</TabsContent>
			</Tabs>
		</section>
	)
}
