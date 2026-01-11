"use client"

import * as React from "react"
import { IconUser, IconEdit, IconFileText, IconUpload, IconX, IconCheck } from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Label } from "@/core/components/ui/label"
import { Badge } from "@/core/components/ui/badge"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { authApi } from "@/features/auth/api/auth-api"
import { patientsApi } from "@/features/patients/api/patients-api"
import { toast } from "sonner"
import type { User } from "@/services/api/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"

interface PatientInfoType {
  firstName?: string
  middleName?: string
  lastName?: string
  gender?: string
  dateOfBirth?: string | Date
  contactNumber?: string
  address?: string
  weight?: number
  height?: number
  bloodType?: string
  medicalHistory?: string
  allergies?: string
  medications?: string
  philHealthId?: string
  philHealthStatus?: string
  philHealthCategory?: string
  philHealthExpiry?: string | Date
  philHealthMemberSince?: string | Date
  philHealthIdImage?: string | null
  philHealthIdVerified?: boolean
  verificationStatus?: string
  verificationRejectionReason?: string
}

export default function ProfilePage() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isEditing, setIsEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  // Form state
  const [firstName, setFirstName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [dateOfBirth, setDateOfBirth] = React.useState("")
  const [contactNumber, setContactNumber] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [weight, setWeight] = React.useState("")
  const [height, setHeight] = React.useState("")
  const [bloodType, setBloodType] = React.useState("")
  const [medicalHistory, setMedicalHistory] = React.useState("")
  const [allergies, setAllergies] = React.useState("")
  const [medications, setMedications] = React.useState("")
  const [philHealthId, setPhilHealthId] = React.useState("")
  const [philHealthStatus, setPhilHealthStatus] = React.useState("")
  const [philHealthCategory, setPhilHealthCategory] = React.useState("")
  const [philHealthExpiry, setPhilHealthExpiry] = React.useState("")
  const [philHealthMemberSince, setPhilHealthMemberSince] = React.useState("")
  const [philHealthIdImage, setPhilHealthIdImage] = React.useState<string | null>(null)
  const [philHealthIdImageFile, setPhilHealthIdImageFile] = React.useState<File | null>(null)
  const [profilePicture, setProfilePicture] = React.useState<string | null>(null)
  const [profilePictureFile, setProfilePictureFile] = React.useState<File | null>(null)
  const [viewImageDialogOpen, setViewImageDialogOpen] = React.useState(false)

  // Fetch user profile
  React.useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await authApi.getProfile()
      if (response.success && response.data) {
        setUser(response.data)
        const patientInfo = response.data.patientInfo as PatientInfoType | undefined
        
        // Set profile picture from user data
        if (response.data.profilePicture) {
          setProfilePicture(response.data.profilePicture as string)
        }
        setProfilePictureFile(null)
        
        if (patientInfo) {
          setFirstName(patientInfo.firstName || "")
          setMiddleName(patientInfo.middleName || "")
          setLastName(patientInfo.lastName || "")
          setGender(patientInfo.gender || "")
          setDateOfBirth(patientInfo.dateOfBirth ? new Date(patientInfo.dateOfBirth).toISOString().split('T')[0] : "")
          setContactNumber(patientInfo.contactNumber || "")
          setAddress(patientInfo.address || "")
          setWeight(patientInfo.weight?.toString() || "")
          setHeight(patientInfo.height?.toString() || "")
          setBloodType(patientInfo.bloodType || "")
          setMedicalHistory(patientInfo.medicalHistory || "")
          setAllergies(patientInfo.allergies || "")
          setMedications(patientInfo.medications || "")
          setPhilHealthId(patientInfo.philHealthId || "")
          setPhilHealthStatus(patientInfo.philHealthStatus || "")
          setPhilHealthCategory(patientInfo.philHealthCategory || "")
          setPhilHealthExpiry(patientInfo.philHealthExpiry ? new Date(patientInfo.philHealthExpiry).toISOString().split('T')[0] : "")
          setPhilHealthMemberSince(patientInfo.philHealthMemberSince ? new Date(patientInfo.philHealthMemberSince).toISOString().split('T')[0] : "")
          // Update image state from server response - ensure it's a valid string
          if (patientInfo.philHealthIdImage !== undefined) {
            const imageValue = patientInfo.philHealthIdImage
            // Validate that it's a string and starts with data: or is null
            if (imageValue && typeof imageValue === 'string' && (imageValue.startsWith('data:') || imageValue.startsWith('data:image'))) {
              setPhilHealthIdImage(imageValue)
            } else if (imageValue === null || imageValue === '') {
              setPhilHealthIdImage(null)
            } else {
              // If it's an object or invalid, log and set to null
              console.warn('Invalid philHealthIdImage format:', typeof imageValue, imageValue)
              setPhilHealthIdImage(null)
            }
          }
          setPhilHealthIdImageFile(null) // Clear the file reference after save
        }
      } else {
        toast.error(response.message || "Failed to fetch profile")
      }
    } catch (error) {
      toast.error("An error occurred while fetching profile")
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'philhealth' | 'profile') => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File size must be less than 5MB")
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        if (type === 'philhealth') {
          setPhilHealthIdImage(base64String)
          setPhilHealthIdImageFile(file)
        } else {
          setProfilePicture(base64String)
          setProfilePictureFile(file)
        }
        toast.success("Image uploaded successfully")
      }
      reader.onerror = () => {
        toast.error("Failed to read file")
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("Failed to upload image")
      console.error("Error uploading image:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {}
      if (firstName.trim()) updateData.firstName = firstName.trim()
      if (middleName.trim()) updateData.middleName = middleName.trim()
      if (lastName.trim()) updateData.lastName = lastName.trim()
      if (gender) updateData.gender = gender
      if (dateOfBirth) updateData.dateOfBirth = dateOfBirth
      if (contactNumber.trim()) updateData.contactNumber = contactNumber.trim()
      if (address.trim()) updateData.address = address.trim()
      if (weight) updateData.weight = parseFloat(weight)
      if (height) updateData.height = parseFloat(height)
      if (bloodType) updateData.bloodType = bloodType
      if (medicalHistory.trim()) updateData.medicalHistory = medicalHistory.trim()
      if (allergies.trim()) updateData.allergies = allergies.trim()
      if (medications.trim()) updateData.medications = medications.trim()
      if (philHealthId.trim()) updateData.philHealthId = philHealthId.trim()
      if (philHealthStatus) updateData.philHealthStatus = philHealthStatus
      if (philHealthCategory) updateData.philHealthCategory = philHealthCategory
      if (philHealthExpiry) updateData.philHealthExpiry = philHealthExpiry
      if (philHealthMemberSince) updateData.philHealthMemberSince = philHealthMemberSince
      
      // Include profile picture if it exists
      if (profilePicture !== null && profilePicture !== undefined) {
        updateData.profilePicture = profilePicture || null
      }
      
      // Always include image if it exists (even if empty string, send null to clear it)
      if (philHealthIdImage !== null && philHealthIdImage !== undefined) {
        updateData.philHealthIdImage = philHealthIdImage || null
      }
      
      const response = await patientsApi.updatePatient(user.id, updateData)
      if (response.success) {
        toast.success("Profile updated successfully")
        setIsEditing(false)
        
        // Update user state with response data if available
        if (response.data) {
          const updatedData = response.data as any
          if (updatedData.patientInfo) {
            // Update PhilHealth ID image from response - validate it's a string
            if (updatedData.patientInfo.philHealthIdImage !== undefined) {
              const imageValue = updatedData.patientInfo.philHealthIdImage
              if (imageValue && typeof imageValue === 'string' && (imageValue.startsWith('data:') || imageValue.startsWith('data:image'))) {
                setPhilHealthIdImage(imageValue)
              } else if (imageValue === null || imageValue === '') {
                setPhilHealthIdImage(null)
              } else {
                console.warn('Invalid philHealthIdImage in response:', typeof imageValue)
                setPhilHealthIdImage(null)
              }
            }
          }
          if (updatedData.profilePicture !== undefined) {
            const profilePicValue = updatedData.profilePicture
            if (profilePicValue && typeof profilePicValue === 'string' && (profilePicValue.startsWith('data:') || profilePicValue.startsWith('data:image'))) {
              setProfilePicture(profilePicValue)
            } else if (profilePicValue === null || profilePicValue === '') {
              setProfilePicture(null)
            } else {
              console.warn('Invalid profilePicture in response:', typeof profilePicValue)
              setProfilePicture(null)
            }
          }
          // Update user object
          if (updatedData) {
            setUser((prev) => prev ? { ...prev, ...updatedData } : null)
          }
        }
        
        // Refresh profile data to ensure everything is in sync
        await fetchProfile()
        
        // Clear file references after successful save
        setPhilHealthIdImageFile(null)
        setProfilePictureFile(null)
      } else {
        toast.error(response.message || "Failed to update profile")
      }
    } catch (error) {
      toast.error("An error occurred while updating profile")
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (user) {
      // Reset profile picture
      setProfilePicture(user.profilePicture as string | null || null)
      setProfilePictureFile(null)
      
      if (user.patientInfo) {
        const patientInfo = user.patientInfo as PatientInfoType
        setFirstName(patientInfo.firstName || "")
        setMiddleName(patientInfo.middleName || "")
        setLastName(patientInfo.lastName || "")
        setGender(patientInfo.gender || "")
        setDateOfBirth(patientInfo.dateOfBirth ? new Date(patientInfo.dateOfBirth).toISOString().split('T')[0] : "")
        setContactNumber(patientInfo.contactNumber || "")
        setAddress(patientInfo.address || "")
        setWeight(patientInfo.weight?.toString() || "")
        setHeight(patientInfo.height?.toString() || "")
        setBloodType(patientInfo.bloodType || "")
        setMedicalHistory(patientInfo.medicalHistory || "")
        setAllergies(patientInfo.allergies || "")
        setMedications(patientInfo.medications || "")
        setPhilHealthId(patientInfo.philHealthId || "")
        setPhilHealthStatus(patientInfo.philHealthStatus || "")
        setPhilHealthCategory(patientInfo.philHealthCategory || "")
        setPhilHealthExpiry(patientInfo.philHealthExpiry ? new Date(patientInfo.philHealthExpiry).toISOString().split('T')[0] : "")
        setPhilHealthMemberSince(patientInfo.philHealthMemberSince ? new Date(patientInfo.philHealthMemberSince).toISOString().split('T')[0] : "")
        setPhilHealthIdImage(patientInfo.philHealthIdImage || null)
        setPhilHealthIdImageFile(null)
      }
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null
    
    switch (status.toUpperCase()) {
      case 'VERIFIED':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            VERIFIED
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            PENDING
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
            REJECTED
          </Badge>
        )
      case 'NOT_VERIFIED':
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
            NOT VERIFIED
          </Badge>
        )
    }
  }

  if (loading) {
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
            title="My Profile" 
            description="Manage your personal information"
          />
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const patientInfo = user?.patientInfo as PatientInfoType | undefined
  const fullName = patientInfo 
    ? `${patientInfo.firstName || ""} ${patientInfo.middleName || ""} ${patientInfo.lastName || ""}`.trim()
    : "Patient"
  const age = patientInfo?.dateOfBirth 
    ? Math.floor((new Date().getTime() - new Date(patientInfo.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

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
          title="My Profile" 
          description="Manage your personal information"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header with Edit Profile button */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">My Profile</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage your personal information
                    </p>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      <IconEdit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleCancel} disabled={saving}>
                        <IconX className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <IconCheck className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Personal Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted overflow-hidden">
                          {profilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={profilePicture} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <IconUser className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        {isEditing && (
                          <label htmlFor="profile-picture-upload" className="absolute bottom-0 right-0 cursor-pointer">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                              <IconUpload className="h-4 w-4" />
                            </div>
                            <input
                              id="profile-picture-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleFileUpload(file, 'profile')
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{fullName}</h3>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        {isEditing && profilePictureFile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {profilePictureFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          FIRST NAME
                        </Label>
                        {isEditing ? (
                          <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.firstName || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          MIDDLE NAME
                        </Label>
                        {isEditing ? (
                          <Input
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                            placeholder="Middle name"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.middleName || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          LAST NAME
                        </Label>
                        {isEditing ? (
                          <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.lastName || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          EMAIL
                        </Label>
                        <p className="text-sm">{user?.email || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PHONE
                        </Label>
                        {isEditing ? (
                          <Input
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            placeholder="Contact number"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.contactNumber || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          DATE OF BIRTH
                        </Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                          />
                        ) : (
                          <p className="text-sm">
                            {patientInfo?.dateOfBirth 
                              ? `${new Date(patientInfo.dateOfBirth).toLocaleDateString()}${age ? ` (${age} years old)` : ""}`
                              : "—"}
                          </p>
                        )}
                      </div>
                      {isEditing && (
                        <>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              GENDER
                            </Label>
                            <Select value={gender} onValueChange={setGender}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              ADDRESS
                            </Label>
                            <Input
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Address"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              WEIGHT (kg)
                            </Label>
                            <Input
                              type="number"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              placeholder="Weight"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              HEIGHT (cm)
                            </Label>
                            <Input
                              type="number"
                              value={height}
                              onChange={(e) => setHeight(e.target.value)}
                              placeholder="Height"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              BLOOD TYPE
                            </Label>
                            <Select value={bloodType} onValueChange={setBloodType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select blood type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* PhilHealth Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>PhilHealth Information</CardTitle>
                    <CardDescription>Your PhilHealth membership details and identification</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PHILHEALTH ID
                        </Label>
                        {isEditing ? (
                          <Input
                            value={philHealthId}
                            onChange={(e) => setPhilHealthId(e.target.value)}
                            placeholder="PhilHealth ID"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.philHealthId || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          STATUS
                        </Label>
                        {isEditing ? (
                          <Input
                            value={philHealthStatus}
                            onChange={(e) => setPhilHealthStatus(e.target.value)}
                            placeholder="Status"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.philHealthStatus || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          CATEGORY
                        </Label>
                        {isEditing ? (
                          <Input
                            value={philHealthCategory}
                            onChange={(e) => setPhilHealthCategory(e.target.value)}
                            placeholder="Category"
                          />
                        ) : (
                          <p className="text-sm">{patientInfo?.philHealthCategory || "—"}</p>
                        )}
                      </div>
                      {isEditing && (
                        <>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              MEMBER SINCE
                            </Label>
                            <Input
                              type="date"
                              value={philHealthMemberSince}
                              onChange={(e) => setPhilHealthMemberSince(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              EXPIRY DATE
                            </Label>
                            <Input
                              type="date"
                              value={philHealthExpiry}
                              onChange={(e) => setPhilHealthExpiry(e.target.value)}
                            />
                          </div>
                        </>
                      )}
                      {!isEditing && (
                        <>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              MEMBER SINCE
                            </Label>
                            <p className="text-sm">
                              {patientInfo?.philHealthMemberSince 
                                ? new Date(patientInfo.philHealthMemberSince).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                              EXPIRY DATE
                            </Label>
                            <p className="text-sm">
                              {patientInfo?.philHealthExpiry 
                                ? new Date(patientInfo.philHealthExpiry).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="border-t pt-6">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground mb-4 block">
                        PHILHEALTH ID DOCUMENT
                      </Label>
                      <div className="flex items-center gap-4">
                        <div 
                          className={`flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden ${
                            !isEditing && philHealthIdImage ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                          }`}
                          onClick={() => {
                            if (!isEditing && philHealthIdImage) {
                              setViewImageDialogOpen(true)
                            }
                          }}
                        >
                          {philHealthIdImage && typeof philHealthIdImage === 'string' && philHealthIdImage.startsWith('data:') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={philHealthIdImage} 
                              alt="PhilHealth ID" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load PhilHealth ID image:', e)
                                // Reset to null if image fails to load
                                setPhilHealthIdImage(null)
                              }}
                            />
                          ) : (
                            <IconFileText className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload your PhilHealth ID document (Image)
                          </p>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <label htmlFor="philhealth-upload">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  type="button"
                                  disabled={uploading}
                                  asChild
                                >
                                  <span>
                                    <IconUpload className="h-4 w-4 mr-2" />
                                    {uploading ? "Uploading..." : philHealthIdImageFile ? "Change Document" : "Upload Document"}
                                  </span>
                                </Button>
                                <input
                                  id="philhealth-upload"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleFileUpload(file, 'philhealth')
                                    }
                                  }}
                                />
                              </label>
                              {philHealthIdImage && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                  Uploaded
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {philHealthIdImage && typeof philHealthIdImage === 'string' && philHealthIdImage.startsWith('data:') && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                  Uploaded
                                </Badge>
                              )}
                              {patientInfo?.philHealthIdVerified && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          )}
                          {philHealthIdImageFile && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {philHealthIdImageFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Medical Information (only in edit mode or if has data) */}
                {(isEditing || medicalHistory || allergies || medications) && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Medical Information</CardTitle>
                      <CardDescription>Your medical history and related information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            MEDICAL HISTORY
                          </Label>
                          {isEditing ? (
                            <Textarea
                              value={medicalHistory}
                              onChange={(e) => setMedicalHistory(e.target.value)}
                              placeholder="Medical history"
                              rows={4}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{patientInfo?.medicalHistory || "—"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            ALLERGIES
                          </Label>
                          {isEditing ? (
                            <Textarea
                              value={allergies}
                              onChange={(e) => setAllergies(e.target.value)}
                              placeholder="Allergies"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{patientInfo?.allergies || "—"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            MEDICATIONS
                          </Label>
                          {isEditing ? (
                            <Textarea
                              value={medications}
                              onChange={(e) => setMedications(e.target.value)}
                              placeholder="Current medications"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{patientInfo?.medications || "—"}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                    <CardDescription>Your account status and system details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          ACCOUNT STATUS
                        </Label>
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                          ACTIVE
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          VERIFICATION STATUS
                        </Label>
                        {getStatusBadge(patientInfo?.verificationStatus)}
                        {patientInfo?.verificationStatus === "REJECTED" && patientInfo?.verificationRejectionReason && (
                          <p className="text-xs text-red-600 mt-1">
                            {patientInfo.verificationRejectionReason}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          ACCOUNT CREATED
                        </Label>
                        <p className="text-sm">
                          {user?.createdAt ? new Date(user.createdAt as string | Date).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>
      </SidebarInset>

      {/* View Image Dialog */}
      <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>PhilHealth ID Document</DialogTitle>
            <DialogDescription>
              {patientInfo && (
                <span>
                  Document for {patientInfo.firstName} {patientInfo.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center items-center bg-muted/50 rounded-lg min-h-[400px]">
            {philHealthIdImage && typeof philHealthIdImage === 'string' && philHealthIdImage.startsWith('data:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={philHealthIdImage}
                alt="PhilHealth ID Document"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Failed to load PhilHealth ID image in dialog:', e)
                }}
              />
            ) : (
              <div className="text-muted-foreground">No document available</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewImageDialogOpen(false)
              }}
            >
              Close
            </Button>
            {philHealthIdImage && patientInfo && (
              <Button
                variant="outline"
                onClick={() => {
                  if (philHealthIdImage) {
                    const link = document.createElement('a')
                    link.href = philHealthIdImage
                    const fileName = `philhealth-id-${patientInfo.firstName}-${patientInfo.lastName}.png`
                    link.download = fileName
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                }}
              >
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
