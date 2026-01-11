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
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import { organizationsApi, type Organization } from "@/features/organizations/api/organizations-api"
import { getUser } from "@/services/api/client"

interface RequestLabTestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newRequest?: any) => void
}

export function RequestLabTestModal({
  open,
  onOpenChange,
  onSuccess,
}: RequestLabTestModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    organizationId: "",
    doctorId: "",
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
      // Reset form when modal opens
      setFormData({
        organizationId: "",
        doctorId: "",
        roomId: "",
        priority: "NORMAL",
        requestedTests: "",
        instructions: "",
        note: "",
      })
      setDoctors([])
    }
  }, [open])

  useEffect(() => {
    if (formData.organizationId) {
      fetchDoctors(formData.organizationId)
    } else {
      setDoctors([])
      setFormData(prev => ({ ...prev, doctorId: "" }))
    }
  }, [formData.organizationId])

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

  const fetchDoctors = async (orgId: string) => {
    setIsLoadingDoctors(true)
    try {
      const response = await doctorsApi.listDoctors({ organizationId: orgId })
      if (response.success && response.data) {
        // The API returns DoctorListResponse with 'items' property
        const doctorsList = response.data.items || []
        setDoctors(Array.isArray(doctorsList) ? doctorsList : [])
      } else {
        setDoctors([])
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error)
      toast.error("Failed to load doctors")
      setDoctors([])
    } finally {
      setIsLoadingDoctors(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Frontend validation with clear error messages
    const validationErrors: string[] = []

    if (!user?.id) {
      toast.error("You must be logged in to request a lab test")
      return
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
        patientId: user.id,
        organizationId: formData.organizationId,
        doctorId: formData.doctorId && formData.doctorId.trim() !== '' 
          ? formData.doctorId 
          : undefined, // Send undefined if empty string (doctor is optional)
        roomId: formData.roomId && formData.roomId.trim() !== '' 
          ? formData.roomId 
          : undefined, // Send undefined if empty string
        priority: formData.priority,
        requestedTests: formData.requestedTests.trim(),
        instructions: formData.instructions?.trim() || undefined,
        note: formData.note?.trim() || undefined,
      })

      if (response.success) {
        toast.success("Lab request submitted successfully")
        // Reset form first
        setFormData({
          organizationId: "",
          doctorId: "",
          roomId: "",
          priority: "NORMAL",
          requestedTests: "",
          instructions: "",
          note: "",
        })
        // Close modal
        onOpenChange(false)
        // Pass the created request to the callback for optimistic update
        // The response.data contains the created lab request
        if (onSuccess && response.data) {
          // Add basic display names if available, otherwise will be fetched on refresh
          const newRequest = {
            ...response.data,
            doctorName: formData.doctorId ? "Loading..." : null, // Will be updated on refresh
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
        const errorMessage = response.message || "Failed to submit lab request"
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
      console.error("Error submitting lab request:", error)
      
      // Handle network errors or unexpected errors
      // Note: apiRequest handles HTTP errors and returns them in the response object
      // This catch block only handles network errors or exceptions
      if (error instanceof Error) {
        toast.error(`Network error: ${error.message}`)
      } else {
        toast.error("An unexpected error occurred. Please check your connection and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Request Lab Test</DialogTitle>
            <DialogDescription className="text-sm">
              Fill out the form below to request a new laboratory test.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="organization" className="text-sm">Clinic</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, organizationId: value, doctorId: "" }))}
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
              <Label htmlFor="doctor" className="text-sm">Doctor <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Select
                value={formData.doctorId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, doctorId: value }))}
                disabled={!formData.organizationId || isLoadingDoctors || !doctors || doctors.length === 0}
              >
                <SelectTrigger id="doctor" className="h-9">
                  <SelectValue 
                    placeholder={
                      isLoadingDoctors 
                        ? "Loading doctors..." 
                        : !formData.organizationId 
                        ? "Select clinic first" 
                        : doctors && doctors.length === 0
                        ? "No doctors available"
                        : "Select doctor (optional)"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDoctors ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : doctors && doctors.length > 0 ? (
                    doctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.doctorInfo?.firstName || ""} {doc.doctorInfo?.lastName || ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-doctors" disabled>No doctors available</SelectItem>
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
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

