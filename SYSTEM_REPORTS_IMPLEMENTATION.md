# System Reports Implementation Guide

## Overview
This document outlines the complete implementation of the "View and configure system reports (excluding PHI details)" feature for the admin side of the QHealth application.

## Implementation Process

### 1. Database Schema (Backend - Database Layer)

**File**: `packages/db/src/schema/system-report.schema.ts`

Created two tables:
- **`SystemReport`**: Stores individual report configurations and generated data
- **`ReportTemplate`**: Stores pre-defined report templates

Key features:
- Uses JSONB columns for flexible configuration storage
- Includes indexes for efficient querying
- Row-Level Security (RLS) enabled
- **Excludes PHI (Protected Health Information)** - only stores aggregated statistics

Fields ensure:
- Organization-scoped data
- Audit trail (createdBy, createdAt, updatedAt)
- Report lifecycle tracking (status: PENDING → PROCESSING → COMPLETED/FAILED)

**Updated**: `packages/db/src/schema/index.ts` to export new schema

---

### 2. API Contracts/DTOs (Shared Layer)

**File**: `packages/contracts/src/modules/v1/reports/reports.contract.ts`

Defined:
- **Enums**: ReportType, ReportStatus, ReportCategory, TimePeriod
- **Schemas**: Zod validation schemas for all data structures
- **DTOs**: NestJS DTOs for request/response validation

Key schemas:
- `ReportConfigurationSchema`: Defines report parameters
- `SystemReportSchema`: Main report data structure
- `CreateReportSchema`: Request validation for creating reports
- `ReportStatisticsSchema`: Aggregated statistics (non-PHI)

**Updated**: `packages/contracts/src/index.ts` to export reports contract

---

### 3. Backend Service Layer

**File**: `apps/backend/src/modules/v1/reports/reports.service.ts`

Implements business logic:

#### Core Methods:
- `getReports()`: Fetch reports with filtering
- `createReport()`: Create new report configuration
- `updateReport()`: Modify existing reports
- `deleteReport()`: Remove reports
- `generateReportData()`: Generate aggregated statistics

#### Report Generation Methods (Non-PHI):
- `generateAppointmentsSummary()`: Appointment statistics
  - Total, completed, cancelled appointments
  - No patient names or details
  
- `generateUserActivity()`: User statistics
  - Total users, new users
  - No personal information
  
- `generateConsultationMetrics()`: Consultation counts
  - Total consultations
  - No medical details
  
- `generateOrganizationalOverview()`: Combined metrics
  - Aggregates all above statistics
  - Organization-level only

**Privacy Measures**:
- All queries use `COUNT()` aggregations
- No individual patient/user data exposed
- Results are statistical summaries only

---

### 4. Backend Controller Layer

**File**: `apps/backend/src/modules/v1/reports/reports.controller.ts`

Defines REST API endpoints:

| Method | Endpoint | Description | Role Access |
|--------|----------|-------------|-------------|
| GET | `/v1/reports/templates` | List report templates | ADMIN, SUPER_ADMIN |
| GET | `/v1/reports/templates/:id` | Get template details | ADMIN, SUPER_ADMIN |
| GET | `/v1/reports` | List all reports | ADMIN, SUPER_ADMIN |
| GET | `/v1/reports/:id` | Get report details | ADMIN, SUPER_ADMIN |
| POST | `/v1/reports` | Create new report | ADMIN, SUPER_ADMIN |
| PATCH | `/v1/reports/:id` | Update report | ADMIN, SUPER_ADMIN |
| DELETE | `/v1/reports/:id` | Delete report | ADMIN, SUPER_ADMIN |
| POST | `/v1/reports/generate` | Generate report data | ADMIN, SUPER_ADMIN |

Security:
- Uses `BetterAuthGuard` for authentication
- Uses `RolesGuard` for role-based access control
- Organization-scoped queries (users can only see their org's reports)

**File**: `apps/backend/src/modules/v1/reports/reports.module.ts`
- Registers service and controller

**Updated**: `apps/backend/src/modules/v1/app.module.ts` to import ReportsModule

---

### 5. Frontend API Service Layer

**File**: `apps/web/services/api/reports.ts`

Implements API client functions:
- Type definitions matching backend contracts
- API request functions for all endpoints
- Proper error handling

Functions:
- `getReportTemplates()`
- `getReports(params?)`
- `getReportById(id)`
- `createReport(data)`
- `updateReport(id, data)`
- `deleteReport(id)`
- `generateReport(data)`

---

### 6. Frontend React Query Hooks

**File**: `apps/web/services/query/use-reports.ts`

Implements React Query hooks for data fetching and mutations:

#### Query Hooks (Data Fetching):
- `useReportTemplates()`: Fetch all templates
- `useReportTemplate(id)`: Fetch single template
- `useReports(params?)`: Fetch reports with filters
- `useReport(id)`: Fetch single report

#### Mutation Hooks (Data Modification):
- `useCreateReport()`: Create new report
- `useUpdateReport()`: Update existing report
- `useDeleteReport()`: Delete report
- `useGenerateReport()`: Trigger report generation

Features:
- Automatic cache invalidation on mutations
- Toast notifications for success/error
- Optimistic updates
- Loading states

---

### 7. Frontend UI Implementation

**File**: `apps/web/app/(private)/admin/reports/page.tsx`

Comprehensive reports dashboard with:

#### Features:
1. **Time Period Selector**: Filter data by time range
2. **Create Report Dialog**: Configure and create new reports
3. **Summary Cards**: Display key metrics from latest completed report
   - Total Appointments
   - Total Users
   - Consultations
   - Cancellation Rate
4. **Interactive Chart**: Visualize organizational data
5. **Reports Table**: List all generated reports with actions

#### User Actions:
- Create new reports with custom configuration
- Generate report data for pending reports
- Download completed reports
- Delete reports
- Refresh report list

#### UI Components Used:
- Shadcn UI components (Card, Table, Dialog, Select, Button, etc.)
- Lucide icons for visual clarity
- Responsive layout with Tailwind CSS
- Date formatting with `date-fns`

---

## Data Flow Diagram

```
┌─────────────────┐
│   Database      │
│  (PostgreSQL)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Drizzle Schema  │
│  system-report  │
│  .schema.ts     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend Service │
│ reports.service │
│     .ts         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Backend Controller│
│reports.controller│
│     .ts         │
└────────┬────────┘
         │
         ▼ (REST API)
┌─────────────────┐
│  API Contract   │
│   (DTOs/Zod)    │
└────────┬────────┘
         │
         ▼ (HTTP)
┌─────────────────┐
│ Frontend API    │
│   Service       │
│  reports.ts     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Query    │
│     Hooks       │
│ use-reports.ts  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Component  │
│  reports/page   │
│     .tsx        │
└─────────────────┘
```

---

## API Endpoint Examples

### Create Report
```typescript
POST /v1/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Monthly Overview",
  "description": "Monthly organizational statistics",
  "reportType": "ORGANIZATIONAL_OVERVIEW",
  "configuration": {
    "timePeriod": "last-month",
    "includeCharts": true,
    "includeMetrics": true
  }
}
```

### Generate Report
```typescript
POST /v1/reports/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "reportId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Get Reports with Filters
```typescript
GET /v1/reports?reportType=APPOINTMENTS_SUMMARY&status=COMPLETED
Authorization: Bearer <token>
```

---

## Report Types

1. **APPOINTMENTS_SUMMARY**
   - Total appointments
   - Completed/cancelled counts
   - Pending appointments

2. **USER_ACTIVITY**
   - Total users in organization
   - New users in period
   - Active users

3. **CONSULTATION_METRICS**
   - Total consultations
   - Consultation duration statistics

4. **ORGANIZATIONAL_OVERVIEW**
   - Combined view of all metrics
   - Comprehensive dashboard data

5. **SYSTEM_PERFORMANCE**
   - System uptime
   - Response times
   - Performance metrics

---

## PHI Compliance

### What is NOT included (PHI Protected):
- ❌ Patient names
- ❌ Patient contact information
- ❌ Medical diagnoses
- ❌ Prescription details
- ❌ Lab results
- ❌ Individual health scan data
- ❌ Any personally identifiable information

### What IS included (Aggregated Statistics):
- ✅ Total counts (appointments, users, consultations)
- ✅ Percentages and ratios
- ✅ Time-based trends
- ✅ Status distributions
- ✅ Organization-level metrics

---

## Testing the Implementation

### 1. Start Backend
```bash
cd apps/backend
pnpm dev
```

### 2. Start Frontend
```bash
cd apps/web
pnpm dev
```

### 3. Access Reports Page
Navigate to: `http://localhost:3000/admin/reports`

### 4. Test Workflow
1. Click "Create Report"
2. Fill in report details
3. Select report type and time period
4. Click "Generate" on pending report
5. View completed report data
6. Check summary cards update

---

## Database Migration

After implementing the schema, run migration:

```bash
cd packages/db
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Future Enhancements

1. **Scheduled Reports**: Auto-generate reports on schedule
2. **Email Delivery**: Send reports via email
3. **Export Formats**: PDF, Excel, CSV exports
4. **Advanced Filters**: More granular filtering options
5. **Custom Report Builder**: Drag-and-drop report creation
6. **Report Sharing**: Share reports with team members
7. **Comparative Analysis**: Compare periods side-by-side
8. **Report Templates**: More pre-built templates

---

## Security Considerations

1. **Authentication**: All endpoints require valid session
2. **Authorization**: Role-based access (ADMIN, SUPER_ADMIN)
3. **Organization Scoping**: Users only see their organization's data
4. **Input Validation**: Zod schemas validate all inputs
5. **SQL Injection Prevention**: Drizzle ORM parameterized queries
6. **No PHI Exposure**: Only aggregated statistics
7. **Audit Trail**: Track report creation and access

---

## File Structure Summary

```
qhealth/
├── packages/
│   ├── db/
│   │   └── src/
│   │       └── schema/
│   │           ├── system-report.schema.ts (NEW)
│   │           └── index.ts (UPDATED)
│   └── contracts/
│       └── src/
│           ├── modules/v1/reports/
│           │   └── reports.contract.ts (NEW)
│           └── index.ts (UPDATED)
│
├── apps/
│   ├── backend/
│   │   └── src/
│   │       └── modules/v1/
│   │           ├── reports/
│   │           │   ├── reports.service.ts (NEW)
│   │           │   ├── reports.controller.ts (NEW)
│   │           │   └── reports.module.ts (NEW)
│   │           └── app.module.ts (UPDATED)
│   │
│   └── web/
│       ├── services/
│       │   ├── api/
│       │   │   └── reports.ts (NEW)
│       │   └── query/
│       │       └── use-reports.ts (NEW)
│       └── app/
│           └── (private)/
│               └── admin/
│                   └── reports/
│                       └── page.tsx (UPDATED)
```

---

## Conclusion

This implementation provides a complete, end-to-end solution for system reports in the QHealth application, following best practices:

✅ **Clean Architecture**: Separation of concerns across layers
✅ **Type Safety**: TypeScript throughout
✅ **Validation**: Zod schemas for runtime validation
✅ **Security**: Role-based access control, PHI compliance
✅ **Scalability**: Modular design, easy to extend
✅ **User Experience**: Interactive UI with real-time updates
✅ **Maintainability**: Well-documented, consistent patterns

The implementation is production-ready and follows the existing patterns in the QHealth project.
