"use client"

import * as React from "react"
import {
  IconUser,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconPlus,
  IconAlertTriangle,
  IconPill,
  IconCalendarEvent,
  IconStethoscope,
  IconClock,
  IconHeart,
  IconFileText,
  IconTrendingUp,
  IconMinus,
  IconEye,
  IconCopy,
  IconVideo,
  IconFilter,
  IconArrowsSort,
  IconFolder,
  IconNotes,
  IconLock,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Label } from "@/core/components/ui/label"
import { Button } from "@/core/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { toast } from "sonner"

export default function MedicalRecordsPage() {
  const [selectedMetric, setSelectedMetric] = React.useState("heart-rate")

  const copyConsultationCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Consultation code copied to clipboard")
  }

  // Sample chart data for heart rate
  const heartRateData = [
    { date: "Jan 15", value: 72 },
    { date: "Jan 20", value: 68 },
    { date: "Jan 28", value: 75 },
    { date: "Oct 16", value: 70 },
    { date: "Oct 17", value: 73 },
    { date: "Oct 21", value: 69 },
    { date: "Oct 28", value: 71 },
  ]

  const chartConfig = {
    heartRate: {
      label: "Heart Rate",
      color: "#3b82f6", // Blue color for better visibility
    },
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
          title="Medical Records" 
          description="Your complete health history and medical information"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Patient Summary Card */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                        <IconUser className="h-16 w-16 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">Emily Anderson</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          33 years old • FEMALE
                        </p>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">
                            PATIENT ID
                          </Label>
                          <p className="text-sm font-mono">359b5a6a-247b-46c8-8e5e-638c2f0c06f6</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-1">165</p>
                        <p className="text-sm text-muted-foreground">cm</p>
                        <p className="text-xs text-muted-foreground mt-2">Height</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-1">65.5</p>
                        <p className="text-sm text-muted-foreground">kg</p>
                        <p className="text-xs text-muted-foreground mt-2">Weight</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-1">24.1</p>
                        <p className="text-sm text-muted-foreground">BMI</p>
                        <p className="text-xs text-muted-foreground mt-2">Normal weight</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-1">A+</p>
                        <p className="text-sm text-muted-foreground">Blood Type</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact and Medical Information Row */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <IconPhone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">+1-555-0201</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconMapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">321 Patient St, Health Town, HT 22222</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconCalendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">March 18, 1992</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <IconPlus className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">No significant medical history</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">Penicillin</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconPill className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">None</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <IconCalendarEvent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">30</p>
                          <p className="text-xs text-muted-foreground">TOTAL CONSULTATIONS</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <IconStethoscope className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">13</p>
                          <p className="text-xs text-muted-foreground">HEALTH SCANS</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <IconClock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-bold">November 19, 2025</p>
                          <p className="text-xs text-muted-foreground">LAST CONSULTATION</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <IconHeart className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-bold">Invalid Date</p>
                          <p className="text-xs text-muted-foreground">LAST HEALTH SCAN</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <IconFileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">10</p>
                          <p className="text-xs text-muted-foreground">MEDICAL RECORDS</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs Section */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="health-trends">Health Trends</TabsTrigger>
                    <TabsTrigger value="consultations">Consultations</TabsTrigger>
                    <TabsTrigger value="self-check">Self Check History</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Personal Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              NAME
                            </Label>
                            <p className="text-sm">Emily Anderson</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              GENDER
                            </Label>
                            <p className="text-sm">FEMALE</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              DATE OF BIRTH
                            </Label>
                            <p className="text-sm">March 18, 1992</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              BLOOD TYPE
                            </Label>
                            <p className="text-sm">A+</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              HEIGHT
                            </Label>
                            <p className="text-sm">165 cm</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              WEIGHT
                            </Label>
                            <p className="text-sm">65.5 kg</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              BMI
                            </Label>
                            <p className="text-sm">24.1 (Normal weight)</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Medical History */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Medical History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              MEDICAL HISTORY
                            </Label>
                            <p className="text-sm">No significant medical history</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              ALLERGIES
                            </Label>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                              Penicillin
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              CURRENT MEDICATIONS
                            </Label>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                              None
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Emergency Contact */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Emergency Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              NAME
                            </Label>
                            <p className="text-sm">Robert Anderson</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              RELATIONSHIP
                            </Label>
                            <p className="text-sm">Father</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              PHONE
                            </Label>
                            <p className="text-sm">+1-555-0301</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              ADDRESS
                            </Label>
                            <p className="text-sm">321 Patient St, Health Town, HT 22222</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Insurance Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Insurance Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              PROVIDER
                            </Label>
                            <p className="text-sm">HealthFirst Insurance</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              CONTACT
                            </Label>
                            <p className="text-sm">+1-800-HEALTH1</p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              POLICY NUMBER
                            </Label>
                            <p className="text-sm">HF-001-2024-001</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Health Trends Tab */}
                  <TabsContent value="health-trends" className="space-y-6">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
                      {/* Heart Rate */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Heart Rate</p>
                              <IconTrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">+6.9%</p>
                              <p className="text-xs text-muted-foreground">bpm</p>
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                              Improving
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Blood Pressure */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Blood Pressure</p>
                              <IconMinus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">-5%</p>
                              <p className="text-xs text-muted-foreground">mmHg</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                              Stable
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* SpO2 */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">SpO2</p>
                              <IconMinus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">-1%</p>
                              <p className="text-xs text-muted-foreground">%</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                              Stable
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Weight */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Weight</p>
                              <IconTrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">+6.9%</p>
                              <p className="text-xs text-muted-foreground">kg</p>
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                              Improving
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stress Level */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Stress Level</p>
                              <IconMinus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">-4.8%</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                              Stable
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* General Wellness */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">General Wellness</p>
                              <IconMinus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">+4.5%</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                              Stable
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chart Section */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Heart Rate Trend</CardTitle>
                            <CardDescription className="mt-1">Heart Rate Over Time</CardDescription>
                          </div>
                          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Metric" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="heart-rate">Heart Rate</SelectItem>
                              <SelectItem value="blood-pressure">Blood Pressure</SelectItem>
                              <SelectItem value="spo2">SpO2</SelectItem>
                              <SelectItem value="weight">Weight</SelectItem>
                              <SelectItem value="stress">Stress Level</SelectItem>
                              <SelectItem value="wellness">General Wellness</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-center">
                          <div className="w-full max-w-4xl">
                            <ChartContainer config={chartConfig} className="h-[400px]">
                              <LineChart data={heartRateData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 12 }}
                                  tickLine={false}
                                />
                                <YAxis 
                                  tick={{ fontSize: 12 }}
                                  tickLine={false}
                                  domain={[60, 80]}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#3b82f6" 
                                  strokeWidth={3}
                                  dot={{ r: 5, fill: "#3b82f6" }}
                                  activeDot={{ r: 7, fill: "#2563eb" }}
                                />
                              </LineChart>
                            </ChartContainer>
                            <div className="flex justify-center mt-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                                <span className="text-sm text-muted-foreground">Heart Rate (bpm)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Consultations Tab */}
                  <TabsContent value="consultations" className="space-y-6">
                    {/* Header Banner */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold mb-2">Your Consultations</h2>
                            <p className="text-sm text-muted-foreground">30 consultations found</p>
                          </div>
                          <div className="flex gap-3">
                            <Button variant="outline" size="sm">
                              <IconFilter className="h-4 w-4 mr-2" />
                              Filter
                            </Button>
                            <Button variant="outline" size="sm">
                              <IconArrowsSort className="h-4 w-4 mr-2" />
                              Sort
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Consultation Cards */}
                    <div className="space-y-4">
                      {/* Consultation Card 1 */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="flex flex-col items-center min-w-[80px]">
                                <p className="text-sm font-semibold">November 19, 2025</p>
                                <p className="text-lg font-bold">08:00 AM</p>
                                <p className="text-xs text-muted-foreground">WED</p>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <IconUser className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">Dr. Michael Williams</h3>
                                    <p className="text-sm text-muted-foreground">Stroke Neurology & Neurocritical Care</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                  <IconFolder className="h-4 w-4" />
                                  <span className="font-mono">QH1906WUZ</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="default" size="sm">
                                    <IconEye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => copyConsultationCode("QH1906WUZ")}>
                                    <IconCopy className="h-4 w-4 mr-2" />
                                    Copy Code
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <IconVideo className="h-4 w-4 mr-2" />
                                    Join Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 ml-4">
                              IN PROGRESS
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Consultation Card 2 */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="flex flex-col items-center min-w-[80px]">
                                <p className="text-sm font-semibold">November 19, 2025</p>
                                <p className="text-lg font-bold">08:00 AM</p>
                                <p className="text-xs text-muted-foreground">WED</p>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <IconUser className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">Dr. Michael Williams</h3>
                                    <p className="text-sm text-muted-foreground">Stroke Neurology & Neurocritical Care</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                  <IconFolder className="h-4 w-4" />
                                  <span className="font-mono">QH19066NE</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
                                    <IconEye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-600 hover:bg-yellow-50" onClick={() => copyConsultationCode("QH19066NE")}>
                                    <IconCopy className="h-4 w-4 mr-2" />
                                    Copy Code
                                  </Button>
                                  <Button variant="outline" size="sm" className="border-red-500 text-red-600 hover:bg-red-50">
                                    <IconVideo className="h-4 w-4 mr-2" />
                                    Join Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 ml-4">
                              IN PROGRESS
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Self Check History Tab */}
                  <TabsContent value="self-check" className="space-y-4">
                    {/* Self Check Entry 1 */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <IconNotes className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">Consultation Notes</h3>
                              <p className="text-sm text-muted-foreground mb-3">Self-Check Health Scan Results</p>
                              <p className="text-sm text-muted-foreground mb-2">
                                Self-check health scan performed on 10/28/2025. Results include: (16 health metrics measured)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created by: patient.anderson@email.com
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                              <IconLock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                            <p className="text-sm text-muted-foreground">October 28, 2025</p>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Self Check Entry 2 */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <IconNotes className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">Consultation Notes</h3>
                              <p className="text-sm text-muted-foreground mb-3">Self-Check Health Scan Results</p>
                              <p className="text-sm text-muted-foreground mb-2">
                                Self-check health scan performed on 10/28/2025. Results include: (16 health metrics measured)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created by: patient.anderson@email.com
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                              <IconLock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                            <p className="text-sm text-muted-foreground">October 28, 2025</p>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Self Check Entry 3 */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <IconNotes className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">Consultation Notes</h3>
                              <p className="text-sm text-muted-foreground mb-3">Self-Check Health Scan Results</p>
                              <p className="text-sm text-muted-foreground mb-2">
                                Self-check health scan performed on 10/21/2025. Results include: (16 health metrics measured)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created by: patient.anderson@email.com
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                              <IconLock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                            <p className="text-sm text-muted-foreground">October 21, 2025</p>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

