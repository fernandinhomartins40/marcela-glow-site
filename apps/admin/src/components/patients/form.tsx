import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CalendarDays,
  Download,
  FileText,
  HeartPulse,
  Mail,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
import {
  api,
  AttachmentsPanel,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FileUploadButton,
  formatDateBR,
  formatMoney,
  FormRow,
  isValidCPF,
  maskCEP,
  maskCPF,
  maskPhone,
  Modal,
  RowAction,
  SearchBox,
  SubmitButton,
  toDateInput,
  Toolbar,
  type Tone,
} from '../../lib/ui'
import { useDebounced } from '../../lib/useDebounced'
import { type PatientFormState, EMPTY_FORM, GENDERS, MARITAL_STATUSES, BLOOD_TYPES, REFERRAL_SOURCES, labelOf, type Patient } from './shared'

/**
 * Formulario da ficha da paciente, dividido em abas.
 * Cada aba e um recorte do mesmo cadastro - manter juntas evita salvar pela
 * metade quando a pessoa troca de aba no meio do preenchimento.
 */
export const FORM_TABS = [
  ['identification', 'Identificação'],
  ['address', 'Endereço'],
  ['clinical', 'Dados clínicos'],
  ['admin', 'Administrativo'],
] as const

type FormTab = (typeof FORM_TABS)[number][0]

/**
 * Ficha da paciente em quatro blocos. Só nome e e-mail são obrigatórios — a
 * recepção cadastra o essencial no balcão e completa o resto depois, sem que o
 * formulário trave.
 */
export function PatientForm({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tab, setTab] = React.useState<FormTab>('identification')
  const [form, setForm] = React.useState<PatientFormState>(
    patient
      ? {
          ...EMPTY_FORM,
          name: patient.name,
          email: patient.email,
          phone: patient.phone ? maskPhone(patient.phone) : '',
          birthDate: toDateInput(patient.birthDate),
          notes: patient.notes ?? '',
          cpf: patient.cpf ? maskCPF(patient.cpf) : '',
          rg: patient.rg ?? '',
          socialName: patient.socialName ?? '',
          gender: patient.gender ?? '',
          maritalStatus: patient.maritalStatus ?? '',
          occupation: patient.occupation ?? '',
          nationality: patient.nationality ?? '',
          zipCode: patient.zipCode ? maskCEP(patient.zipCode) : '',
          street: patient.street ?? '',
          streetNumber: patient.streetNumber ?? '',
          complement: patient.complement ?? '',
          district: patient.district ?? '',
          city: patient.city ?? '',
          state: patient.state ?? '',
          emergencyName: patient.emergencyName ?? '',
          emergencyPhone: patient.emergencyPhone ? maskPhone(patient.emergencyPhone) : '',
          emergencyRelation: patient.emergencyRelation ?? '',
          allergies: patient.allergies ?? '',
          medications: patient.medications ?? '',
          conditions: patient.conditions ?? '',
          surgeries: patient.surgeries ?? '',
          bloodType: patient.bloodType ?? '',
          isPregnant: patient.isPregnant ?? false,
          isBreastfeeding: patient.isBreastfeeding ?? false,
          skinType: patient.skinType ?? '',
          insuranceName: patient.insuranceName ?? '',
          insuranceNumber: patient.insuranceNumber ?? '',
          referralSource: patient.referralSource ?? '',
          referredBy: patient.referredBy ?? '',
          lgpdConsent: Boolean(patient.lgpdConsentAt),
          imageConsent: Boolean(patient.imageConsentAt),
        }
      : EMPTY_FORM,
  )

  const set = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        // A API guarda só dígitos; a pontuação é da tela
        phone: form.phone.replace(/\D/g, ''),
        cpf: form.cpf.replace(/\D/g, ''),
        zipCode: form.zipCode.replace(/\D/g, ''),
        emergencyPhone: form.emergencyPhone.replace(/\D/g, ''),
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : '',
        // Select vazio significa "não informado", não uma opção inválida
        gender: form.gender || null,
        maritalStatus: form.maritalStatus || null,
        bloodType: form.bloodType || null,
      }
      if (patient) await api.put(`/admin/patients/${patient.id}`, payload)
      else await api.post('/admin/patients', payload)
    },
    onSuccess: onSaved,
  })

  const cpfDigits = form.cpf.replace(/\D/g, '')
  const cpfInvalid = cpfDigits.length > 0 && !isValidCPF(cpfDigits)
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && !cpfInvalid

  return (
    <Modal
      title={patient ? 'Editar paciente' : 'Nova paciente'}
      subtitle={patient ? patient.email : 'Nome e e-mail bastam para cadastrar; o resto pode vir depois.'}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {patient ? 'Salvar alterações' : 'Cadastrar'}
          </SubmitButton>
        </>
      }
    >
      <div className="area-tabs" role="tablist">
        {FORM_TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        {tab === 'identification' && (
          <>
            <Field label="Nome completo" required>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </Field>

            <Field label="Nome social" hint="Como a paciente quer ser chamada, se diferente do nome civil">
              <input value={form.socialName} onChange={(e) => set('socialName', e.target.value)} />
            </Field>

            <FormRow>
              <Field label="E-mail" required hint="Usado para o acesso ao portal">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Telefone" hint="Com DDD, para o WhatsApp">
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', maskPhone(e.target.value))}
                  placeholder="(67) 90000-0000"
                  inputMode="numeric"
                />
              </Field>
            </FormRow>

            <FormRow>
              <Field label="CPF" hint="Necessário em receita e atestado">
                <input
                  value={form.cpf}
                  onChange={(e) => set('cpf', maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={cpfInvalid}
                />
              </Field>
              <Field label="RG">
                <input value={form.rg} onChange={(e) => set('rg', e.target.value)} />
              </Field>
            </FormRow>

            {cpfInvalid && <p className="error">CPF inválido — confira os números.</p>}

            <FormRow>
              <Field label="Data de nascimento">
                <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
              </Field>
              <Field label="Sexo">
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Não informado</option>
                  {GENDERS.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </FormRow>

            <FormRow>
              <Field label="Estado civil">
                <select value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                  <option value="">Não informado</option>
                  {MARITAL_STATUSES.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profissão">
                <input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
              </Field>
            </FormRow>

            <Field label="Nacionalidade">
              <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Brasileira" />
            </Field>
          </>
        )}

        {tab === 'address' && (
          <>
            <FormRow>
              <Field label="CEP">
                <input
                  value={form.zipCode}
                  onChange={(e) => set('zipCode', maskCEP(e.target.value))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Cidade">
                <input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
            </FormRow>

            <FormRow cols={3}>
              <Field label="Logradouro">
                <input value={form.street} onChange={(e) => set('street', e.target.value)} />
              </Field>
              <Field label="Número">
                <input value={form.streetNumber} onChange={(e) => set('streetNumber', e.target.value)} />
              </Field>
              <Field label="UF">
                <input
                  value={form.state}
                  onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="MS"
                  maxLength={2}
                />
              </Field>
            </FormRow>

            <FormRow>
              <Field label="Complemento">
                <input value={form.complement} onChange={(e) => set('complement', e.target.value)} />
              </Field>
              <Field label="Bairro">
                <input value={form.district} onChange={(e) => set('district', e.target.value)} />
              </Field>
            </FormRow>

            <h3 className="form-section-title">Contato de emergência</h3>

            <FormRow cols={3}>
              <Field label="Nome">
                <input value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} />
              </Field>
              <Field label="Telefone">
                <input
                  value={form.emergencyPhone}
                  onChange={(e) => set('emergencyPhone', maskPhone(e.target.value))}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Parentesco">
                <input
                  value={form.emergencyRelation}
                  onChange={(e) => set('emergencyRelation', e.target.value)}
                  placeholder="Mãe, marido…"
                />
              </Field>
            </FormRow>
          </>
        )}

        {tab === 'clinical' && (
          <>
            <Field label="Alergias" hint="Aparece como alerta no atendimento e antes de prescrever">
              <textarea rows={2} value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            </Field>

            <Field label="Medicações em uso" hint="Aparece como alerta no atendimento">
              <textarea rows={2} value={form.medications} onChange={(e) => set('medications', e.target.value)} />
            </Field>

            <Field label="Comorbidades" hint="Diabetes, hipertensão, doenças autoimunes…">
              <textarea rows={2} value={form.conditions} onChange={(e) => set('conditions', e.target.value)} />
            </Field>

            <Field label="Cirurgias e procedimentos anteriores">
              <textarea rows={2} value={form.surgeries} onChange={(e) => set('surgeries', e.target.value)} />
            </Field>

            <FormRow>
              <Field label="Tipo sanguíneo">
                <select value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
                  <option value="">Não informado</option>
                  {BLOOD_TYPES.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de pele" hint="Fototipo, sensibilidade">
                <input value={form.skinType} onChange={(e) => set('skinType', e.target.value)} />
              </Field>
            </FormRow>

            <FormRow>
              <label className="toolbar-check">
                <input
                  type="checkbox"
                  checked={form.isPregnant}
                  onChange={(e) => set('isPregnant', e.target.checked)}
                />
                Gestante
              </label>
              <label className="toolbar-check">
                <input
                  type="checkbox"
                  checked={form.isBreastfeeding}
                  onChange={(e) => set('isBreastfeeding', e.target.checked)}
                />
                Amamentando
              </label>
            </FormRow>

            <Field label="Observações gerais" hint="Preferências, histórico relevante">
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </>
        )}

        {tab === 'admin' && (
          <>
            <FormRow>
              <Field label="Convênio">
                <input value={form.insuranceName} onChange={(e) => set('insuranceName', e.target.value)} />
              </Field>
              <Field label="Carteirinha">
                <input value={form.insuranceNumber} onChange={(e) => set('insuranceNumber', e.target.value)} />
              </Field>
            </FormRow>

            <FormRow>
              <Field label="Como conheceu a clínica">
                <select value={form.referralSource} onChange={(e) => set('referralSource', e.target.value)}>
                  <option value="">Não informado</option>
                  {REFERRAL_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Indicada por" hint="Nome de quem indicou">
                <input value={form.referredBy} onChange={(e) => set('referredBy', e.target.value)} />
              </Field>
            </FormRow>

            <h3 className="form-section-title">Consentimentos</h3>

            <label className="toolbar-check">
              <input
                type="checkbox"
                checked={form.lgpdConsent}
                onChange={(e) => set('lgpdConsent', e.target.checked)}
              />
              Autoriza o tratamento dos dados pessoais e de saúde (LGPD)
            </label>

            <label className="toolbar-check">
              <input
                type="checkbox"
                checked={form.imageConsent}
                onChange={(e) => set('imageConsent', e.target.checked)}
              />
              Autoriza o uso de imagem em fotos de antes e depois
            </label>

            {patient?.lgpdConsentAt && (
              <p className="hint">Consentimento LGPD registrado em {formatDateBR(patient.lgpdConsentAt)}.</p>
            )}
            {patient?.imageConsentAt && (
              <p className="hint">Uso de imagem autorizado em {formatDateBR(patient.imageConsentAt)}.</p>
            )}
          </>
        )}

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}
