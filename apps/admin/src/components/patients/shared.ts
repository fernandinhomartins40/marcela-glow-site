import type { Tone } from '../../lib/ui'

/**
 * Tipos e vocabulario do cadastro de paciente.
 *
 * Ficam fora dos componentes porque lista, formulario e ficha descrevem a mesma
 * pessoa: uma copia por arquivo divergiria na primeira mudanca de contrato.
 * Tambem sao importados por Clinical e pelo Atendimento.
 */

export interface Patient {
  id: string
  name: string
  email: string
  phone: string | null
  birthDate: string | null
  notes: string | null
  isActive: boolean
  createdAt: string

  cpf: string | null
  rg: string | null
  socialName: string | null
  gender: string | null
  maritalStatus: string | null
  occupation: string | null
  nationality: string | null

  zipCode: string | null
  street: string | null
  streetNumber: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null

  emergencyName: string | null
  emergencyPhone: string | null
  emergencyRelation: string | null

  allergies: string | null
  medications: string | null
  conditions: string | null
  surgeries: string | null
  bloodType: string | null
  isPregnant: boolean
  isBreastfeeding: boolean
  skinType: string | null

  insuranceName: string | null
  insuranceNumber: string | null
  referralSource: string | null
  referredBy: string | null
  lgpdConsentAt: string | null
  imageConsentAt: string | null

  _count?: { appointments: number; records: number; sessions: number; prescriptions: number }
}

export const GENDERS = [
  ['FEMALE', 'Feminino'],
  ['MALE', 'Masculino'],
  ['NON_BINARY', 'Não binário'],
  ['UNDISCLOSED', 'Prefere não informar'],
] as const

export const MARITAL_STATUSES = [
  ['SINGLE', 'Solteira'],
  ['MARRIED', 'Casada'],
  ['STABLE_UNION', 'União estável'],
  ['DIVORCED', 'Divorciada'],
  ['WIDOWED', 'Viúva'],
] as const

export const BLOOD_TYPES = [
  ['A_POSITIVE', 'A+'],
  ['A_NEGATIVE', 'A−'],
  ['B_POSITIVE', 'B+'],
  ['B_NEGATIVE', 'B−'],
  ['AB_POSITIVE', 'AB+'],
  ['AB_NEGATIVE', 'AB−'],
  ['O_POSITIVE', 'O+'],
  ['O_NEGATIVE', 'O−'],
] as const

export const REFERRAL_SOURCES = [
  'Instagram',
  'Indicação de paciente',
  'Google',
  'Facebook',
  'Passou em frente',
  'Outro',
]

export function labelOf(pairs: readonly (readonly [string, string])[], value?: string | null) {
  return pairs.find(([id]) => id === value)?.[1] ?? null
}

export const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  notes: '',
  cpf: '',
  rg: '',
  socialName: '',
  gender: '',
  maritalStatus: '',
  occupation: '',
  nationality: '',
  zipCode: '',
  street: '',
  streetNumber: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  allergies: '',
  medications: '',
  conditions: '',
  surgeries: '',
  bloodType: '',
  isPregnant: false,
  isBreastfeeding: false,
  skinType: '',
  insuranceName: '',
  insuranceNumber: '',
  referralSource: '',
  referredBy: '',
  lgpdConsent: false,
  imageConsent: false,
}

export type PatientFormState = typeof EMPTY_FORM
