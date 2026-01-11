"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { Stepper } from "@/core/components/ui/stepper"
import { Textarea } from "@/core/components/ui/textarea"
import { IconUser, IconBriefcase, IconBuilding, IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { authApi } from "@/features/auth/api/auth-api"
import { subscriptionsApi } from "@/features/subscriptions/api/subscriptions-api"
import type { SubscriptionTier, SubscriptionTierSetting } from "@/features/subscriptions/api/subscriptions-api"
import { toast } from "sonner"

interface FileWithPreview {
  file: File
  preview: string
  type: 'prcId' | 'ptrId' | 'medicalLicense' | 'additional'
}

// Patient steps
const patientSteps = ["Personal Info", "Personal Details", "Health Info"]

// Doctor steps
const doctorSteps = ["Personal Info", "Professional", "Contact & Bio", "License Info", "Documents"]

export function SignupForm() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<"patient" | "doctor" | "organization">("doctor")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [tiersLoading, setTiersLoading] = React.useState(false)
  const [tierError, setTierError] = React.useState<string | null>(null)
  const [tierSettings, setTierSettings] = React.useState<SubscriptionTierSetting[]>([])
  const [selectedPatientTier, setSelectedPatientTier] = React.useState<SubscriptionTier>("FREE")
  const [selectedDoctorTier, setSelectedDoctorTier] = React.useState<SubscriptionTier>("FREE")
  
  // Step management
  const [patientStep, setPatientStep] = React.useState(1)
  const [doctorStep, setDoctorStep] = React.useState(1)

  // Patient form state
  const [patientData, setPatientData] = React.useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    dateOfBirth: "",
    contactNumber: "",
    address: "",
    weight: "",
    height: "",
    bloodType: "",
  })

  // Doctor form state
  const [doctorData, setDoctorData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    qualifications: "",
    experience: "",
    gender: "",
    dateOfBirth: "",
    contactNumber: "",
    address: "",
    bio: "",
    prcId: "",
    ptrId: "",
    medicalLicenseLevel: "",
    philHealthAccreditation: "",
    licenseNumber: "",
    licenseExpiry: "",
  })

  // Organization form state
  const [organizationData, setOrganizationData] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactNumber: "",
    address: "",
    website: "",
    description: "",
  })

  // File uploads for doctor
  const [uploadedFiles, setUploadedFiles] = React.useState<FileWithPreview[]>([])

  // Track if submit button was explicitly clicked
  const doctorSubmitButtonClicked = React.useRef(false)
  const patientSubmitButtonClicked = React.useRef(false)

  // Reset steps when switching tabs
  React.useEffect(() => {
    setPatientStep(1)
    setDoctorStep(1)
    setError(null)
    doctorSubmitButtonClicked.current = false
    patientSubmitButtonClicked.current = false
  }, [activeTab])

  React.useEffect(() => {
    let isMounted = true
    const loadTierSettings = async () => {
      setTiersLoading(true)
      try {
        const response = await subscriptionsApi.listPublicTierSettings()
        if (!isMounted) return
        if (response.success && response.data) {
          setTierSettings(response.data)
          setTierError(null)
        } else {
          setTierError(response.message || "Failed to load tier settings")
        }
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Failed to load tier settings"
        setTierError(message)
      } finally {
        if (isMounted) setTiersLoading(false)
      }
    }

    loadTierSettings()
    return () => {
      isMounted = false
    }
  }, [])

  const patientTierSettings = React.useMemo(
    () => tierSettings.filter((tier) => tier.entityType === "PATIENT"),
    [tierSettings],
  )
  const doctorTierSettings = React.useMemo(
    () => tierSettings.filter((tier) => tier.entityType === "DOCTOR"),
    [tierSettings],
  )

  React.useEffect(() => {
    if (tiersLoading) return
    if (patientTierSettings.length > 0) {
      const hasSelectedPatient = patientTierSettings.some((tier) => tier.tier === selectedPatientTier)
      if (!hasSelectedPatient) {
        setSelectedPatientTier(patientTierSettings[0].tier)
      }
    }
    if (doctorTierSettings.length > 0) {
      const hasSelectedDoctor = doctorTierSettings.some((tier) => tier.tier === selectedDoctorTier)
      if (!hasSelectedDoctor) {
        setSelectedDoctorTier(doctorTierSettings[0].tier)
      }
    }
  }, [tiersLoading, patientTierSettings, doctorTierSettings, selectedPatientTier, selectedDoctorTier])

  const getActiveTierList = () => doctorTierSettings

  const handleTierSelection = (_tier: SubscriptionTierSetting) => {
    toast.info("Free plan selected")
  }

  const renderTierCards = () => null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'prcId' | 'ptrId' | 'medicalLicense' | 'additional') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB.`)
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedFiles((prev) => [
          ...prev,
          {
            file,
            preview: URL.createObjectURL(file),
            type,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const file = prev[index]
      URL.revokeObjectURL(file.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const convertFilesToBase64 = async (): Promise<{
    prcIdImage?: string
    ptrIdImage?: string
    medicalLicenseImage?: string
    additionalIdImages?: string[]
  }> => {
    const result: {
      prcIdImage?: string
      ptrIdImage?: string
      medicalLicenseImage?: string
      additionalIdImages?: string[]
    } = {}

    for (const uploadedFile of uploadedFiles) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(uploadedFile.file)
      })

      if (uploadedFile.type === 'prcId') {
        result.prcIdImage = base64
      } else if (uploadedFile.type === 'ptrId') {
        result.ptrIdImage = base64
      } else if (uploadedFile.type === 'medicalLicense') {
        result.medicalLicenseImage = base64
      } else {
        if (!result.additionalIdImages) {
          result.additionalIdImages = []
        }
        result.additionalIdImages.push(base64)
      }
    }

    return result
  }

  // Password validation regex matching backend requirements
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!password) {
      errors.push("Password is required")
      return { isValid: false, errors }
    }
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter")
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number")
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push("Password must contain at least one special character (@$!%*?&)")
    }
    
    return {
      isValid: errors.length === 0 && passwordRegex.test(password),
      errors
    }
  }

  const validatePatientStep = (step: number): { isValid: boolean; error?: string } => {
    if (step === 1) {
      if (!patientData.firstName) {
        return { isValid: false, error: "First name is required" }
      }
      if (!patientData.lastName) {
        return { isValid: false, error: "Last name is required" }
      }
      if (!patientData.email) {
        return { isValid: false, error: "Email is required" }
      }
      if (!patientData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return { isValid: false, error: "Please enter a valid email address" }
      }
      
      const passwordValidation = validatePassword(patientData.password)
      if (!passwordValidation.isValid) {
        return { isValid: false, error: passwordValidation.errors.join(", ") }
      }
      
      if (!patientData.confirmPassword) {
        return { isValid: false, error: "Please confirm your password" }
      }
      
      if (patientData.password !== patientData.confirmPassword) {
        return { isValid: false, error: "Passwords do not match" }
      }
      
      return { isValid: true }
    }
    if (step === 2) {
      if (!patientData.gender) {
        return { isValid: false, error: "Gender is required" }
      }
      if (!patientData.dateOfBirth) {
        return { isValid: false, error: "Date of birth is required" }
      }
      if (!patientData.contactNumber) {
        return { isValid: false, error: "Contact number is required" }
      }
      if (!patientData.address) {
        return { isValid: false, error: "Address is required" }
      }
      return { isValid: true }
    }
    if (step === 3) {
      if (!patientData.weight) {
        return { isValid: false, error: "Weight is required" }
      }
      if (!patientData.height) {
        return { isValid: false, error: "Height is required" }
      }
      if (!patientData.bloodType) {
        return { isValid: false, error: "Blood type is required" }
      }
      return { isValid: true }
    }
    return { isValid: true }
  }

  const validateDoctorStep = (step: number): { isValid: boolean; error?: string } => {
    if (step === 1) {
      if (!doctorData.firstName) {
        return { isValid: false, error: "First name is required" }
      }
      if (!doctorData.lastName) {
        return { isValid: false, error: "Last name is required" }
      }
      if (!doctorData.email) {
        return { isValid: false, error: "Email is required" }
      }
      if (!doctorData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return { isValid: false, error: "Please enter a valid email address" }
      }
      
      const passwordValidation = validatePassword(doctorData.password)
      if (!passwordValidation.isValid) {
        return { isValid: false, error: passwordValidation.errors.join(", ") }
      }
      
      if (!doctorData.confirmPassword) {
        return { isValid: false, error: "Please confirm your password" }
      }
      
      if (doctorData.password !== doctorData.confirmPassword) {
        return { isValid: false, error: "Passwords do not match" }
      }
      
      return { isValid: true }
    }
    if (step === 2) {
      if (!doctorData.specialization) {
        return { isValid: false, error: "Specialization is required" }
      }
      if (!doctorData.qualifications) {
        return { isValid: false, error: "Qualifications is required" }
      }
      if (!doctorData.experience) {
        return { isValid: false, error: "Years of experience is required" }
      }
      return { isValid: true }
    }
    if (step === 4) {
      // Validate PRC ID - required
      if (!doctorData.prcId || doctorData.prcId.trim() === "") {
        return { isValid: false, error: "PRC ID Number is required" }
      }
      // Validate PRC ID format: PRC- followed by numbers (e.g., PRC-1234567 or PRC-2024-001234)
      const prcIdTrimmed = doctorData.prcId.trim().toUpperCase()
      const prcIdPattern = /^PRC-[\d-]+$/
      if (!prcIdPattern.test(prcIdTrimmed)) {
        return { isValid: false, error: "PRC ID format is invalid. Expected format: PRC-1234567 or PRC-2024-001234" }
      }
      // Ensure it starts with PRC-
      if (!prcIdTrimmed.startsWith('PRC-')) {
        return { isValid: false, error: "PRC ID must start with 'PRC-'" }
      }
      
      // Validate PTR ID - required
      if (!doctorData.ptrId || doctorData.ptrId.trim() === "") {
        return { isValid: false, error: "PTR ID Number is required" }
      }
      // Validate PTR ID format: PTR- followed by year and numbers (e.g., PTR-2024-001234)
      const ptrIdTrimmed = doctorData.ptrId.trim().toUpperCase()
      const ptrIdPattern = /^PTR-\d{4}-[\d-]+$/
      if (!ptrIdPattern.test(ptrIdTrimmed)) {
        return { isValid: false, error: "PTR ID format is invalid. Expected format: PTR-YYYY-XXXXXX (e.g., PTR-2024-001234)" }
      }
      // Ensure it starts with PTR- and has a valid year
      if (!ptrIdTrimmed.startsWith('PTR-')) {
        return { isValid: false, error: "PTR ID must start with 'PTR-'" }
      }
      const ptrYear = parseInt(ptrIdTrimmed.split('-')[1])
      if (isNaN(ptrYear) || ptrYear < 1900 || ptrYear > new Date().getFullYear() + 1) {
        return { isValid: false, error: "PTR ID must contain a valid year (e.g., PTR-2024-001234)" }
      }
      
      // Validate License Number - required
      if (!doctorData.licenseNumber || doctorData.licenseNumber.trim() === "") {
        return { isValid: false, error: "License Number is required" }
      }
      // Validate License Number format: MD- or similar prefix followed by year and numbers (e.g., MD-2024-001234)
      const licenseNumberTrimmed = doctorData.licenseNumber.trim().toUpperCase()
      const licenseNumberPattern = /^[A-Z]{2,3}-\d{4}-[\d-]+$/
      if (!licenseNumberPattern.test(licenseNumberTrimmed)) {
        return { isValid: false, error: "License Number format is invalid. Expected format: MD-YYYY-XXXXXX (e.g., MD-2024-001234)" }
      }
      // Validate year in license number
      const licenseParts = licenseNumberTrimmed.split('-')
      if (licenseParts.length >= 2) {
        const licenseYear = parseInt(licenseParts[1])
        if (isNaN(licenseYear) || licenseYear < 1900 || licenseYear > new Date().getFullYear() + 1) {
          return { isValid: false, error: "License Number must contain a valid year (e.g., MD-2024-001234)" }
        }
      }
      
      // Validate License Expiry Date - required
      if (!doctorData.licenseExpiry) {
        return { isValid: false, error: "License Expiry Date is required" }
      }
      // Validate that expiry date is in the future
      const expiryDate = new Date(doctorData.licenseExpiry)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate < today) {
        return { isValid: false, error: "License Expiry Date must be in the future" }
      }
      
      return { isValid: true }
    }
    return { isValid: true }
  }

  const handlePatientNext = () => {
    const validation = validatePatientStep(patientStep)
    if (validation.isValid) {
      if (patientStep < patientSteps.length) {
        setPatientStep(patientStep + 1)
        setError(null)
      }
    } else {
      setError(validation.error || "Please fill in all required fields")
      toast.error(validation.error || "Please fill in all required fields")
    }
  }

  const handlePatientPrev = () => {
    if (patientStep > 1) {
      setPatientStep(patientStep - 1)
      setError(null)
    }
  }

  const handleDoctorNext = () => {
    const validation = validateDoctorStep(doctorStep)
    if (validation.isValid) {
      if (doctorStep < doctorSteps.length) {
        setDoctorStep(doctorStep + 1)
        setError(null)
      }
    } else {
      setError(validation.error || "Please fill in all required fields")
      toast.error(validation.error || "Please fill in all required fields")
    }
  }

  const handleDoctorPrev = () => {
    if (doctorStep > 1) {
      setDoctorStep(doctorStep - 1)
      setError(null)
    }
  }

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only submit if we're on the last step AND the submit button was explicitly clicked
    if (patientStep !== patientSteps.length || !patientSubmitButtonClicked.current) {
      // Reset the flag if it was set incorrectly
      patientSubmitButtonClicked.current = false
      return
    }
    
    // Reset the flag before proceeding
    patientSubmitButtonClicked.current = false
    
    // Double-check: ensure we're actually on the last step before proceeding
    if (patientStep < patientSteps.length) {
      return
    }
    
    setError(null)

    // Validate all required fields
    const validation = validatePatientStep(patientSteps.length)
    if (!validation.isValid) {
      setError(validation.error || "Please fill in all required fields")
      toast.error(validation.error || "Please fill in all required fields")
      return
    }

    if (patientData.password !== patientData.confirmPassword) {
      setError("Passwords do not match")
      toast.error("Passwords do not match")
      return
    }

    const passwordValidation = validatePassword(patientData.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "))
      toast.error(passwordValidation.errors.join(", "))
      return
    }

    // Validate numeric fields
    const weight = parseFloat(patientData.weight)
    const height = parseFloat(patientData.height)
    
    if (isNaN(weight) || weight <= 0) {
      setError("Please enter a valid weight")
      toast.error("Please enter a valid weight")
      return
    }
    
    if (isNaN(height) || height <= 0) {
      setError("Please enter a valid height")
      toast.error("Please enter a valid height")
      return
    }

    // Validate date
    if (!patientData.dateOfBirth) {
      setError("Date of birth is required")
      toast.error("Date of birth is required")
      return
    }

    // Validate gender enum value
    if (!['MALE', 'FEMALE', 'OTHER'].includes(patientData.gender)) {
      setError("Please select a valid gender")
      toast.error("Please select a valid gender")
      return
    }

    setIsLoading(true)

    try {
      const response = await authApi.register({
        email: patientData.email.trim(),
        password: patientData.password,
        role: "PATIENT",
        subscriptionTier: selectedPatientTier,
        firstName: patientData.firstName.trim(),
        middleName: patientData.middleName.trim() || undefined,
        lastName: patientData.lastName.trim(),
        gender: patientData.gender as "MALE" | "FEMALE" | "OTHER",
        dateOfBirth: patientData.dateOfBirth,
        contactNumber: patientData.contactNumber.trim(),
        address: patientData.address.trim(),
        weight: weight,
        height: height,
        bloodType: patientData.bloodType,
      })

      if (response.success && response.data) {
        // Don't auto-login - redirect to login page instead
        toast.success("Account created successfully! Please log in to continue.")
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(response.message || "Registration failed")
        toast.error(response.message || "Registration failed")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only submit if we're on the last step AND the submit button was explicitly clicked
    if (doctorStep !== doctorSteps.length || !doctorSubmitButtonClicked.current) {
      doctorSubmitButtonClicked.current = false
      return
    }
    
    // Reset the flag
    doctorSubmitButtonClicked.current = false
    
    setError(null)

    if (doctorData.password !== doctorData.confirmPassword) {
      setError("Passwords do not match")
      toast.error("Passwords do not match")
      return
    }

    if (doctorData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      toast.error("Password must be at least 8 characters long")
      return
    }

    if (!doctorData.firstName || !doctorData.lastName || !doctorData.specialization || 
        !doctorData.qualifications || !doctorData.experience) {
      setError("Please fill in all required fields")
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)

    try {
      const fileData = await convertFilesToBase64()

      const response = await authApi.register({
        email: doctorData.email,
        password: doctorData.password,
        role: "DOCTOR",
        subscriptionTier: selectedDoctorTier,
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        specialization: doctorData.specialization,
        qualifications: doctorData.qualifications,
        experience: parseInt(doctorData.experience),
        gender: doctorData.gender || undefined,
        dateOfBirth: doctorData.dateOfBirth || undefined,
        contactNumber: doctorData.contactNumber || '',
        address: doctorData.address || '',
        bio: doctorData.bio || '',
        prcId: doctorData.prcId || undefined,
        ptrId: doctorData.ptrId || undefined,
        medicalLicenseLevel: doctorData.medicalLicenseLevel || undefined,
        philHealthAccreditation: doctorData.philHealthAccreditation || undefined,
        licenseNumber: doctorData.licenseNumber || undefined,
        licenseExpiry: doctorData.licenseExpiry || undefined,
        ...fileData,
      })

      if (response.success && response.data) {
        // For doctors, account is pending approval - don't log them in
        toast.success("Account created successfully! Your account is pending admin approval. You will be notified once it's approved. Redirecting to login...")
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        setError(response.message || "Registration failed")
        toast.error(response.message || "Registration failed")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!organizationData.name.trim()) {
      toast.error("Organization name is required")
      return
    }

    if (!organizationData.email.trim()) {
      toast.error("Email is required")
      return
    }

    if (organizationData.password !== organizationData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    const validation = validatePassword(organizationData.password)
    if (!validation.isValid) {
      toast.error(validation.errors[0] || "Password does not meet requirements")
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.register({
        email: organizationData.email.trim(),
        password: organizationData.password,
        role: "ORGANIZATION",
        subscriptionTier: selectedDoctorTier,
        firstName: organizationData.name.trim(), // backend requires firstName; use org name
        contactNumber: organizationData.contactNumber.trim() || undefined,
        address: organizationData.address.trim() || undefined,
        bio: organizationData.description.trim() || undefined,
        website: organizationData.website.trim() || undefined,
      })

      if (response.success) {
        toast.success("Organization submitted! Your account is pending approval. Redirecting to login...")
        setTimeout(() => router.push("/login"), 2000)
      } else {
        setError(response.message || "Registration failed")
        toast.error(response.message || "Registration failed")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "patient" | "doctor" | "organization")} className="w-full">
      <div className="flex flex-col items-center gap-1 text-center mb-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Fill in the form below to create your account
        </p>
      </div>
      
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="doctor">
          <IconBriefcase className="mr-2 size-4" />
          Doctor
        </TabsTrigger>
        <TabsTrigger value="organization">
          <IconBuilding className="mr-2 size-4" />
          Organization
        </TabsTrigger>
      </TabsList>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      {/* Plan selection hidden; default FREE tier */}

      <FieldGroup>
        <TabsContent value="patient" className="mt-0">
          <form 
            onSubmit={handlePatientSubmit} 
            onKeyDown={(e) => {
              // Prevent form submission on Enter key unless we're on the last step
              // and the submit button is explicitly clicked
              if (e.key === 'Enter') {
                // If we're not on the last step, always prevent submission
                if (patientStep !== patientSteps.length) {
                e.preventDefault()
                  return
                }
                // If we're on the last step, only allow Enter if it's from the submit button
                // Otherwise, prevent it (user might press Enter in a field)
                const target = e.target as HTMLElement
                if (target.tagName !== 'BUTTON' || target.getAttribute('type') !== 'submit') {
                  e.preventDefault()
                }
              }
            }}
            className="flex flex-col gap-6"
          >
            <Stepper steps={patientSteps} currentStep={patientStep} className="mb-6" />
            
            {/* Step 1: Personal Info */}
            {patientStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="patient-firstname">First Name *</FieldLabel>
                  <Input
                      id="patient-firstname"
                    type="text"
                      placeholder="John"
                      value={patientData.firstName}
                      onChange={(e) => setPatientData({ ...patientData, firstName: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="patient-lastname">Last Name *</FieldLabel>
                    <Input
                      id="patient-lastname"
                      type="text"
                      placeholder="Doe"
                      value={patientData.lastName}
                      onChange={(e) => setPatientData({ ...patientData, lastName: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="patient-middlename">Middle Name</FieldLabel>
                  <Input
                    id="patient-middlename"
                    type="text"
                    placeholder="Middle (optional)"
                    value={patientData.middleName}
                    onChange={(e) => setPatientData({ ...patientData, middleName: e.target.value })}
                    disabled={isLoading}
                  />
                  <FieldDescription>Optional middle name</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-email">Email *</FieldLabel>
                  <Input
                    id="patient-email"
                    type="email"
                    placeholder="m@example.com"
                    value={patientData.email}
                    onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your email with anyone else.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-password">Password *</FieldLabel>
                  <Input
                    id="patient-password"
                    type="password"
                    value={patientData.password}
                    onChange={(e) => {
                      setPatientData({ ...patientData, password: e.target.value })
                      setError(null)
                    }}
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)
                  </FieldDescription>
                  {patientData.password && !validatePassword(patientData.password).isValid && (
                    <div className="text-destructive text-sm mt-1">
                      {validatePassword(patientData.password).errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-confirm-password">Confirm Password *</FieldLabel>
                  <Input
                    id="patient-confirm-password"
                    type="password"
                    value={patientData.confirmPassword}
                    onChange={(e) => setPatientData({ ...patientData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* Step 2: Personal Details */}
            {patientStep === 2 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="patient-gender">Gender *</FieldLabel>
                  <Select
                    value={patientData.gender}
                    onValueChange={(value) => setPatientData({ ...patientData, gender: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-dob">Date of Birth *</FieldLabel>
                  <Input
                    id="patient-dob"
                    type="date"
                    value={patientData.dateOfBirth}
                    onChange={(e) => setPatientData({ ...patientData, dateOfBirth: e.target.value })}
                    required
                    disabled={isLoading}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <FieldDescription>Select your date of birth</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-contact">Contact Number *</FieldLabel>
                  <Input
                    id="patient-contact"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={patientData.contactNumber}
                    onChange={(e) => setPatientData({ ...patientData, contactNumber: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-address">Address *</FieldLabel>
                  <Input
                    id="patient-address"
                    type="text"
                    placeholder="123 Main St, City, Country"
                    value={patientData.address}
                    onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* Step 3: Health Info */}
            {patientStep === 3 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="patient-weight">Weight (kg) *</FieldLabel>
                  <Input
                    id="patient-weight"
                    type="number"
                    placeholder="70"
                    value={patientData.weight}
                    onChange={(e) => setPatientData({ ...patientData, weight: e.target.value })}
                    required
                    disabled={isLoading}
                    min="1"
                    max="500"
                    step="0.1"
                  />
                  <FieldDescription>Enter your weight in kilograms</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-height">Height (cm) *</FieldLabel>
                  <Input
                    id="patient-height"
                    type="number"
                    placeholder="170"
                    value={patientData.height}
                    onChange={(e) => setPatientData({ ...patientData, height: e.target.value })}
                    required
                    disabled={isLoading}
                    min="50"
                    max="300"
                    step="0.1"
                  />
                  <FieldDescription>Enter your height in centimeters</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="patient-blood">Blood Type *</FieldLabel>
                  <Select
                    value={patientData.bloodType}
                    onValueChange={(value) => setPatientData({ ...patientData, bloodType: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePatientPrev}
                disabled={patientStep === 1 || isLoading}
              >
                <IconChevronLeft className="mr-2 size-4" />
                Previous
              </Button>
              {patientStep < patientSteps.length ? (
                <Button
                  type="button"
                  onClick={handlePatientNext}
                  disabled={isLoading}
                >
                  Next
                  <IconChevronRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  onClick={(e) => {
                    // Mark that the submit button was explicitly clicked
                    patientSubmitButtonClicked.current = true
                    // Ensure we're on the last step before submitting
                    if (patientStep !== patientSteps.length) {
                      e.preventDefault()
                      patientSubmitButtonClicked.current = false
                      return
                    }
                  }}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              )}
            </div>
            
            {/* Back to Login */}
            <div className="mt-4 text-center">
              <FieldDescription>
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-primary underline underline-offset-4 hover:no-underline font-medium transition-all duration-300 hover:opacity-80"
                >
                  Sign in
                </Link>
              </FieldDescription>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="doctor" className="mt-0">
          <form 
            onSubmit={handleDoctorSubmit} 
            onKeyDown={(e) => {
              // Prevent form submission on Enter key unless we're on the last step and the submit button was clicked
              if (e.key === 'Enter') {
                // Only allow Enter to submit if we're on the last step AND the submit button was clicked
                if (doctorStep !== doctorSteps.length || !doctorSubmitButtonClicked.current) {
                  e.preventDefault()
                }
              }
            }}
            className="flex flex-col gap-6"
          >
            <Stepper steps={doctorSteps} currentStep={doctorStep} className="mb-6" />
            
            {/* Step 1: Personal Info */}
            {doctorStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="doctor-firstname">First Name *</FieldLabel>
                    <Input
                      id="doctor-firstname"
                      type="text"
                      placeholder="John"
                      value={doctorData.firstName}
                      onChange={(e) => setDoctorData({ ...doctorData, firstName: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="doctor-lastname">Last Name *</FieldLabel>
                    <Input
                      id="doctor-lastname"
                      type="text"
                      placeholder="Doe"
                      value={doctorData.lastName}
                      onChange={(e) => setDoctorData({ ...doctorData, lastName: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="doctor-email">Email *</FieldLabel>
                  <Input
                    id="doctor-email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={doctorData.email}
                    onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your email with anyone else.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-password">Password *</FieldLabel>
                  <Input
                    id="doctor-password"
                    type="password"
                    value={doctorData.password}
                    onChange={(e) => {
                      setDoctorData({ ...doctorData, password: e.target.value })
                      setError(null)
                    }}
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)
                  </FieldDescription>
                  {doctorData.password && !validatePassword(doctorData.password).isValid && (
                    <div className="text-destructive text-sm mt-1">
                      {validatePassword(doctorData.password).errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-confirm-password">Confirm Password *</FieldLabel>
                  <Input
                    id="doctor-confirm-password"
                    type="password"
                    value={doctorData.confirmPassword}
                    onChange={(e) => setDoctorData({ ...doctorData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* Step 2: Professional */}
            {doctorStep === 2 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="doctor-specialization">Specialization *</FieldLabel>
                  <Input
                    id="doctor-specialization"
                    type="text"
                    placeholder="Cardiology, Pediatrics, etc."
                    value={doctorData.specialization}
                    onChange={(e) => setDoctorData({ ...doctorData, specialization: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-qualifications">Qualifications *</FieldLabel>
                  <Input
                    id="doctor-qualifications"
                    type="text"
                    placeholder="MD, MBBS, etc."
                    value={doctorData.qualifications}
                    onChange={(e) => setDoctorData({ ...doctorData, qualifications: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-experience">Years of Experience *</FieldLabel>
                  <Input
                    id="doctor-experience"
                    type="number"
                    placeholder="5"
                    value={doctorData.experience}
                    onChange={(e) => setDoctorData({ ...doctorData, experience: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* Step 3: Contact & Bio */}
            {doctorStep === 3 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="doctor-gender">Gender</FieldLabel>
                  <Select
                    value={doctorData.gender}
                    onValueChange={(value) => setDoctorData({ ...doctorData, gender: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-dob">Date of Birth</FieldLabel>
                  <Input
                    id="doctor-dob"
                    type="date"
                    value={doctorData.dateOfBirth}
                    onChange={(e) => setDoctorData({ ...doctorData, dateOfBirth: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-contact">Contact Number</FieldLabel>
                  <Input
                    id="doctor-contact"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={doctorData.contactNumber}
                    onChange={(e) => setDoctorData({ ...doctorData, contactNumber: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-address">Address</FieldLabel>
                  <Input
                    id="doctor-address"
                    type="text"
                    placeholder="123 Main St, City, Country"
                    value={doctorData.address}
                    onChange={(e) => setDoctorData({ ...doctorData, address: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-bio">Bio</FieldLabel>
                  <Input
                    id="doctor-bio"
                    type="text"
                    placeholder="Brief biography about yourself"
                    value={doctorData.bio}
                    onChange={(e) => setDoctorData({ ...doctorData, bio: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* Step 4: License Info */}
            {doctorStep === 4 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="doctor-prc">PRC ID Number *</FieldLabel>
                  <Input
                    id="doctor-prc"
                    type="text"
                    placeholder="PRC-1234567"
                    value={doctorData.prcId}
                    onChange={(e) => {
                      setDoctorData({ ...doctorData, prcId: e.target.value })
                      setError(null)
                    }}
                    disabled={isLoading}
                    required
                  />
                  <FieldDescription>Format: PRC-1234567 or PRC-2024-001234</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-ptr">PTR ID Number *</FieldLabel>
                  <Input
                    id="doctor-ptr"
                    type="text"
                    placeholder="PTR-2024-001234"
                    value={doctorData.ptrId}
                    onChange={(e) => {
                      setDoctorData({ ...doctorData, ptrId: e.target.value })
                      setError(null)
                    }}
                    disabled={isLoading}
                    required
                  />
                  <FieldDescription>Format: PTR-YYYY-XXXXXX (e.g., PTR-2024-001234)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-license-level">Medical License Level</FieldLabel>
                  <Select
                    value={doctorData.medicalLicenseLevel}
                    onValueChange={(value) => setDoctorData({ ...doctorData, medicalLicenseLevel: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select license level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S1">S1 - General Practitioner</SelectItem>
                      <SelectItem value="S2">S2 - Specialist</SelectItem>
                      <SelectItem value="S3">S3 - Subspecialist</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-philhealth">PhilHealth Accreditation</FieldLabel>
                  <Select
                    value={doctorData.philHealthAccreditation}
                    onValueChange={(value) => setDoctorData({ ...doctorData, philHealthAccreditation: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select accreditation status" />
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
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-license-number">License Number *</FieldLabel>
                  <Input
                    id="doctor-license-number"
                    type="text"
                    placeholder="MD-2024-001234"
                    value={doctorData.licenseNumber}
                    onChange={(e) => {
                      setDoctorData({ ...doctorData, licenseNumber: e.target.value })
                      setError(null)
                    }}
                    disabled={isLoading}
                    required
                  />
                  <FieldDescription>Format: MD-YYYY-XXXXXX (e.g., MD-2024-001234)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="doctor-license-expiry">License Expiry Date *</FieldLabel>
                  <Input
                    id="doctor-license-expiry"
                    type="date"
                    value={doctorData.licenseExpiry}
                    onChange={(e) => {
                      setDoctorData({ ...doctorData, licenseExpiry: e.target.value })
                      setError(null)
                    }}
                    disabled={isLoading}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <FieldDescription>Select a future date for your license expiry</FieldDescription>
                </Field>
              </div>
            )}

            {/* Step 5: Documents */}
            {doctorStep === 5 && (
              <div className="space-y-4">
                <Field>
                  <FieldLabel>PRC ID Image</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'prcId')}
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                  <FieldDescription>Upload a clear image of your PRC ID (Max 5MB)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>PTR ID Image</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'ptrId')}
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                  <FieldDescription>Upload a clear image of your PTR ID (Max 5MB)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Medical License Image</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'medicalLicense')}
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                  <FieldDescription>Upload a clear image of your medical license (Max 5MB)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Additional ID Documents</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'additional')}
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                  <FieldDescription>Upload additional identification documents if needed (Max 5MB per file)</FieldDescription>
                </Field>
                {uploadedFiles.length > 0 && (
                  <Field>
                    <FieldLabel>Uploaded Files</FieldLabel>
                    <div className="grid grid-cols-2 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative border rounded-lg p-2">
                          <Image
                            src={file.preview}
                            alt={file.file.name}
                            width={200}
                            height={128}
                            className="w-full h-32 object-cover rounded"
                            unoptimized
                          />
                          <div className="mt-2 text-xs text-muted-foreground truncate">
                            {file.file.name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Type: {file.type}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeFile(index)}
                            disabled={isLoading}
                          >
                            <IconX className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleDoctorPrev}
                disabled={doctorStep === 1 || isLoading}
              >
                <IconChevronLeft className="mr-2 size-4" />
                Previous
              </Button>
              {doctorStep < doctorSteps.length ? (
                <Button
                  type="button"
                  onClick={handleDoctorNext}
                  disabled={isLoading}
                >
                  Next
                  <IconChevronRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  onClick={(e) => {
                    // Mark that the submit button was explicitly clicked
                    doctorSubmitButtonClicked.current = true
                    // Ensure we're on the last step before submitting
                    if (doctorStep !== doctorSteps.length) {
                      e.preventDefault()
                      doctorSubmitButtonClicked.current = false
                      return
                    }
                  }}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              )}
            </div>
            
            {/* Back to Login */}
            <div className="mt-4 text-center">
              <FieldDescription>
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-primary underline underline-offset-4 hover:no-underline font-medium transition-all duration-300 hover:opacity-80"
                >
                  Sign in
                </Link>
              </FieldDescription>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="organization" className="mt-0">
          <form onSubmit={handleOrganizationSubmit} className="flex flex-col gap-6">
            <div className="bg-muted/60 border rounded-md px-4 py-3 text-sm text-muted-foreground">
              New organization accounts require super-admin approval before they can sign in.
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-2">
                  <FieldLabel htmlFor="org-name">Organization Name *</FieldLabel>
                  <Input
                    id="org-name"
                    type="text"
                    placeholder="Acme Hospital"
                    value={organizationData.name}
                    onChange={(e) => setOrganizationData({ ...organizationData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="org-email">Work Email *</FieldLabel>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="admin@hospital.com"
                  value={organizationData.email}
                  onChange={(e) => setOrganizationData({ ...organizationData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-contact">Contact Number (optional)</FieldLabel>
                <Input
                  id="org-contact"
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={organizationData.contactNumber}
                  onChange={(e) => setOrganizationData({ ...organizationData, contactNumber: e.target.value })}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-address">Address (optional)</FieldLabel>
                <Input
                  id="org-address"
                  type="text"
                  placeholder="123 Health St, City, Country"
                  value={organizationData.address}
                  onChange={(e) => setOrganizationData({ ...organizationData, address: e.target.value })}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-website">Website (optional)</FieldLabel>
                <Input
                  id="org-website"
                  type="url"
                  placeholder="https://yourhospital.com"
                  value={organizationData.website}
                  onChange={(e) => setOrganizationData({ ...organizationData, website: e.target.value })}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-description">Description (optional)</FieldLabel>
                <Textarea
                  id="org-description"
                  placeholder="Brief description of your organization"
                  value={organizationData.description}
                  onChange={(e) => setOrganizationData({ ...organizationData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-password">Password *</FieldLabel>
                <Input
                  id="org-password"
                  type="password"
                  value={organizationData.password}
                  onChange={(e) => {
                    setOrganizationData({ ...organizationData, password: e.target.value })
                    setError(null)
                  }}
                  required
                  disabled={isLoading}
                />
                <FieldDescription>
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)
                </FieldDescription>
                {organizationData.password && !validatePassword(organizationData.password).isValid && (
                  <div className="text-destructive text-sm mt-1">
                    {validatePassword(organizationData.password).errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="org-confirm-password">Confirm Password *</FieldLabel>
                <Input
                  id="org-confirm-password"
                  type="password"
                  value={organizationData.confirmPassword}
                  onChange={(e) => setOrganizationData({ ...organizationData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Organization Account"}
              </Button>
            </div>

            <div className="mt-2 text-center">
              <FieldDescription>
                Already have an account?{" "}
                <Link 
                  href="/login" 
                  className="text-primary underline underline-offset-4 hover:no-underline font-medium transition-all duration-300 hover:opacity-80"
                >
                  Sign in
                </Link>
              </FieldDescription>
            </div>
          </form>
        </TabsContent>
      </FieldGroup>
    </Tabs>
  )
}
