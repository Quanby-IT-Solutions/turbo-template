"use client"

import * as React from "react"
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Label } from "@/core/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"

// Mock data for doctors
const doctors = [
  {
    id: 1,
    name: "Carlos Miguel Rodriguez",
    credentials: "MD, Diplomate of Pediatrics, Fellow in Pediatric Cardiology",
    email: "dr.rodriguez@metrogeneral.com",
    specialization: "Pediatric Cardiology & Neonatology",
    experience: "10 years",
    contact: "+63-917-567-8901",
    status: "Active",
  },
  {
    id: 2,
    name: "Michael David Williams",
    credentials: "MD, PhD, FAAN, Diplomate of Neurology, Fellow in Stroke Neurology",
    email: "dr.williams@metrogeneral.com",
    specialization: "Stroke Neurology & Neurocritical Care",
    experience: "18 years",
    contact: "+63-917-345-6789",
    status: "Active",
  },
]

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [specializationFilter, setSpecializationFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [minExperience, setMinExperience] = React.useState("0")
  const [maxExperience, setMaxExperience] = React.useState("50")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = 
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpecialization = 
      !specializationFilter || 
      doctor.specialization.toLowerCase().includes(specializationFilter.toLowerCase())
    const exp = parseInt(doctor.experience)
    const matchesExperience = 
      exp >= parseInt(minExperience) && exp <= parseInt(maxExperience)
    return matchesSearch && matchesSpecialization && matchesExperience
  })

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex)
  const startResult = filteredDoctors.length > 0 ? startIndex + 1 : 0
  const endResult = Math.min(endIndex, filteredDoctors.length)

  const handleClearFilters = () => {
    setSearchQuery("")
    setSpecializationFilter("")
    setCategoryFilter("all")
    setMinExperience("0")
    setMaxExperience("50")
    setCurrentPage(1)
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
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Doctor Management" 
          description="Manage all doctors in the QHealth system"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header with Add Doctor button */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Doctor Management</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage all doctors in the QHealth system
                    </p>
                  </div>
                  <Button>
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add New Doctor
                  </Button>
                </div>

                {/* Filter Section */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Filter Doctors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <Label htmlFor="search" className="mb-2 block text-sm font-medium">
                          Search
                        </Label>
                        <Input
                          id="search"
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialization" className="mb-2 block text-sm font-medium">
                          Specialization
                        </Label>
                        <Input
                          id="specialization"
                          placeholder="Filter by specialization..."
                          value={specializationFilter}
                          onChange={(e) => {
                            setSpecializationFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="mb-2 block text-sm font-medium">
                          Category
                        </Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="neurology">Neurology</SelectItem>
                            <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="min-exp" className="mb-2 block text-sm font-medium">
                          Min Experience (years)
                        </Label>
                        <Input
                          id="min-exp"
                          type="number"
                          value={minExperience}
                          onChange={(e) => {
                            setMinExperience(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-exp" className="mb-2 block text-sm font-medium">
                          Max Experience (years)
                        </Label>
                        <Input
                          id="max-exp"
                          type="number"
                          value={maxExperience}
                          onChange={(e) => {
                            setMaxExperience(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" onClick={handleClearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Doctors Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Doctors</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Showing {filteredDoctors.length} of {filteredDoctors.length} doctors
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>NAME</TableHead>
                          <TableHead>EMAIL</TableHead>
                          <TableHead>SPECIALIZATION</TableHead>
                          <TableHead>EXPERIENCE</TableHead>
                          <TableHead>CONTACT</TableHead>
                          <TableHead>STATUS</TableHead>
                          <TableHead className="text-right">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDoctors.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No doctors found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDoctors.map((doctor) => (
                            <TableRow key={doctor.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{doctor.name}</p>
                                  <p className="text-sm text-muted-foreground">{doctor.credentials}</p>
                                </div>
                              </TableCell>
                              <TableCell>{doctor.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  {doctor.specialization}
                                </Badge>
                              </TableCell>
                              <TableCell>{doctor.experience}</TableCell>
                              <TableCell>{doctor.contact}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                  {doctor.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary">
                                    <IconEye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-600">
                                    <IconEdit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <IconTrash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startResult} to {endResult} of {filteredDoctors.length} results
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="disabled:text-muted-foreground"
                      >
                        <IconChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                      >
                        1
                      </Button>
                      {totalPages > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(2)}
                        >
                          2
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="disabled:text-muted-foreground"
                      >
                        Next
                        <IconChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
