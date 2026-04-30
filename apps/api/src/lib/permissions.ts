import type { Permission, UserRole } from '@marcela/database'

export const rolePermissions: Record<UserRole | 'PATIENT', Permission[]> = {
  ADMIN: [
    'DASHBOARD_READ',
    'PATIENT_READ',
    'PATIENT_WRITE',
    'RECORD_READ',
    'RECORD_WRITE',
    'APPOINTMENT_READ',
    'APPOINTMENT_WRITE',
    'LEAD_READ',
    'LEAD_WRITE',
    'PRESCRIPTION_READ',
    'PRESCRIPTION_WRITE',
    'PRESCRIPTION_SIGN',
    'CMS_READ',
    'CMS_WRITE',
    'NOTIFICATION_SEND',
    'SETTINGS_READ',
    'SETTINGS_WRITE',
    'USER_MANAGE',
    'AUDIT_READ',
    'FILE_MANAGE',
  ],
  DOCTOR: [
    'DASHBOARD_READ',
    'PATIENT_READ',
    'PATIENT_WRITE',
    'RECORD_READ',
    'RECORD_WRITE',
    'APPOINTMENT_READ',
    'APPOINTMENT_WRITE',
    'PRESCRIPTION_READ',
    'PRESCRIPTION_WRITE',
    'PRESCRIPTION_SIGN',
    'FILE_MANAGE',
  ],
  STAFF: ['DASHBOARD_READ', 'PATIENT_READ', 'APPOINTMENT_READ', 'APPOINTMENT_WRITE', 'LEAD_READ', 'LEAD_WRITE'],
  RECEPTION: ['DASHBOARD_READ', 'PATIENT_READ', 'PATIENT_WRITE', 'APPOINTMENT_READ', 'APPOINTMENT_WRITE', 'LEAD_READ', 'LEAD_WRITE'],
  ASSISTANT: ['PATIENT_READ', 'RECORD_READ', 'APPOINTMENT_READ', 'FILE_MANAGE'],
  CONTENT_EDITOR: ['CMS_READ', 'CMS_WRITE'],
  FINANCE: ['DASHBOARD_READ', 'PATIENT_READ', 'APPOINTMENT_READ', 'SETTINGS_READ'],
  PATIENT: [],
}

export function effectivePermissions(role: UserRole | 'PATIENT', overrides: Permission[] = []): Permission[] {
  return [...new Set([...(rolePermissions[role] ?? []), ...overrides])]
}
