import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { SidebarTrigger } from "./ui/sidebar"

interface SiteHeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function SiteHeader({ title, description, actions }: SiteHeaderProps) {
  return (
    <header className="flex h-[var(--header-height,3rem)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height,3rem)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {title ? (
          <div className="flex flex-col">
            <h1 className="text-base font-medium">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        ) : (
          <h1 className="text-base font-medium">Dashboard</h1>
        )}
        {actions && (
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
