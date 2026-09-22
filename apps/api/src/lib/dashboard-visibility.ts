import type { JwtPayload } from './jwt'

/** Permissões da central do dia não substituem as permissões de cada domínio. */
export function dashboardVisibility(user: Pick<JwtPayload, 'role' | 'permissions'>) {
  const pode = (permission: string) =>
    user.role === 'ADMIN' || (user.permissions?.includes(permission) ?? false)

  return {
    agendamentos: pode('APPOINTMENT_READ'),
    confirmarAgendamentos: pode('APPOINTMENT_WRITE'),
    assinarReceitas: pode('PRESCRIPTION_SIGN'),
    gerirLeads: pode('LEAD_WRITE'),
    lerLeads: pode('LEAD_READ'),
    lerPacientes: pode('PATIENT_READ'),
    financeiro: pode('FINANCE_OPERATE') || pode('FINANCE_MANAGE'),
  }
}
