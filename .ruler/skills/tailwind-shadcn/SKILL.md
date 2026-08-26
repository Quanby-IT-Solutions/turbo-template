---
name: tailwind-shadcn
description: Tailwind CSS v4 and shadcn/ui component patterns for this monorepo. Use when styling components, adding shadcn UI components, configuring themes, or working with apps/web/ styling. Triggers on tasks involving CSS, classNames, dark mode, component library, Toaster, ThemeProvider, or responsive design.
frameworks:
  - tailwindcss
  - shadcn-ui
languages:
  - typescript
  - tsx
  - css
category: frontend
updated: 2026-08-15
---

# Tailwind CSS v4 + shadcn/ui Skill

## Quick Reference

**When to Use**: Styling components, adding shadcn UI elements, configuring themes, or any CSS work in `apps/web/`

**Scope**: Only applies to `apps/web/` — backend and mobile do not use Tailwind

**Versions**: Tailwind CSS 4.1 (PostCSS plugin), shadcn/ui with `components.json`

**Style**: `components.json` sets `"style": "base-nova"` — components are built on **`@base-ui/react`**, not Radix. Do not assume Radix primitives/props. `globals.css` imports both `tailwindcss` and `tw-animate-css` (`@import "tw-animate-css";`) for animation utilities.

## Setup

### PostCSS Config

```javascript
// apps/web/postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } }
```

### Global Styles Import

```tsx
// apps/web/app/layout.tsx
import "@/core/styles/globals.css"
```

### Theme Provider

```tsx
// Uses next-themes for dark mode
import { ThemeProvider } from "@/core/context/theme-provider"

<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

## Component Locations

| Type | Location | Import |
|------|----------|--------|
| shadcn base | `core/components/ui/` | `@/core/components/ui/button` |
| Shared components | `core/components/` | `@/core/components/sidebar/` |
| Feature components | `features/[name]/components/` | `@/features/todos/components/todo-card` |

### Adding a shadcn Component

```bash
pnpm dlx shadcn@latest add button   # Adds to core/components/ui/button.tsx
pnpm dlx shadcn@latest add card     # Adds to core/components/ui/card.tsx
```

Components are configured via `apps/web/components.json`.

## Tailwind Utility Rules

### Use `size-*` for Square Dimensions

```tsx
// ✅ GOOD — equal width and height
<div className="size-4" />
<div className="size-6" />
<Avatar className="size-10" />
<Loader className="size-4" />

// ❌ BAD — redundant when equal
<div className="w-4 h-4" />
<div className="w-6 h-6" />
```

Only use separate `w-*` and `h-*` when dimensions differ:

```tsx
// ✅ GOOD — different dimensions
<div className="w-full h-screen" />
<div className="w-64 h-48" />
```

### Responsive `size-*`

```tsx
// ✅ GOOD
<div className="size-4 md:size-6 lg:size-8" />

// ❌ BAD
<div className="w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8" />
```

## Common shadcn/ui Patterns

### Card with Header and Content

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"

export function TodoCard({ todo }: { todo: Todo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{todo.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => onComplete(todo.id)}>Complete</Button>
      </CardContent>
    </Card>
  )
}
```

### Form with TanStack Form + shadcn

```tsx
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Button } from "@/core/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/core/components/ui/select"

// Field pattern with validation
<form.Field name="title">
  {(field) => (
    <div className="space-y-2">
      <Label htmlFor={field.name}>Title</Label>
      <Input
        id={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors?.length > 0 && (
        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
      )}
    </div>
  )}
</form.Field>
```

### Toast Notifications

```tsx
// Setup in root layout
import { Toaster } from "@/core/components/ui/sonner"
<Toaster richColors closeButton />

// Usage in components
import { toast } from "sonner"
toast.success("Todo created!")
toast.error("Failed to create todo")
```

### Sidebar Navigation

```tsx
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from "@/core/components/ui/sidebar"
```

## Class Variance Authority (CVA)

For component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

## Icon Library

Icons come from two packages: the **data** icons from `@hugeicons/core-free-icons`, rendered through the **`HugeiconsIcon`** component from `@hugeicons/react`. There is no direct `<Home01Icon/>` component export — importing an icon component from `@hugeicons/react` does not work here.

```tsx
// ✅ GOOD — icon data + renderer component
import { Task01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

<HugeiconsIcon icon={Task01Icon} className="size-4" />
<HugeiconsIcon icon={Task01Icon} strokeWidth={2} />

// ❌ BAD — this API does not exist in this repo
import { Home01Icon } from "@hugeicons/react"
<Home01Icon className="size-4" />
```

Some components (e.g. `PageHeader`) take the icon **data** as a prop and render `HugeiconsIcon` internally: `<PageHeader icon={Task01Icon} … />`.

Dependencies: `@hugeicons/core-free-icons` (icon data) + `@hugeicons/react` (`HugeiconsIcon`). `components.json` sets `"iconLibrary": "hugeicons"`.

## Key Rules

1. **`size-*` over `w-* h-*`** when dimensions are equal
2. shadcn components live in `core/components/ui/`
3. Use `className` prop for all styling (no inline styles)
4. Use `cn()` utility for conditional classes: `cn("base", condition && "active")`
5. Use CSS variables for theme colors: `bg-primary`, `text-destructive`, etc.
6. Always mark interactive components with `"use client"` directive
