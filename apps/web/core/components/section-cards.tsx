"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "./ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"

interface MetricCard {
  title: string
  value: string
  description?: string
  trend?: {
    value: string
    direction: "up" | "down"
  }
  footer?: {
    label: string
    description?: string
  }
}

interface SectionCardsProps {
  cards?: MetricCard[]
}

export function SectionCards({ cards }: SectionCardsProps) {
  const defaultCards: MetricCard[] = [
    {
      title: "Total Revenue",
      value: "$1,250.00",
      trend: {
        value: "+12.5%",
        direction: "up",
      },
      footer: {
        label: "Trending up this month",
        description: "Visitors for the last 6 months",
      },
    },
    {
      title: "New Customers",
      value: "1,234",
      trend: {
        value: "-20%",
        direction: "down",
      },
      footer: {
        label: "Down 20% this period",
        description: "Acquisition needs attention",
      },
    },
    {
      title: "Active Accounts",
      value: "45,678",
      trend: {
        value: "+12.5%",
        direction: "up",
      },
      footer: {
        label: "Strong user retention",
        description: "Engagement exceed targets",
      },
    },
    {
      title: "Growth Rate",
      value: "4.5%",
      trend: {
        value: "+4.5%",
        direction: "up",
      },
      footer: {
        label: "Steady performance increase",
        description: "Meets growth projections",
      },
    },
  ]

  const cardsToRender = cards || defaultCards

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cardsToRender.map((card, index) => (
        <Card key={index} className="@container/card">
          <CardHeader>
            <CardDescription>{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            {card.trend && (
              <CardAction>
                <Badge variant="outline">
                  {card.trend.direction === "up" ? (
                    <IconTrendingUp />
                  ) : (
                    <IconTrendingDown />
                  )}
                  {card.trend.value}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          {card.footer && (
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.footer.label}
                {card.trend?.direction === "up" ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}
              </div>
              {card.footer.description && (
                <div className="text-muted-foreground">
                  {card.footer.description}
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
}
