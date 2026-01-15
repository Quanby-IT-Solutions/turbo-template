"use client"

import * as React from "react"

/**
 * Detects if the user is on a mobile device (Android/iOS)
 * Based on BiosenseSignal SDK requirements:
 * - Officially supported on Android smartphones/tablets and iPhones/iPads
 * - Desktop browsers are not officially supported
 */
export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobileDevice = () => {
      if (typeof window === "undefined") return false

      const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera
      
      // Check for mobile device patterns
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      const isMobile = mobileRegex.test(userAgent.toLowerCase())

      // Also check for touch capability (helps with tablets)
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0

      // Consider it a mobile device if it matches mobile regex or has touch capability with small screen
      return isMobile || (hasTouchScreen && window.innerWidth < 1024)
    }

    setIsMobileDevice(checkMobileDevice())
  }, [])

  return !!isMobileDevice
}
