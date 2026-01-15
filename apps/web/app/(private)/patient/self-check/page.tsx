"use client"

import dynamic from "next/dynamic"

const PatientSelfCheckClient = dynamic(
  () => import("./PatientSelfCheckClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground">
        Loading self check...
      </div>
    ),
  }
)

export default function PatientSelfCheckPage() {
  return <PatientSelfCheckClient />
}

