"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { toast } from "sonner"
import {
  IconUser,
  IconSearch,
  IconPlus,
  IconFileText,
  IconPill,
  IconStethoscope,
  IconFlask,
  IconCalendar,
  IconClock,
} from "@tabler/icons-react"
import { diagnosesApi, type Diagnosis } from "@/features/diagnoses/api/diagnoses-api"
import { prescriptionsApi, type Prescription } from "@/features/prescriptions/api/prescriptions-api"
import { labRequestsApi, type LabRequest } from "@/features/lab-requests/api/lab-requests-api"
import { patientsApi, type PatientInfo } from "@/features/patients/api/patients-api"
import { authApi } from "@/features/auth/api/auth-api"

interface PatientRecord {
  patient: PatientInfo
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
  labRequests: LabRequest[]
  lastVisit: string | null
}

export default function PatientRecordsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [patientRecords, setPatientRecords] = React.useState<PatientRecord[]>([])
  const [filteredRecords, setFilteredRecords] = React.useState<PatientRecord[]>([])
  const [currentDoctorId, setCurrentDoctorId] = React.useState<string | null>(null)

  // Fetch current doctor ID
  React.useEffect(() => {
    const fetchDoctorId = async () => {
      try {
        const response = await authApi.getProfile()
        if (response.success && response.data) {
          setCurrentDoctorId(response.data.id)
        }
      } catch (error) {
        console.error("Failed to fetch doctor profile:", error)
        toast.error("Failed to load doctor profile")
      }
    }
    fetchDoctorId()
  }, [])

  // Fetch all patient records
  React.useEffect(() => {
    const fetchPatientRecords = async () => {
      if (!currentDoctorId) return

      setLoading(true)
      try {
        // Fetch all diagnoses, prescriptions, and lab requests for this doctor
        const [diagnosesRes, prescriptionsRes, labRequestsRes] = await Promise.all([
          diagnosesApi.getDoctorDiagnoses(),
          prescriptionsApi.getDoctorPrescriptions(currentDoctorId),
          labRequestsApi.getDoctorLabRequests(currentDoctorId),
        ])

        const diagnoses = diagnosesRes.success && diagnosesRes.data ? diagnosesRes.data : []
        const prescriptions = prescriptionsRes.success && prescriptionsRes.data ? prescriptionsRes.data : []
        const labRequests = labRequestsRes.success && labRequestsRes.data ? labRequestsRes.data : []

        // Get unique patient IDs from all records
        const patientIds = new Set<string>()
        diagnoses.forEach((d) => patientIds.add(d.patientId))
        prescriptions.forEach((p) => patientIds.add(p.patientId))
        labRequests.forEach((l) => patientIds.add(l.patientId))

        // Fetch patient info for each unique patient
        const patientPromises = Array.from(patientIds).map((patientId) =>
          patientsApi.getPatientById(patientId)
        )
        const patientResults = await Promise.all(patientPromises)

        // Build patient records map
        const recordsMap = new Map<string, PatientRecord>()

        patientResults.forEach((result) => {
          if (result.success && result.data) {
            const patient = result.data
            recordsMap.set(patient.id, {
              patient,
              diagnoses: [],
              prescriptions: [],
              labRequests: [],
              lastVisit: null,
            })
          }
        })

        // Group records by patient
        diagnoses.forEach((diagnosis) => {
          const record = recordsMap.get(diagnosis.patientId)
          if (record) {
            record.diagnoses.push(diagnosis)
          }
        })

        prescriptions.forEach((prescription) => {
          const record = recordsMap.get(prescription.patientId)
          if (record) {
            record.prescriptions.push(prescription)
          }
        })

        labRequests.forEach((labRequest) => {
          const record = recordsMap.get(labRequest.patientId)
          if (record) {
            record.labRequests.push(labRequest)
          }
        })

        // Calculate last visit date for each patient
        recordsMap.forEach((record) => {
          const allDates: string[] = []
          record.diagnoses.forEach((d) => allDates.push(d.diagnosedAt))
          record.prescriptions.forEach((p) => allDates.push(p.prescribedAt))
          record.labRequests.forEach((l) => allDates.push(l.createdAt))
          
          if (allDates.length > 0) {
            const sortedDates = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            record.lastVisit = sortedDates[0]
          }
        })

        // Convert map to array and sort by last visit
        const records = Array.from(recordsMap.values()).sort((a, b) => {
          if (!a.lastVisit) return 1
          if (!b.lastVisit) return -1
          return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
        })

        setPatientRecords(records)
        setFilteredRecords(records)
      } catch (error) {
        console.error("Error fetching patient records:", error)
        toast.error("Failed to load patient records")
      } finally {
        setLoading(false)
      }
    }

    if (currentDoctorId) {
      fetchPatientRecords()
    }
  }, [currentDoctorId])

  // Filter records based on search query
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecords(patientRecords)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = patientRecords.filter((record) => {
      const patient = record.patient
      const firstName = patient.patientInfo?.firstName?.toLowerCase() || ""
      const lastName = patient.patientInfo?.lastName?.toLowerCase() || ""
      const email = patient.email?.toLowerCase() || ""
      const fullName = `${firstName} ${lastName}`.trim()

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        patient.id.toLowerCase().includes(query)
      )
    })

    setFilteredRecords(filtered)
  }, [searchQuery, patientRecords])

  const handleAddNewRecord = () => {
    router.push("/doctor/meet-patients")
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getAge = (dateOfBirth: string | null | undefined) => {
    if (!dateOfBirth) return "N/A"
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getPrimaryDiagnosis = (diagnoses: Diagnosis[]) => {
    const primary = diagnoses.find((d) => d.isPrimary && d.status === "ACTIVE")
    if (primary) return primary.diagnosisName
    const active = diagnoses.find((d) => d.status === "ACTIVE")
    return active?.diagnosisName || "No active diagnosis"
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
      <SidebarWrapper role="doctor" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Patient Records" 
          description="Access and manage patient medical records"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="relative w-64">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search patient records..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddNewRecord}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Add New Record
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">Loading patient records...</div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <IconUser className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      {patientRecords.length === 0
                        ? "No patient records found. Start a meeting to create records."
                        : "No patients match your search."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredRecords.map((record) => {
                      const patient = record.patient
                      const firstName = patient.patientInfo?.firstName || ""
                      const lastName = patient.patientInfo?.lastName || ""
                      const fullName = `${firstName} ${lastName}`.trim() || patient.email || "Unknown Patient"
                      const age = getAge(patient.patientInfo?.dateOfBirth)
                      const primaryDiagnosis = getPrimaryDiagnosis(record.diagnoses)
                      const totalRecords = record.diagnoses.length + record.prescriptions.length + record.labRequests.length

                      return (
                        <Card key={patient.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>{fullName}</CardTitle>
                                <CardDescription>
                                  Patient ID: {patient.id.substring(0, 8)}... • Age: {age} • Last Visit: {formatDate(record.lastVisit)}
                                </CardDescription>
                              </div>
                              <Badge variant={totalRecords > 0 ? "default" : "secondary"}>
                                {totalRecords} {totalRecords === 1 ? "Record" : "Records"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                  <IconStethoscope className="mr-2 inline h-4 w-4" />
                                  Diagnosis: {primaryDiagnosis}
                                </p>
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                  <span>
                                    <IconPill className="mr-1 inline h-4 w-4" />
                                    {record.prescriptions.length} Prescription{record.prescriptions.length !== 1 ? "s" : ""}
                                  </span>
                                  <span>
                                    <IconFlask className="mr-1 inline h-4 w-4" />
                                    {record.labRequests.length} Lab Request{record.labRequests.length !== 1 ? "s" : ""}
                                  </span>
                                  <span>
                                    <IconStethoscope className="mr-1 inline h-4 w-4" />
                                    {record.diagnoses.length} Diagnosis{record.diagnoses.length !== 1 ? "es" : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to detailed view or open modal
                                    toast.info("Viewing detailed records for " + fullName)
                                  }}
                                >
                                  <IconFileText className="mr-2 h-4 w-4" />
                                  View Records
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    router.push(`/doctor/meet-patients?patientId=${patient.id}`)
                                  }}
                                >
                                  <IconPlus className="mr-2 h-4 w-4" />
                                  New Consultation
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
