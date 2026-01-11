"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar"
import { authApi } from "@/features/auth/api/auth-api"
import { clearTokens, getUser } from "@/services/api/client"
import { toast } from "sonner"
import { cn } from "@/core/lib/utils"

export function NavUser({
  user: initialUser,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [user, setUser] = React.useState(initialUser)
  const [mounted, setMounted] = React.useState(false)

  // Only load user data from localStorage after component mounts (client-side only)
  React.useEffect(() => {
    setMounted(true)
    const storedUser = getUser()
    if (storedUser) {
      const firstName = (storedUser.firstName as string) || ""
      const lastName = (storedUser.lastName as string) || ""
      const userEmail = (storedUser.email as string) || ""
      const fullName = (storedUser.fullName as string) || `${firstName} ${lastName}`.trim() || userEmail || "User"
      setUser({
        name: fullName,
        email: userEmail,
        avatar: (storedUser.avatar as string) || "/avatars/shadcn.jpg",
      })
    }
  }, [])

  const handleLogout = async () => {
    try {
      // Call backend logout API
      await authApi.logout()
      
      // Clear tokens and user data from localStorage
      clearTokens()
      
      // Show success message
      toast.success("Logged out successfully")
      
      // Redirect to login page
      router.push("/login")
    } catch {
      // Even if API call fails, clear local storage and redirect
      clearTokens()
      toast.info("Logged out")
      router.push("/login")
    }
  }

  const displayName = mounted ? user.name : initialUser.name
  const displayEmail = mounted ? user.email : initialUser.email
  const displayAvatar = mounted ? user.avatar : initialUser.avatar

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full [&>button]:w-full [&>button]:p-0 [&>button]:bg-transparent [&>button]:border-0 [&>button]:shadow-none [&>button]:ring-0">
            <div
              className={cn(
                "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 data-active:font-medium flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 data-[size=lg]:h-10 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium" suppressHydrationWarning>
                  {displayName}
                </span>
                <span className="text-muted-foreground truncate text-xs" suppressHydrationWarning>
                  {displayEmail}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={displayAvatar} alt={displayName} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium" suppressHydrationWarning>
                      {displayName}
                    </span>
                    <span className="text-muted-foreground truncate text-xs" suppressHydrationWarning>
                      {displayEmail}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
