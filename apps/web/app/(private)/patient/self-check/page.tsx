"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { IconCopy, IconExternalLink, IconQrcode } from "@tabler/icons-react"
import { toast } from "sonner"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"

const QRCode = dynamic(
  () => import("react-qr-code").then((mod) => mod.default),
  { ssr: false }
)

const TARGET_URL = "https://demo-qhealth.vercel.app"

export default function PatientSelfCheckPage() {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(TARGET_URL)
      toast.success("Link copied to clipboard")
    } catch (error) {
      console.error("Failed to copy link", error)
      toast.error("Unable to copy the link right now")
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="patient" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Self Check"
          description="Scan the QR code on your phone to open the QHealth face scan experience."
        />

        <div className="flex flex-1 flex-col bg-muted/40">
          <div className="@container/main flex flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-8 lg:py-12">
              <div className="rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur md:p-8">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconQrcode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Self Check</p>
                      <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Scan to open QHealth face scan  
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground md:text-base">
                    Use your phone camera or any QR scanner to jump straight into the QHealth face scan experience.
                  </p>
                </div>

                <div className="mt-6 grid gap-8 md:grid-cols-[auto,1fr] md:items-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl border bg-background p-4 shadow-sm md:p-6">
                      <QRCode value={TARGET_URL} size={240} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Aim your camera at the code to open the link.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-4">
                    <Card className="border-dashed bg-muted/60">
                      <CardHeader className="gap-1">
                        <CardTitle className="text-base font-semibold">Direct link</CardTitle>
                        <CardDescription className="text-sm">
                          Prefer to tap? Open the face scan in a new tab or share it.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-background px-3 py-2 text-sm font-medium text-foreground break-all">
                          {TARGET_URL}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={handleCopyLink}
                          >
                            <IconCopy className="h-4 w-4" />
                            Copy link
                          </Button>
                          <Button asChild className="flex items-center gap-2">
                            <Link href={TARGET_URL} target="_blank" rel="noreferrer noopener">
                              <IconExternalLink className="h-4 w-4" />
                              Open link
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
