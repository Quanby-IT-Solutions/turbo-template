"use client"

import * as React from "react"
import { IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { useDoctorMutations, type UpdateDoctorRequest } from "@/features/admin/hooks/use-doctors"
import type { Doctor } from "@/services/api/types"

interface EditDoctorDialogProps {
  trigger: React.ReactElement
  doctor: Doctor
  onSuccess?: () => void
}

export function EditDoctorDialog({ trigger, doctor, onSuccess }: EditDoctorDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<UpdateDoctorRequest>({
    firstName: doctor.doctorInfo?.firstName || "",
    middleName: doctor.doctorInfo?.middleName || "",
    lastName: doctor.doctorInfo?.lastName || "",
    specialization: doctor.doctorInfo?.specialization || "",
    qualifications: doctor.doctorInfo?.qualifications || "",
    experience: doctor.doctorInfo?.experience || 0,
    contactNumber: doctor.doctorInfo?.contactNumber || "",
    address: "",
    bio: "",
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  const { updateDoctor, loading, error } = useDoctorMutations()

  // Update form data when doctor prop changes
  React.useEffect(() => {
    setFormData({
      firstName: doctor.doctorInfo?.firstName || "",
      middleName: doctor.doctorInfo?.middleName || "",
      lastName: doctor.doctorInfo?.lastName || "",
      specialization: doctor.doctorInfo?.specialization || "",
      qualifications: doctor.doctorInfo?.qualifications || "",
      experience: doctor.doctorInfo?.experience || 0,
      contactNumber: doctor.doctorInfo?.contactNumber || "",
      address: "",
      bio: "",
    })
  }, [doctor])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "experience" ? parseInt(value) || 0 : value,
    }))
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.firstName) {
      errors.firstName = "First name is required"
    }

    if (!formData.lastName) {
      errors.lastName = "Last name is required"
    }

    if (!formData.contactNumber) {
      errors.contactNumber = "Contact number is required"
    }

    if (!formData.specialization) {
      errors.specialization = "Specialization is required"
    }

    if (!formData.qualifications) {
      errors.qualifications = "Qualifications are required"
    }

    if (formData.experience !== undefined && formData.experience < 0) {
      errors.experience = "Experience must be a positive number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      await updateDoctor(doctor.id, formData)
      toast.success(`Doctor ${formData.firstName} ${formData.lastName} updated successfully!`)
      setFormErrors({})
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update doctor")
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset form errors when dialog closes
      setFormErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Doctor</DialogTitle>
          <DialogDescription>
            Update the doctor&apos;s information below. All required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={formErrors.firstName ? "border-destructive" : ""}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-destructive">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  name="middleName"
                  placeholder="David"
                  value={formData.middleName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={formErrors.lastName ? "border-destructive" : ""}
                />
                {formErrors.lastName && (
                  <p className="text-xs text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  placeholder="+63-917-123-4567"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className={formErrors.contactNumber ? "border-destructive" : ""}
                />
                {formErrors.contactNumber && (
                  <p className="text-xs text-destructive">{formErrors.contactNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="City, Province"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm border-b pb-2">Professional Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  placeholder="e.g., Cardiology, Pediatrics"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className={formErrors.specialization ? "border-destructive" : ""}
                />
                {formErrors.specialization && (
                  <p className="text-xs text-destructive">{formErrors.specialization}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience (years) *</Label>
                <Input
                  id="experience"
                  name="experience"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className={formErrors.experience ? "border-destructive" : ""}
                />
                {formErrors.experience && (
                  <p className="text-xs text-destructive">{formErrors.experience}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications *</Label>
              <Textarea
                id="qualifications"
                name="qualifications"
                placeholder="e.g., MD, Diplomate of Internal Medicine, Fellow of Cardiology"
                value={formData.qualifications}
                onChange={handleInputChange}
                rows={2}
                className={formErrors.qualifications ? "border-destructive" : ""}
              />
              {formErrors.qualifications && (
                <p className="text-xs text-destructive">{formErrors.qualifications}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Brief professional biography..."
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
