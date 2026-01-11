"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const [isAnimating, setIsAnimating] = useState(false)

	useEffect(() => {
		setIsAnimating(true)
		const timer = setTimeout(() => setIsAnimating(false), 500)
		return () => clearTimeout(timer)
	}, [pathname])

	return <div className={isAnimating ? "page-transition" : ""}>{children}</div>
}
