"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ asChild, children, ...props }: CollapsiblePrimitive.Trigger.Props & { asChild?: boolean }) {
  const Comp = asChild ? Slot : CollapsiblePrimitive.Trigger
  return (
    <Comp data-slot="collapsible-trigger" {...props}>
      {children}
    </Comp>
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
