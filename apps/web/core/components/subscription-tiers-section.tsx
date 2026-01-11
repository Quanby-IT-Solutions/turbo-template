"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { IconBuilding, IconUser, IconUsers, IconCheck } from "@tabler/icons-react"
import { Badge } from "@/core/components/ui/badge"

type PublicTierSetting = {
  id: string
  tier: string
  entityType: "ORGANIZATION" | "DOCTOR" | "PATIENT"
  displayName: string
  description?: string | null
  maxDoctors?: number | null
  maxPatients?: number | null
  maxFaceScans?: number | null
}

interface SubscriptionTiersSectionProps {
  tierSettings: PublicTierSetting[]
}

export function SubscriptionTiersSection({ tierSettings }: SubscriptionTiersSectionProps) {
  const tiersByEntity: Record<"ORGANIZATION" | "DOCTOR" | "PATIENT", PublicTierSetting[]> = {
    ORGANIZATION: tierSettings.filter((tier) => tier.entityType === "ORGANIZATION"),
    DOCTOR: tierSettings.filter((tier) => tier.entityType === "DOCTOR"),
    PATIENT: tierSettings.filter((tier) => tier.entityType === "PATIENT"),
  }

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "FREE":
        return "secondary"
      case "BASIC":
        return "default"
      case "PREMIUM":
        return "default"
      case "ENTERPRISE":
        return "default"
      default:
        return "secondary"
    }
  }

  const getTierColorClasses = (tier: string) => {
    switch (tier) {
      case "FREE":
        return {
          border: "border-muted-foreground/20",
          badge: "bg-muted text-muted-foreground",
          accent: "bg-muted/30",
        }
      case "BASIC":
        return {
          border: "border-blue-200 dark:border-blue-800",
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
          accent: "bg-blue-50 dark:bg-blue-950/30",
        }
      case "PREMIUM":
        return {
          border: "border-purple-200 dark:border-purple-800",
          badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
          accent: "bg-purple-50 dark:bg-purple-950/30",
        }
      case "ENTERPRISE":
        return {
          border: "border-primary/50",
          badge: "bg-primary/10 text-primary",
          accent: "bg-primary/5",
        }
      default:
        return {
          border: "border-muted-foreground/20",
          badge: "bg-muted text-muted-foreground",
          accent: "bg-muted/30",
        }
    }
  }

  const sortTiers = (tiers: PublicTierSetting[]) => {
    const order = ["FREE", "BASIC", "PREMIUM", "ENTERPRISE", "T"]
    return [...tiers].sort((a, b) => {
      const aIndex = order.indexOf(a.tier) !== -1 ? order.indexOf(a.tier) : 999
      const bIndex = order.indexOf(b.tier) !== -1 ? order.indexOf(b.tier) : 999
      return aIndex - bIndex
    })
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "Unlimited"
    return value.toLocaleString()
  }

  if (tierSettings.length === 0) {
    return null
  }

  return (
    <section className="border-y bg-gradient-to-b from-background via-muted/20 to-background py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <IconCheck className="size-4" />
            Flexible Plans for Every Role
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-muted-foreground">
            Select the perfect subscription tier for your needs. From individual practitioners to large organizations, we have a plan that fits.
          </p>
        </div>

        <Tabs defaultValue="organization" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger
                value="organization"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6"
              >
                <IconBuilding className="size-4 mr-2" />
                Organizations
              </TabsTrigger>
              <TabsTrigger
                value="doctor"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6"
              >
                <IconUser className="size-4 mr-2" />
                Doctors
              </TabsTrigger>
              <TabsTrigger
                value="patient"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6"
              >
                <IconUsers className="size-4 mr-2" />
                Patients
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="organization" className="mt-8">
            {tiersByEntity.ORGANIZATION.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold mb-2">Organization Plans</h3>
                  <p className="text-muted-foreground">
                    Scale your clinic with configurable doctor capacity and comprehensive management tools
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
                  {sortTiers(tiersByEntity.ORGANIZATION).map((tier) => {
                    const colors = getTierColorClasses(tier.tier)
                    return (
                      <Card
                        key={tier.id}
                        className={`relative border-2 ${colors.border} hover:border-primary/50 transition-all hover:shadow-xl flex flex-col group overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}`} />
                        <CardHeader className="pb-4 pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge
                              className={`text-xs font-semibold uppercase ${colors.badge} border-0`}
                            >
                              {tier.tier}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{tier.displayName}</CardTitle>
                          <CardDescription className="text-sm min-h-12">
                            {tier.description || "Comprehensive organization management"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end space-y-4 pb-6">
                          <div className={`rounded-lg border-2 ${colors.accent} p-4`}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-foreground">
                                {formatNumber(tier.maxDoctors)}
                              </span>
                              <span className="text-sm text-muted-foreground">seats</span>
                            </div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                              Doctor Capacity
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No organization plans available at this time.
              </div>
            )}
          </TabsContent>

          <TabsContent value="doctor" className="mt-8">
            {tiersByEntity.DOCTOR.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold mb-2">Doctor Plans</h3>
                  <p className="text-muted-foreground">
                    Choose the plan that matches your patient panel size and face-scan usage requirements
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
                  {sortTiers(tiersByEntity.DOCTOR).map((tier) => {
                    const colors = getTierColorClasses(tier.tier)
                    return (
                      <Card
                        key={tier.id}
                        className={`relative border-2 ${colors.border} hover:border-primary/50 transition-all hover:shadow-xl flex flex-col group overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}`} />
                        <CardHeader className="pb-4 pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge
                              className={`text-xs font-semibold uppercase ${colors.badge} border-0`}
                            >
                              {tier.tier}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{tier.displayName}</CardTitle>
                          <CardDescription className="text-sm min-h-12">
                            {tier.description || "Flexible plan for medical practitioners"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end space-y-3 pb-6">
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-lg border-2 ${colors.accent} p-4`}>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-foreground">
                                  {formatNumber(tier.maxPatients)}
                                </span>
                              </div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                                Patients
                              </p>
                            </div>
                            <div className={`rounded-lg border-2 ${colors.accent} p-4`}>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-foreground">
                                  {formatNumber(tier.maxFaceScans)}
                                </span>
                              </div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                                Face Scans
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No doctor plans available at this time.
              </div>
            )}
          </TabsContent>

          <TabsContent value="patient" className="mt-8">
            {tiersByEntity.PATIENT.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold mb-2">Patient Plans</h3>
                  <p className="text-muted-foreground">
                    Empowering patients with self-check allowances and comprehensive wellness insights
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
                  {sortTiers(tiersByEntity.PATIENT).map((tier) => {
                    const colors = getTierColorClasses(tier.tier)
                    return (
                      <Card
                        key={tier.id}
                        className={`relative border-2 ${colors.border} hover:border-primary/50 transition-all hover:shadow-xl flex flex-col group overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}`} />
                        <CardHeader className="pb-4 pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge
                              className={`text-xs font-semibold uppercase ${colors.badge} border-0`}
                            >
                              {tier.tier}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{tier.displayName}</CardTitle>
                          <CardDescription className="text-sm min-h-12">
                            {tier.description || "Access to health monitoring tools"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end space-y-4 pb-6">
                          <div className={`rounded-lg border-2 ${colors.accent} p-4`}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-foreground">
                                {formatNumber(tier.maxFaceScans)}
                              </span>
                              <span className="text-sm text-muted-foreground">per month</span>
                            </div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                              Self-Check Scans
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No patient plans available at this time.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

