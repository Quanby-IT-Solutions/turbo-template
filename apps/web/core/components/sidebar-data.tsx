"use client"

import {
  IconBell,
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconClock,
  IconDashboard,
  IconDatabase,
  IconFlask,
  IconFolder,
  IconHelp,
  IconReport,
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
  IconVideo,
  IconCreditCard,
  IconFileWord,
  IconFileText,
} from "@tabler/icons-react"
import type { SidebarData } from "@/core/lib/sidebar-data"
import { getUser } from "@/services/api/client"

// Helper function to get user data from localStorage or return defaults
function getUserData(): { name: string; email: string; avatar: string } {
  const user = getUser()
  if (user) {
    const firstName = (user.firstName as string) || ""
    const lastName = (user.lastName as string) || ""
    const fullName = (user.fullName as string) || `${firstName} ${lastName}`.trim() || user.email || "User"
    return {
      name: fullName,
      email: user.email || "",
      avatar: (user.avatar as string) || "/avatars/shadcn.jpg",
    }
  }
  return {
    name: "User",
    email: "",
    avatar: "/avatars/shadcn.jpg",
  }
}

// Shared secondary navigation items (same for all roles)
function getNavSecondary() {
  return [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ]
}

// Super Admin sidebar data
export function getSuperAdminSidebarData(): SidebarData {
  return {
    user: getUserData(),
    brandName: "QHealth",
    brandUrl: "/super-admin",
    navMain: [
      {
        title: "Dashboard",
        url: "/super-admin",
        icon: IconDashboard,
      },
      {
        title: "Subscription Management",
        url: "/super-admin/subscriptions",
        icon: IconCreditCard,
      },
      {
        title: "Organization Management",
        url: "/super-admin/organization",
        icon: IconSettings,
      },
      {
        title: "Doctor Management",
        url: "/super-admin/doctors",
        icon: IconBriefcase,
      },
      {
        title: "Patient Management",
        url: "/super-admin/patients",
        icon: IconUsers,
      },
      {
        title: "Notifications",
        url: "/super-admin/notifications",
        icon: IconBell,
      },
    ],
    navDocuments: [
      {
        title: "Data Library",
        url: "/super-admin/audit-logs",
        icon: IconDatabase,
      },
      {
        title: "Reports",
        url: "/super-admin/reports",
        icon: IconReport,
      },
    ],
    navSecondary: getNavSecondary(),
  }
}

// Admin sidebar data
export function getAdminSidebarData(): SidebarData {
  return {
    user: getUserData(),
    brandName: "QHealth",
    brandUrl: "/admin",
    navMain: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: IconDashboard,
      },
      {
        title: "My Profile",
        url: "/admin/profile",
        icon: IconUser,
      },
      {
        title: "Schedule Management",
        url: "/admin/schedule",
        icon: IconClock,
      },
      {
        title: "System Administration",
        url: "/admin/system",
        icon: IconSettings,
        subItems: [
          {
            title: "Settings",
            url: "/admin/system/settings",
          },
          {
            title: "Users",
            url: "/admin/system/users",
          },
          {
            title: "Permissions",
            url: "/admin/system/permissions",
          },
        ],
      },
      {
        title: "Doctor Management",
        url: "/admin/doctors",
        icon: IconBriefcase,
      },
      {
        title: "Notifications",
        url: "/admin/notifications",
        icon: IconBell,
      },
    ],
    navDocuments: [
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: IconFileText,
      },
      {
        title: "Reports",
        url: "/admin/reports",
        icon: IconReport,
      },
    ],
    navSecondary: getNavSecondary(),
  }
}

// Doctor sidebar data
export function getDoctorSidebarData(): SidebarData {
  return {
    user: getUserData(),
    brandName: "QHealth",
    brandUrl: "/doctor/dashboard",
    navMain: [
      {
        title: "Dashboard",
        url: "/doctor/dashboard",
        icon: IconDashboard,
      },
      {
        title: "My Profile",
        url: "/doctor/profile",
        icon: IconUser,
      },
      {
        title: "Meet Patients",
        url: "/doctor/meet-patients",
        icon: IconVideo,
      },
      {
        title: "My Schedule",
        url: "/doctor/schedule",
        icon: IconClock,
      },
      {
        title: "Patient Records",
        url: "/doctor/patient-records",
        icon: IconFolder,
      },
      {
        title: "Lab Request Management",
        url: "/doctor/lab-requests",
        icon: IconFlask,
      },
      {
        title: "Notifications",
        url: "/doctor/notifications",
        icon: IconBell,
      },
    ],
    navDocuments: [
      {
        title: "Patient Records",
        url: "/doctor/patient-records",
        icon: IconFileText,
      },
      {
        title: "Lab Requests",
        url: "/doctor/lab-requests",
        icon: IconFlask,
      },
    ],
    navSecondary: getNavSecondary(),
  }
}

// Patient sidebar data
export function getPatientSidebarData(): SidebarData {
  return {
    user: getUserData(),
    brandName: "QHealth",
    brandUrl: "/patient/dashboard",
    navMain: [
      {
        title: "Dashboard",
        url: "/patient/dashboard",
        icon: IconDashboard,
      },
      {
        title: "My Profile",
        url: "/patient/profile",
        icon: IconUser,
      },
      {
        title: "Meet Doctor",
        url: "/patient/meet-doctor",
        icon: IconVideo,
      },
      {
        title: "Schedule",
        url: "/patient/schedule",
        icon: IconCalendar,
      },
      {
        title: "Medical Records",
        url: "/patient/medical-records",
        icon: IconFolder,
      },
      {
        title: "Self Check",
        url: "/patient/self-check",
        icon: IconCheck,
      },
      {
        title: "Lab Request Management",
        url: "/patient/lab-requests",
        icon: IconFlask,
      },
      {
        title: "Notifications",
        url: "/patient/notifications",
        icon: IconBell,
      },
    ],
    navDocuments: [
      {
        title: "Medical Records",
        url: "/patient/medical-records",
        icon: IconFileText,
      },
      {
        title: "Lab Requests",
        url: "/patient/lab-requests",
        icon: IconFlask,
      },
    ],
    navSecondary: getNavSecondary(),
  }
}

// Organization sidebar data
export function getOrganizationSidebarData(): SidebarData {
  return {
    user: getUserData(),
    brandName: "QHealth",
    brandUrl: "/organization/dashboard",
    navMain: [
      {
        title: "Dashboard",
        url: "/organization/dashboard",
        icon: IconDashboard,
      },
      {
        title: "Profile",
        url: "/organization/profile",
        icon: IconUser,
      },
      {
        title: "Doctor Management",
        url: "/organization/doctor",
        icon: IconBriefcase,
      },
      {
        title: "Schedule Management",
        url: "/organization/schedule",
        icon: IconCalendar,
      },
      {
        title: "Notifications",
        url: "/organization/notifications",
        icon: IconBell,
      },
    ],
    navDocuments: [
      {
        title: "Reports",
        url: "/organization/reports",
        icon: IconReport,
      },
      {
        title: "Documents",
        url: "/organization/documents",
        icon: IconFileWord,
      },
    ],
    navSecondary: getNavSecondary(),
  }
}
