"use client"

import { useState } from "react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
// ...existing code...
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/core/components/ui/dropdown-menu"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription, DialogOverlay, DialogPortal } from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { useUsers, useUserMutations } from "@/features/admin/hooks/use-users"
import type { CreateUserRequest } from "@/features/admin/api/users-api"
import { toast } from "sonner"

export default function SystemUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { users, loading, error, refetch } = useUsers({ search: searchQuery });
  const { createUser, deleteUser, deactivateUser, activateUser, resetPassword, loading: mutationLoading } = useUserMutations();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<CreateUserRequest>({ name: "", email: "", password: "", role: "PATIENT" });
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: "", confirmPassword: "" });

  // Filter users based on role and status
  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.emailVerified) || 
      (statusFilter === "inactive" && !user.emailVerified);
    return matchesRole && matchesStatus;
  });

  const handleCreateUser = async () => {
    try {
      await createUser(newUser);
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "PATIENT" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    console.log(`🔄 Toggling user status: ${userId}, currently ${isActive ? 'active' : 'inactive'}`);
    try {
      if (isActive) {
        await deactivateUser(userId);
        toast.success("User deactivated successfully");
      } else {
        await activateUser(userId);
        toast.success("User activated successfully");
      }
      await refetch();
    } catch (err) {
      console.error('❌ Toggle status error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to update user status");
      await refetch();
    }
  };

  const handleResetPassword = async () => {
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!selectedUserId) return;
    try {
      await resetPassword(selectedUserId, resetPasswordData.newPassword);
      toast.success("Password reset successfully");
      setIsResetPasswordOpen(false);
      setResetPasswordData({ newPassword: "", confirmPassword: "" });
      setSelectedUserId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    
    console.log('🗑️ Attempting to delete user:', selectedUserId);
    
    try {
      // First, verify the user still exists in our current list
      const userToDelete = users.find(u => u.id === selectedUserId);
      if (!userToDelete) {
        console.warn('⚠️ User not found in current list, refreshing...');
        await refetch();
        toast.error("User not found. The list has been refreshed.");
        setIsDeleteUserOpen(false);
        setSelectedUserId(null);
        return;
      }
      
      console.log('🗑️ Deleting user:', userToDelete.email);
      await deleteUser(selectedUserId);
      console.log('✅ User deleted successfully');
      toast.success("User deleted successfully");
      setIsDeleteUserOpen(false);
      setSelectedUserId(null);
      await refetch();
    } catch (err) {
      console.error('❌ Delete error:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete user";
      toast.error(errorMessage);
      // Refresh the list in case the user was already deleted
      await refetch();
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "ADMIN":
        return "default";
      case "DOCTOR":
        return "secondary";
      case "PATIENT":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="User Management" 
          description="Manage system users and their roles"
        />
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Input
                placeholder="Search users..."
                className="w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value || "all") }>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="PATIENT">Patient</SelectItem>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all") }>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <Button onClick={() => setIsAddUserOpen(true)}>Add New User</Button>
            </div>
          </div>
          <Card className="w-full overflow-x-auto">
            <CardContent className="p-0">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading users...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-red-500">Error: {error}</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No users found.</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No users match the selected filters.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={user.emailVerified ? "default" : "secondary"}>
                            {user.emailVerified ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Actions">
                                <DotsHorizontalIcon className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleToggleUserStatus(user.id, user.emailVerified)}
                              >
                                {user.emailVerified ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setIsResetPasswordOpen(true);
                                }}
                              >
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setIsDeleteUserOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Add User Dialog */}
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogContent className="max-w-md w-full p-0">
                <DialogHeader className="px-8 pt-8 pb-2">
                  <DialogTitle className="text-lg">Add New User</DialogTitle>
                </DialogHeader>
                <form
                  className="flex flex-col gap-6 px-8 pb-8 pt-2"
                  onSubmit={e => { e.preventDefault(); handleCreateUser(); }}
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PATIENT">Patient</SelectItem>
                        <SelectItem value="DOCTOR">Doctor</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3 justify-end mt-2">
                    <Button variant="outline" type="button" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={mutationLoading}>
                      {mutationLoading ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
              <DialogContent className="max-w-md w-full p-0">
                <DialogHeader className="px-8 pt-8 pb-2">
                  <DialogTitle className="text-lg">Reset Password</DialogTitle>
                </DialogHeader>
                <form
                  className="flex flex-col gap-6 px-8 pb-8 pt-2"
                  onSubmit={e => { e.preventDefault(); handleResetPassword(); }}
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={resetPasswordData.newPassword}
                      onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={resetPasswordData.confirmPassword}
                      onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-3 justify-end mt-2">
                    <Button variant="outline" type="button" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={mutationLoading}>
                      {mutationLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDeleteUser} disabled={mutationLoading}>
                    {mutationLoading ? "Deleting..." : "Delete User"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

