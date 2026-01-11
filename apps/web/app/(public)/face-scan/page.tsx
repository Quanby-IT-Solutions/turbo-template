"use client"

import dynamic from "next/dynamic"

// Dynamically import FaceScanContent with SSR disabled since it uses browser-only APIs
const FaceScanContent = dynamic(
  () => import("@/core/components/face-scan-content").then((mod) => ({ default: mod.FaceScanContent })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading face scan...</p>
        </div>
      </div>
    )
  }
)

export default function FaceScanPage() {
  return <FaceScanContent />
}
