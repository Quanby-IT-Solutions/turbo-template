"use client"

import { AppSidebar } from "./app-sidebar"
import { getSuperAdminSidebarData, getAdminSidebarData, getDoctorSidebarData, getPatientSidebarData, getOrganizationSidebarData } from "./sidebar-data"

export type Role = "super-admin" | "admin" | "doctor" | "patient" | "organization"

interface SidebarWrapperProps extends Omit<React.ComponentProps<typeof AppSidebar>, "data"> {
  role: Role
}

export function SidebarWrapper({ role, ...props }: SidebarWrapperProps) {
  const getData = () => {
    switch (role) {
      case "super-admin":
        return getSuperAdminSidebarData()
      case "admin":
        return getAdminSidebarData()
      case "organization":
        return getOrganizationSidebarData()
      case "doctor":
        return getDoctorSidebarData()
      case "patient":
        return getPatientSidebarData()
      default:
        return getAdminSidebarData()
    }
  }
  
  const data = getData()
  return <AppSidebar data={data} {...props} />
}
