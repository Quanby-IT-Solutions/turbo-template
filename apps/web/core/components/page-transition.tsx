"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className={`page-transition ${isAnimating ? "page-enter" : "page-enter-active"}`}
    >
      {children}
    </div>
  )
}

