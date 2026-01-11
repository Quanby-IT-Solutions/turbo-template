"use client"

import * as React from "react"
import { IconUser, IconEdit, IconX, IconCheck, IconCamera } from "@tabler/icons-react"
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
import { toast } from "sonner"
import type { User } from "@/services/api/types"

interface DoctorInfoType {
  firstName?: string
  middleName?: string
  lastName?: string
  gender?: string
  dateOfBirth?: string | Date
  contactNumber?: string
  address?: string
  bio?: string
  specialization?: string
  qualifications?: string
  experience?: number
  prcId?: string
  ptrId?: string
  medicalLicenseLevel?: string
  philHealthAccreditation?: string
  licenseNumber?: string
  licenseExpiry?: string | Date
  language?: string
}

interface EmergencyContactType {
  contactName?: string
  relationship?: string
  contactNumber?: string
  contactAddress?: string
}

export default function ProfilePage() {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isEditing, setIsEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  // Form state - Personal Information
  const [firstName, setFirstName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [dateOfBirth, setDateOfBirth] = React.useState("")
  const [contactNumber, setContactNumber] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [zipCode, setZipCode] = React.useState("")
  const [country, setCountry] = React.useState("")

  // Form state - Professional Information
  const [specialization, setSpecialization] = React.useState("")
  const [experience, setExperience] = React.useState("")
  const [licenseNumber, setLicenseNumber] = React.useState("")
  const [language, setLanguage] = React.useState("")
  const [qualifications, setQualifications] = React.useState("")
  const [bio, setBio] = React.useState("")

  // Form state - Professional IDs
  const [prcId, setPrcId] = React.useState("")
  const [ptrId, setPtrId] = React.useState("")
  const [medicalLicenseLevel, setMedicalLicenseLevel] = React.useState("")
  const [philHealthAccreditation, setPhilHealthAccreditation] = React.useState("")

  // Form state - Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = React.useState("")
  const [emergencyContactRelationship, setEmergencyContactRelationship] = React.useState("")
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState("")
  const [emergencyContactEmail, setEmergencyContactEmail] = React.useState("")

  // Profile picture
  const [profilePicture, setProfilePicture] = React.useState<string | null>(null)
  const [profilePictureFile, setProfilePictureFile] = React.useState<File | null>(null)

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
        const doctorInfo = response.data.doctorInfo as DoctorInfoType | undefined
        
        // Set profile picture from user data
        if (response.data.profilePicture) {
          setProfilePicture(response.data.profilePicture as string)
        } else {
          setProfilePicture(null)
        }
        setProfilePictureFile(null)
        
        if (doctorInfo) {
          // Personal Information
          setFirstName(doctorInfo.firstName || "")
          setMiddleName(doctorInfo.middleName || "")
          setLastName(doctorInfo.lastName || "")
          setGender(doctorInfo.gender || "")
          setDateOfBirth(doctorInfo.dateOfBirth ? new Date(doctorInfo.dateOfBirth).toISOString().split('T')[0] : "")
          setContactNumber(doctorInfo.contactNumber || "")
          
          // Parse address
          const addressParts = (doctorInfo.address || "").split(',').map(s => s.trim())
          if (addressParts.length > 0) {
            setAddress(addressParts[0] || "")
            if (addressParts.length > 1) setCity(addressParts[1] || "")
            if (addressParts.length > 2) setState(addressParts[2] || "")
            if (addressParts.length > 3) setZipCode(addressParts[3] || "")
            if (addressParts.length > 4) setCountry(addressParts[4] || "")
          } else {
            setAddress(doctorInfo.address || "")
          }
          
          // Professional Information
          setSpecialization(doctorInfo.specialization || "")
          setExperience(doctorInfo.experience?.toString() || "")
          setLicenseNumber(doctorInfo.licenseNumber || "")
          setLanguage(doctorInfo.language || "English")
          setQualifications(doctorInfo.qualifications || "")
          setBio(doctorInfo.bio || "")
          
          // Professional IDs
          setPrcId(doctorInfo.prcId || "")
          setPtrId(doctorInfo.ptrId || "")
          setMedicalLicenseLevel(doctorInfo.medicalLicenseLevel || "")
          setPhilHealthAccreditation(doctorInfo.philHealthAccreditation || "")
        }

        // Emergency Contact - check if exists in user data
        // Try both emergencyContact (from patientInfo) and emergencyContacts (from user)
        const emergencyContact = (response.data as any).emergencyContact as EmergencyContactType | undefined
        const emergencyContacts = (response.data as any).emergencyContacts as EmergencyContactType[] | undefined
        const contact = emergencyContact || (emergencyContacts && emergencyContacts[0])
        if (contact) {
          setEmergencyContactName(contact.contactName || "")
          setEmergencyContactRelationship(contact.relationship || "")
          setEmergencyContactPhone(contact.contactNumber || "")
          setEmergencyContactEmail(contact.contactAddress || "")
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

  const handleFileUpload = async (file: File) => {
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
        setProfilePicture(base64String)
        setProfilePictureFile(file)
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
      
      // Personal Information
      if (firstName.trim()) updateData.firstName = firstName.trim()
      if (middleName.trim()) updateData.middleName = middleName.trim()
      if (lastName.trim()) updateData.lastName = lastName.trim()
      if (gender) updateData.gender = gender
      if (dateOfBirth) updateData.dateOfBirth = dateOfBirth
      if (contactNumber.trim()) updateData.contactNumber = contactNumber.trim()
      
      // Combine address fields
      const fullAddress = [address, city, state, zipCode, country]
        .filter(Boolean)
        .join(", ")
      if (fullAddress) updateData.address = fullAddress
      
      // Professional Information
      if (specialization.trim()) updateData.specialization = specialization.trim()
      if (experience) updateData.experience = parseInt(experience)
      if (licenseNumber.trim()) updateData.licenseNumber = licenseNumber.trim()
      if (qualifications.trim()) updateData.qualifications = qualifications.trim()
      if (bio.trim()) updateData.bio = bio.trim()
      
      // Professional IDs
      if (prcId.trim()) updateData.prcId = prcId.trim()
      if (ptrId.trim()) updateData.ptrId = ptrId.trim()
      if (medicalLicenseLevel) updateData.medicalLicenseLevel = medicalLicenseLevel
      if (philHealthAccreditation) updateData.philHealthAccreditation = philHealthAccreditation
      
      // Emergency Contact
      if (emergencyContactName.trim() || emergencyContactRelationship.trim() || 
          emergencyContactPhone.trim() || emergencyContactEmail.trim()) {
        updateData.emergencyContact = {
          contactName: emergencyContactName.trim() || "",
          relationship: emergencyContactRelationship.trim() || "",
          contactNumber: emergencyContactPhone.trim() || "",
          contactAddress: emergencyContactEmail.trim() || null,
        }
      }
      
      // Include profile picture if it exists
      if (profilePicture !== null && profilePicture !== undefined) {
        updateData.profilePicture = profilePicture || null
      }
      
      const response = await authApi.updateProfile(updateData)
      if (response.success) {
        toast.success("Profile updated successfully")
        setIsEditing(false)
        
        // Update user state with response data if available
        if (response.data) {
          const updatedData = response.data as any
          if (updatedData.profilePicture !== undefined) {
            const profilePicValue = updatedData.profilePicture
            if (profilePicValue && typeof profilePicValue === 'string' && 
                (profilePicValue.startsWith('data:') || profilePicValue.startsWith('data:image'))) {
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
      
      // Reset all form fields
      fetchProfile()
    }
  }

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "N/A"
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const calculateAge = (dateOfBirth?: string | Date | null) => {
    if (!dateOfBirth) return null
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
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
        <SidebarWrapper role="doctor" variant="inset" />
        <SidebarInset>
          <RoleHeader 
            title="My Profile" 
            description="Manage your personal and professional information"
          />
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const doctorInfo = user?.doctorInfo as DoctorInfoType | undefined
  const fullName = doctorInfo 
    ? `${doctorInfo.firstName || ""} ${doctorInfo.middleName || ""} ${doctorInfo.lastName || ""}`.trim()
    : "N/A"
  const email = user?.email || "N/A"
  const dob = doctorInfo?.dateOfBirth
  const age = calculateAge(dob)

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
          title="My Profile" 
          description="Manage your personal and professional information"
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
                      Manage your personal and professional information
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
                            <img 
                              src={profilePicture} 
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <IconUser className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        {isEditing && (
                          <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                            <IconCamera className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(file)
                              }}
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="middleName">Middle Name</Label>
                              <Input
                                id="middleName"
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                                placeholder="Middle Name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                value={email}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold mb-1">{fullName}</h3>
                            <p className="text-sm text-muted-foreground">{email}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PHONE
                        </Label>
                        {isEditing ? (
                          <Input
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            placeholder="+63-917-345-6789"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.contactNumber || "N/A"}</p>
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
                            {dob ? `${formatDate(dob)} (${age} years old)` : "N/A"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          GENDER
                        </Label>
                        {isEditing ? (
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">MALE</SelectItem>
                              <SelectItem value="FEMALE">FEMALE</SelectItem>
                              <SelectItem value="OTHER">OTHER</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm">{doctorInfo?.gender || "N/A"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Professional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          SPECIALIZATION
                        </Label>
                        {isEditing ? (
                          <Input
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            placeholder="Specialization"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.specialization || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          EXPERIENCE
                        </Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="Years"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.experience ? `${doctorInfo.experience} years` : "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          LICENSE NUMBER
                        </Label>
                        {isEditing ? (
                          <Input
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            placeholder="License Number"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.licenseNumber || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          LANGUAGE
                        </Label>
                        {isEditing ? (
                          <Input
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            placeholder="Language"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.language || "English"}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          QUALIFICATIONS
                        </Label>
                        {isEditing ? (
                          <Input
                            value={qualifications}
                            onChange={(e) => setQualifications(e.target.value)}
                            placeholder="Qualifications"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.qualifications || "N/A"}</p>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-4">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Professional biography"
                          rows={4}
                        />
                      </div>
                    )}
                    {!isEditing && doctorInfo?.bio && (
                      <div className="mt-4">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          BIO
                        </Label>
                        <p className="text-sm">{doctorInfo.bio}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Professional IDs */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Professional IDs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PRC ID
                        </Label>
                        {isEditing ? (
                          <Input
                            value={prcId}
                            onChange={(e) => setPrcId(e.target.value)}
                            placeholder="PRC ID"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.prcId || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PTR ID
                        </Label>
                        {isEditing ? (
                          <Input
                            value={ptrId}
                            onChange={(e) => setPtrId(e.target.value)}
                            placeholder="PTR ID"
                          />
                        ) : (
                          <p className="text-sm">{doctorInfo?.ptrId || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          LICENSE LEVEL
                        </Label>
                        {isEditing ? (
                          <Select value={medicalLicenseLevel} onValueChange={setMedicalLicenseLevel}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="S1">S1 - General Practitioner</SelectItem>
                              <SelectItem value="S2">S2 - Specialist</SelectItem>
                              <SelectItem value="S3">S3 - Subspecialist</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm">
                            {doctorInfo?.medicalLicenseLevel 
                              ? `${doctorInfo.medicalLicenseLevel} - ${doctorInfo.medicalLicenseLevel === 'S1' ? 'General Practitioner' : doctorInfo.medicalLicenseLevel === 'S2' ? 'Specialist' : 'Subspecialist'}`
                              : "N/A"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PHILHEALTH STATUS
                        </Label>
                        {isEditing ? (
                          <Select value={philHealthAccreditation} onValueChange={setPhilHealthAccreditation}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACCREDITED">Accredited</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="SUSPENDED">Suspended</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                              <SelectItem value="NOT_ACCREDITED">Not Accredited</SelectItem>
                              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm">{doctorInfo?.philHealthAccreditation || "N/A"}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Your address and emergency contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Address</h4>
                      <div className="space-y-4">
                        {isEditing ? (
                          <>
                            <div>
                              <Label htmlFor="address">Address</Label>
                              <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street address"
                              />
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                  id="city"
                                  value={city}
                                  onChange={(e) => setCity(e.target.value)}
                                  placeholder="City"
                                />
                              </div>
                              <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                  id="state"
                                  value={state}
                                  onChange={(e) => setState(e.target.value)}
                                  placeholder="State"
                                />
                              </div>
                              <div>
                                <Label htmlFor="zipCode">Zip Code</Label>
                                <Input
                                  id="zipCode"
                                  value={zipCode}
                                  onChange={(e) => setZipCode(e.target.value)}
                                  placeholder="Zip Code"
                                />
                              </div>
                              <div>
                                <Label htmlFor="country">Country</Label>
                                <Input
                                  id="country"
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  placeholder="Country"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                                ADDRESS
                              </Label>
                              <p className="text-sm">{doctorInfo?.address || "N/A"}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Emergency Contact</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            NAME
                          </Label>
                          {isEditing ? (
                            <Input
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              placeholder="Emergency contact name"
                            />
                          ) : (
                            <p className="text-sm">{emergencyContactName || "N/A"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            RELATIONSHIP
                          </Label>
                          {isEditing ? (
                            <Input
                              value={emergencyContactRelationship}
                              onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                              placeholder="Relationship"
                            />
                          ) : (
                            <p className="text-sm">{emergencyContactRelationship || "N/A"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            PHONE
                          </Label>
                          {isEditing ? (
                            <Input
                              value={emergencyContactPhone}
                              onChange={(e) => setEmergencyContactPhone(e.target.value)}
                              placeholder="Phone number"
                            />
                          ) : (
                            <p className="text-sm">{emergencyContactPhone || "N/A"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                            EMAIL
                          </Label>
                          {isEditing ? (
                            <Input
                              type="email"
                              value={emergencyContactEmail}
                              onChange={(e) => setEmergencyContactEmail(e.target.value)}
                              placeholder="Email address"
                            />
                          ) : (
                            <p className="text-sm">{emergencyContactEmail || "N/A"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Bio */}
                {!isEditing && doctorInfo?.bio && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Professional Bio</CardTitle>
                      <CardDescription>Your professional summary, expertise, and achievements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          PROFESSIONAL SUMMARY
                        </Label>
                        <p className="text-sm">{doctorInfo.bio}</p>
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
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                          {doctorInfo ? "VERIFIED" : "PENDING"}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          LAST LOGIN
                        </Label>
                        <p className="text-sm">{new Date().toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          ACCOUNT CREATED
                        </Label>
                        <p className="text-sm">
                          {user?.createdAt 
                            ? formatDate(user.createdAt as string | Date) 
                            : "N/A"}
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
    </SidebarProvider>
  )
}
