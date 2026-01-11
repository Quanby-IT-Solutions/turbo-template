"use client"

import * as React from "react"
import { IconChevronDown, type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar"
import { cn } from "@/core/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: Icon
    subItems?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<string[]>([])

  const isActive = (url: string) => {
    if (url === "/admin" || url === "/super-admin" || url === "/doctor" || url === "/patient" || url === "/organization") {
      return pathname === url
    }
    return pathname?.startsWith(url)
  }

  // Auto-expand items if the main item or any of their subItems are active
  React.useEffect(() => {
    const shouldBeOpen: string[] = []
    
    items.forEach((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const isOnMainPage = pathname === item.url
        const isOnSubPage = item.subItems.some((subItem) => pathname === subItem.url)
        const isOnSubPath = pathname?.startsWith(item.url + "/") && pathname !== item.url
        
        if (isOnMainPage || isOnSubPage || isOnSubPath) {
          shouldBeOpen.push(item.title)
        }
      }
    })

    if (shouldBeOpen.length > 0) {
      setOpenItems((prev) => {
        const newItems = [...new Set([...prev, ...shouldBeOpen])]
        return newItems
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isItemActive = isActive(item.url)
            const isOpen = openItems.includes(item.title)

            if (hasSubItems) {
              return (
                <SidebarMenuItem key={item.title}>
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleItem(item.title)}
                  >
                    <div className="group/trigger relative flex items-center">
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isItemActive}
                        className="flex-1 pr-8"
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="absolute right-1 flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleItem(item.title)
                          }}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          <IconChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isItemActive}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
