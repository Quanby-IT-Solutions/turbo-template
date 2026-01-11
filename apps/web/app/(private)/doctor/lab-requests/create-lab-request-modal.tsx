"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { Label } from "@/core/components/ui/label"
import { toast } from "sonner"
import { labRequestsApi, type Priority } from "@/features/lab-requests/api/lab-requests-api"
import { patientsApi } from "@/features/patients/api/patients-api"
import { organizationsApi, type Organization } from "@/features/organizations/api/organizations-api"
import { getUser } from "@/services/api/client"

interface CreateLabRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newRequest?: any) => void
}

export function CreateLabRequestModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateLabRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPatients, setIsLoadingPatients] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [patients, setPatients] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    patientId: "",
    organizationId: "",
    roomId: "",
    priority: "NORMAL" as Priority,
    requestedTests: "",
    instructions: "",
    note: "",
  })

  const user = getUser()

  useEffect(() => {
    if (open) {
      fetchOrganizations()
      fetchPatients()
      // Reset form when modal opens
      setFormData({
        patientId: "",
        organizationId: "",
        roomId: "",
        priority: "NORMAL",
        requestedTests: "",
        instructions: "",
        note: "",
      })
    }
  }, [open])

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsApi.getOrganizations(true)
      if (response.success && response.data) {
        setOrganizations(response.data || [])
      } else {
        setOrganizations([])
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
      toast.error("Failed to load organizations")
      setOrganizations([])
    }
  }

  const fetchPatients = async () => {
    setIsLoadingPatients(true)
    try {
      const response = await patientsApi.listPatients({ limit: 100 })
      if (response.success && response.data) {
        const patientsList = response.data.items || []
        setPatients(Array.isArray(patientsList) ? patientsList : [])
      } else {
        setPatients([])
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error)
      toast.error("Failed to load patients")
      setPatients([])
    } finally {
      setIsLoadingPatients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Frontend validation with clear error messages
    const validationErrors: string[] = []

    if (!user?.id) {
      toast.error("You must be logged in to create a lab request")
      return
    }

    if (!formData.patientId || formData.patientId.trim() === '') {
      validationErrors.push("Please select a patient")
    }

    if (!formData.organizationId || formData.organizationId.trim() === '') {
      validationErrors.push("Please select a clinic")
    }

    if (!formData.requestedTests || formData.requestedTests.trim() === '') {
      validationErrors.push("Requested tests field is required")
    }

    // Validate priority
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
    if (!validPriorities.includes(formData.priority)) {
      validationErrors.push("Invalid priority selected")
    }

    // Show validation errors if any
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error)
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await labRequestsApi.createLabRequest({
        patientId: formData.patientId,
        organizationId: formData.organizationId,
        doctorId: user.id, // Auto-set from logged-in doctor
        roomId: formData.roomId && formData.roomId.trim() !== '' 
          ? formData.roomId 
          : undefined,
        priority: formData.priority,
        requestedTests: formData.requestedTests.trim(),
        instructions: formData.instructions?.trim() || undefined,
        note: formData.note?.trim() || undefined,
      })

      if (response.success) {
        toast.success("Lab request created successfully")
        // Reset form first
        setFormData({
          patientId: "",
          organizationId: "",
          roomId: "",
          priority: "NORMAL",
          requestedTests: "",
          instructions: "",
          note: "",
        })
        // Close modal
        onOpenChange(false)
        // Pass the created request to the callback for optimistic update
        if (onSuccess && response.data) {
          // Add basic display names if available, otherwise will be fetched on refresh
          const newRequest = {
            ...response.data,
            patientName: "Loading...", // Will be updated on refresh
            organizationName: "Loading..." // Will be updated on refresh
          }
          onSuccess(newRequest)
        } else if (onSuccess) {
          // If no data, still call onSuccess to trigger refresh
          setTimeout(() => {
            onSuccess()
          }, 500)
        }
      } else {
        // Handle backend validation errors
        const errorMessage = response.message || "Failed to create lab request"
        const errors = (response as any).errors || []
        
        if (errors.length > 0) {
          // Show each validation error
          errors.forEach((err: string) => {
            toast.error(err)
          })
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error: any) {
      console.error("Error creating lab request:", error)
      
      // Handle network errors or unexpected errors
      if (error instanceof Error) {
        toast.error(`Network error: ${error.message}`)
      } else {
        toast.error("An unexpected error occurred. Please check your connection and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getPatientDisplayName = (patient: any) => {
    if (patient.patientInfo) {
      const { firstName, middleName, lastName } = patient.patientInfo
      const name = [firstName, middleName, lastName].filter(Boolean).join(" ")
      return name || patient.email || patient.id
    }
    return patient.email || patient.id
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Create Lab Request</DialogTitle>
            <DialogDescription className="text-sm">
              Fill out the form below to create a new laboratory test request for a patient.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="patient" className="text-sm">Patient</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}
                required
                disabled={isLoadingPatients}
              >
                <SelectTrigger id="patient" className="h-9">
                  <SelectValue 
                    placeholder={
                      isLoadingPatients 
                        ? "Loading patients..." 
                        : "Select patient"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingPatients ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {getPatientDisplayName(patient)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-patients" disabled>No patients available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="organization" className="text-sm">Clinic</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, organizationId: value }))}
                required
              >
                <SelectTrigger id="organization" className="h-9">
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {organizations && organizations.length > 0 ? (
                    organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-orgs" disabled>No clinics available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="roomId" className="text-sm">Room ID <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input
                id="roomId"
                placeholder="Enter room ID if requesting during a consultation"
                value={formData.roomId}
                onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground -mt-0.5">
                Only fill this if you are currently in a consultation meeting
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="priority" className="text-sm">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger id="priority" className="h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="requestedTests" className="text-sm">Requested Tests</Label>
              <Textarea
                id="requestedTests"
                placeholder="e.g., Complete Blood Count, Lipid Panel"
                value={formData.requestedTests}
                onChange={(e) => setFormData(prev => ({ ...prev, requestedTests: e.target.value }))}
                required
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="instructions" className="text-sm">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Any special instructions for the lab..."
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="note" className="text-sm">Additional Notes</Label>
              <Textarea
                id="note"
                placeholder="Add any additional notes here..."
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="h-9">
              {isLoading ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

