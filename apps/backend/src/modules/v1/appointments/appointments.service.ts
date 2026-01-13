import { ForbiddenException, Inject, Injectable } from "@nestjs/common"
import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { appointmentRequests, doctorInfos, doctorSchedules, patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class AppointmentsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: any) {
		return this.db.select().from(appointmentRequests).limit(query.limit || 10).offset(query.offset || 0)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(appointmentRequests)
			.where(eq(appointmentRequests.id, id))
			.limit(1)
		return result
	}

	async getOrganizationAppointments(user: any) {
		const orgId = user?.organizationId
		if (!orgId) {
			throw new ForbiddenException("Organization not found for this account")
		}

		// Find all doctors in this organization
		const doctors = await this.db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.role, "DOCTOR" as const)))

		const doctorIds = doctors.map(d => d.id)

		// Get all appointments for doctors in this organization
		const appointmentsData = doctorIds.length > 0
			? await this.db
					.select({
						appointmentId: appointmentRequests.id,
						patientId: appointmentRequests.patientId,
						doctorId: appointmentRequests.doctorId,
						requestedDate: appointmentRequests.requestedDate,
						requestedTime: appointmentRequests.requestedTime,
						reason: appointmentRequests.reason,
						status: appointmentRequests.status,
						priority: appointmentRequests.priority,
						notes: appointmentRequests.notes,
						consultationId: appointmentRequests.consultationId,
						createdAt: appointmentRequests.createdAt,
						updatedAt: appointmentRequests.updatedAt,
						doctorEmail: users.email,
						doctorFirstName: doctorInfos.firstName,
						doctorLastName: doctorInfos.lastName,
						doctorSpecialization: doctorInfos.specialization,
					})
					.from(appointmentRequests)
					.innerJoin(users, eq(appointmentRequests.doctorId, users.id))
					.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
					.where(inArray(appointmentRequests.doctorId, doctorIds))
					.orderBy(desc(appointmentRequests.requestedDate), desc(appointmentRequests.requestedTime))
			: []

		// Get patient info for each appointment
		const patientIds = [...new Set(appointmentsData.map(a => a.patientId))]
		const patientsData =
			patientIds.length > 0
				? await this.db
						.select({
							userId: users.id,
							email: users.email,
							patientFirstName: patientInfos.firstName,
							patientMiddleName: patientInfos.middleName,
							patientLastName: patientInfos.lastName,
						})
						.from(users)
						.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
						.where(inArray(users.id, patientIds))
				: []

		const patientsMap = new Map(patientsData.map(p => [p.userId, p]))

		// Format appointments
		const appointments = appointmentsData.map(appointment => {
			const patient = patientsMap.get(appointment.patientId)

			return {
				id: appointment.appointmentId,
				patientId: appointment.patientId,
				doctorId: appointment.doctorId,
				requestedDate: appointment.requestedDate instanceof Date
					? appointment.requestedDate.toISOString()
					: appointment.requestedDate,
				requestedTime: appointment.requestedTime,
				reason: appointment.reason,
				status: appointment.status,
				priority: appointment.priority,
				notes: appointment.notes,
				consultationId: appointment.consultationId,
				createdAt:
					appointment.createdAt instanceof Date
						? appointment.createdAt.toISOString()
						: appointment.createdAt,
				updatedAt:
					appointment.updatedAt instanceof Date
						? appointment.updatedAt.toISOString()
						: appointment.updatedAt,
				doctor: {
					id: appointment.doctorId,
					email: appointment.doctorEmail,
					doctorInfo: {
						firstName: appointment.doctorFirstName,
						lastName: appointment.doctorLastName,
						specialization: appointment.doctorSpecialization,
					},
				},
				patient: patient
					? {
							id: patient.userId,
							email: patient.email,
							patientInfo: {
								firstName: patient.patientFirstName,
								middleName: patient.patientMiddleName,
								lastName: patient.patientLastName,
							},
						}
					: null,
			}
		})

		const total = appointments.length

		return {
			items: appointments,
			total,
			page: 1,
			limit: total,
			totalPages: 1,
		}
	}

	async getMyAppointments(user: any, query: any = {}) {
		const userId = user?.userId || user?.id
		const userRole = user?.role
		const limit = query?.limit ? parseInt(query.limit, 10) : 50
		const page = query?.page ? parseInt(query.page, 10) : 1
		const pageNum = Math.max(page, 1)
		const limitNum = Math.min(Math.max(limit, 1), 100)
		const offset = (pageNum - 1) * limitNum

		if (!userId || !userRole) {
			throw new ForbiddenException("User information not found")
		}

		// Build where condition based on user role
		let whereCondition: any
		if (userRole === "DOCTOR") {
			whereCondition = eq(appointmentRequests.doctorId, userId)
		} else if (userRole === "PATIENT") {
			whereCondition = eq(appointmentRequests.patientId, userId)
		} else {
			throw new ForbiddenException("Invalid role for this endpoint")
		}

		// Optionally filter by status if provided
		if (query.status) {
			whereCondition = and(whereCondition, eq(appointmentRequests.status, query.status as any))
		}

		// Get appointments with doctor and patient info
		const appointmentsData = await this.db
			.select({
				appointmentId: appointmentRequests.id,
				patientId: appointmentRequests.patientId,
				doctorId: appointmentRequests.doctorId,
				requestedDate: appointmentRequests.requestedDate,
				requestedTime: appointmentRequests.requestedTime,
				reason: appointmentRequests.reason,
				status: appointmentRequests.status,
				priority: appointmentRequests.priority,
				notes: appointmentRequests.notes,
				consultationId: appointmentRequests.consultationId,
				createdAt: appointmentRequests.createdAt,
				updatedAt: appointmentRequests.updatedAt,
				doctorEmail: users.email,
				doctorFirstName: doctorInfos.firstName,
				doctorLastName: doctorInfos.lastName,
				doctorSpecialization: doctorInfos.specialization,
			})
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.doctorId, users.id))
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(whereCondition)
			.orderBy(desc(appointmentRequests.requestedDate), desc(appointmentRequests.requestedTime))
			.limit(limitNum)
			.offset(offset)

		// Get patient info separately
		const patientIds = [...new Set(appointmentsData.map(a => a.patientId))]
		const patientsData =
			patientIds.length > 0
				? await this.db
						.select({
							userId: users.id,
							email: users.email,
							patientFirstName: patientInfos.firstName,
							patientMiddleName: patientInfos.middleName,
							patientLastName: patientInfos.lastName,
						})
						.from(users)
						.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
						.where(inArray(users.id, patientIds))
				: []

		const patientsMap = new Map(patientsData.map(p => [p.userId, p]))

		// Format appointments
		const appointments = appointmentsData.map(appointment => {
			const patient = patientsMap.get(appointment.patientId)

			return {
				id: appointment.appointmentId,
				patientId: appointment.patientId,
				doctorId: appointment.doctorId,
				requestedDate: appointment.requestedDate instanceof Date
					? appointment.requestedDate.toISOString()
					: appointment.requestedDate,
				requestedTime: appointment.requestedTime,
				reason: appointment.reason,
				status: appointment.status,
				priority: appointment.priority,
				notes: appointment.notes,
				consultationId: appointment.consultationId,
				createdAt:
					appointment.createdAt instanceof Date
						? appointment.createdAt.toISOString()
						: appointment.createdAt,
				updatedAt:
					appointment.updatedAt instanceof Date
						? appointment.updatedAt.toISOString()
						: appointment.updatedAt,
				doctor: {
					id: appointment.doctorId,
					email: appointment.doctorEmail,
					doctorInfo: {
						firstName: appointment.doctorFirstName,
						lastName: appointment.doctorLastName,
						specialization: appointment.doctorSpecialization,
					},
				},
				patient: patient
					? {
							id: patient.userId,
							email: patient.email,
							patientInfo: {
								firstName: patient.patientFirstName,
								middleName: patient.patientMiddleName,
								lastName: patient.patientLastName,
							},
						}
					: null,
			}
		})

		// Get total count
		const countResult = await this.db
			.select({ count: sql<number>`count(*)::int`.as("count") })
			.from(appointmentRequests)
			.where(whereCondition)

		const total = countResult[0]?.count || 0

		return {
			items: appointments,
			total,
			page: pageNum,
			limit: limitNum,
			totalPages: Math.ceil(total / limitNum) || 1,
		}
	}

	async getAvailableDoctors() {
		const doctors = await this.db
			.select({
				id: users.id,
				email: users.email,
				firstName: doctorInfos.firstName,
				lastName: doctorInfos.lastName,
				specialization: doctorInfos.specialization,
			})
			.from(users)
			.innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
			.where(eq(users.role, "DOCTOR" as const))
	
		return doctors.map(doctor => ({
			id: doctor.id,
			name: `${doctor.firstName} ${doctor.lastName}`,
			specialization: doctor.specialization || 'General Practice',
		}))
	}

async getDoctorAvailability(doctorId: string) {
  // Verify doctor exists
  const [doctor] = await this.db
    .select({
      id: users.id,
      email: users.email,
      firstName: doctorInfos.firstName,
      lastName: doctorInfos.lastName,
      specialization: doctorInfos.specialization,
    })
    .from(users)
    .innerJoin(doctorInfos, eq(users.id, doctorInfos.userId))
    .where(and(eq(users.id, doctorId), eq(users.role, "DOCTOR" as const)))
    .limit(1)

  if (!doctor) {
    throw new ForbiddenException("Doctor not found")
  }

  // Get doctor's schedule
  const schedules = await this.db
    .select()
    .from(doctorSchedules)
    .where(and(
      eq(doctorSchedules.doctorId, doctorId),
      eq(doctorSchedules.isAvailable, true)
    ))

  if (schedules.length === 0) {
    return []
  }

  // Create a map of schedules by day of week
  const scheduleMap = new Map()
  schedules.forEach(schedule => {
    const startTime = new Date(schedule.startTime)
    const endTime = new Date(schedule.endTime)
    
    // Use UTC methods to avoid timezone conversion issues
    scheduleMap.set(schedule.dayOfWeek.toUpperCase(), {
      startTime: `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`,
      endTime: `${endTime.getUTCHours().toString().padStart(2, '0')}:${endTime.getUTCMinutes().toString().padStart(2, '0')}`,
      isAvailable: schedule.isAvailable,
    })
  })

  // Map day names to what frontend expects
  const dayOfWeekMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  // Return availability for each day of the week
  const availability = dayOfWeekMap.map((dayName, index) => {
    const dayKey = dayName.toUpperCase()
    const schedule = scheduleMap.get(dayKey)
    
    if (schedule) {
      return {
        dayOfWeek: dayName,
        isAvailable: true,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }
    } else {
      return {
        dayOfWeek: dayName,
        isAvailable: false,
        startTime: null,
        endTime: null,
      }
    }
  })

  return availability
}

async getDoctorAvailableTimeSlots(doctorId: string, date: string) {
  // Verify doctor exists
  const [doctor] = await this.db
    .select()
    .from(users)
    .where(and(eq(users.id, doctorId), eq(users.role, "DOCTOR" as const)))
    .limit(1)

  if (!doctor) {
    throw new ForbiddenException("Doctor not found")
  }

  // Parse the date and get day of week
  const selectedDate = new Date(`${date}T00:00:00Z`) // Parse as UTC
  const dayOfWeekMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const dayIndex = selectedDate.getUTCDay() // Use UTC day
  const dayOfWeek = dayOfWeekMap[dayIndex]

  // Ensure dayOfWeek is defined
  if (!dayOfWeek) {
    throw new ForbiddenException("Invalid date")
  }

  console.log('Looking for schedule on:', dayOfWeek, 'for date:', date)

  // Get doctor's schedule for this day
  const [schedule] = await this.db
    .select()
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isAvailable, true)
      )
    )
    .limit(1)

  if (!schedule) {
    console.log('No schedule found for', dayOfWeek)
    return [] // Doctor not available on this day
  }

  console.log('Found schedule:', schedule)

  // Get all booked appointments for this doctor on this date
  const appointments = await this.db
    .select({
      requestedTime: appointmentRequests.requestedTime,
      requestedDate: appointmentRequests.requestedDate,
    })
    .from(appointmentRequests)
    .where(
      and(
        eq(appointmentRequests.doctorId, doctorId),
        inArray(appointmentRequests.status, ["PENDING", "CONFIRMED", "RESCHEDULED"])
      )
    )

  console.log('All appointments for doctor:', appointments)

  // Filter appointments by date in JavaScript (more reliable than SQL date comparison)
  const bookedTimes = new Set(
    appointments
      .filter(apt => {
        const requestedDate = apt.requestedDate as Date | string | null
        let aptDate: string | null = null
        
        if (requestedDate instanceof Date) {
          aptDate = requestedDate?.toISOString().split('T')[0] || null;
        } else if (typeof requestedDate === 'string') {
          aptDate = requestedDate?.split('T')[0] || null;
        }
        
        if (!aptDate) {
          return false
        }
        
        const matches = aptDate === date
        if (matches) {
          console.log('Booked time found:', apt.requestedTime, 'on', aptDate)
        }
        return matches
      })
      .map(apt => apt.requestedTime)
  )

  console.log('Booked times for', date, ':', Array.from(bookedTimes))

  // Generate time slots - use UTC methods to avoid timezone issues
  const startTime = new Date(schedule.startTime)
  const endTime = new Date(schedule.endTime)
  
  const startMinutes = startTime.getUTCHours() * 60 + startTime.getUTCMinutes()
  const endMinutes = endTime.getUTCHours() * 60 + endTime.getUTCMinutes()
  
  console.log('Start minutes:', startMinutes, 'End minutes:', endMinutes)

  const slotDuration = 30 // minutes
  const availableSlots: string[] = []
  
  let currentTime = startMinutes
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const isToday = date === today
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  console.log('Is today:', isToday, 'Current time:', currentMinutes)

  while (currentTime < endMinutes) {
    const hours = Math.floor(currentTime / 60)
    const minutes = currentTime % 60
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    
    // Skip if slot is booked
    if (bookedTimes.has(timeString)) {
      console.log('Skipping booked slot:', timeString)
      currentTime += slotDuration
      continue
    }

    // Skip if slot is in the past (for today)
    if (isToday && currentTime <= currentMinutes) {
      console.log('Skipping past slot:', timeString)
      currentTime += slotDuration
      continue
    }

    availableSlots.push(timeString)
    currentTime += slotDuration
  }

  console.log('Available slots:', availableSlots)

  return availableSlots
}
}
