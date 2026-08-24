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
} from '../lib/ui'
import { useDebounced } from '../lib/useDebounced'

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

function labelOf(pairs: readonly (readonly [string, string])[], value?: string | null) {
  return pairs.find(([id]) => id === value)?.[1] ?? null
}

const EMPTY_FORM = {
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

type PatientFormState = typeof EMPTY_FORM

export function Patients() {
  const client = useQueryClient()
  const [search, setSearch] = React.useState('')
  // A busca vai ao servidor: sem atraso cada tecla vira uma requisição
  const debouncedSearch = useDebounced(search)
  const [showArchived, setShowArchived] = React.useState(false)
  const [editing, setEditing] = React.useState<Patient | 'new' | null>(null)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [archiving, setArchiving] = React.useState<Patient | null>(null)

  const query = useQuery({
    queryKey: ['patients', debouncedSearch, showArchived],
    queryFn: async () =>
      (
        await api.get('/admin/patients', {
          params: {
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(showArchived ? { includeArchived: 'true' } : {}),
          },
        })
      ).data as Patient[],
  })

  const archive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/patients/${id}/archive`, { isActive }),
    onSuccess: () => {
      setArchiving(null)
      client.invalidateQueries({ queryKey: ['patients'] })
      client.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const patients = query.data ?? []

  return (
    <>
      <Toolbar>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail ou telefone"
        />
        <label className="toolbar-check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Mostrar arquivadas
        </label>
        <button className="primary" onClick={() => setEditing('new')}>
          <Plus size={15} />
          Nova paciente
        </button>
      </Toolbar>

      {query.isLoading ? (
        <p className="hint">Carregando...</p>
      ) : !patients.length ? (
        <EmptyState
          title={search ? 'Nenhuma paciente encontrada' : 'Nenhuma paciente cadastrada'}
          description={
            search
              ? 'Tente outro nome, e-mail ou telefone.'
              : 'Cadastre a primeira paciente para começar a registrar atendimentos.'
          }
          action={
            !search && (
              <button className="primary" onClick={() => setEditing('new')}>
                <Plus size={15} />
                Nova paciente
              </button>
            )
          }
        />
      ) : (
        <DataList>
          {patients.map((patient) => (
            <DataRow
              key={patient.id}
              icon={UserRound}
              dimmed={!patient.isActive}
              onOpen={() => setDetailId(patient.id)}
              openLabel={`Abrir prontuário de ${patient.name}`}
              title={patient.socialName || patient.name}
              chips={
                <>
                  {!patient.isActive && <Chip>Arquivada</Chip>}
                  {patient.allergies && (
                    <Chip tone="danger" icon={AlertTriangle} title={`Alergias: ${patient.allergies}`}>
                      Alergia
                    </Chip>
                  )}
                </>
              }
              meta={
                <>
                  <span>
                    <Mail size={12} aria-hidden="true" /> {patient.email}
                  </span>
                  {patient.phone && (
                    <span>
                      <Phone size={12} aria-hidden="true" /> {maskPhone(patient.phone)}
                    </span>
                  )}
                  {patient.cpf && <span>CPF {maskCPF(patient.cpf)}</span>}
                </>
              }
              counts={
                <>
                  <span title="Consultas">
                    <CalendarDays size={13} aria-hidden="true" /> {patient._count?.appointments ?? 0}
                  </span>
                  <span title="Procedimentos">
                    <HeartPulse size={13} aria-hidden="true" /> {patient._count?.sessions ?? 0}
                  </span>
                  <span title="Documentos emitidos">
                    <FileText size={13} aria-hidden="true" /> {patient._count?.prescriptions ?? 0}
                  </span>
                </>
              }
              actions={
                <>
                  {/* Único botão da linha com rótulo visível — RowAction é só ícone */}
                  <button
                    className="primary"
                    onClick={() => setDetailId(patient.id)}
                    aria-label={`Abrir prontuário de ${patient.name}`}
                    title="Abrir prontuário"
                  >
                    <HeartPulse size={14} aria-hidden="true" />
                    Prontuário
                  </button>
                  <RowAction icon={Pencil} title={`Editar ${patient.name}`} onClick={() => setEditing(patient)} />
                  <RowAction
                    icon={patient.isActive ? Archive : ArchiveRestore}
                    title={patient.isActive ? `Arquivar ${patient.name}` : `Reativar ${patient.name}`}
                    onClick={() => setArchiving(patient)}
                  />
                </>
              }
            />
          ))}
        </DataList>
      )}

      {editing && (
        <PatientForm
          patient={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            client.invalidateQueries({ queryKey: ['patients'] })
            client.invalidateQueries({ queryKey: ['admin'] })
          }}
        />
      )}

      {detailId && <PatientDetail id={detailId} onClose={() => setDetailId(null)} />}

      {archiving && (
        <ConfirmDialog
          title={archiving.isActive ? 'Arquivar paciente?' : 'Reativar paciente?'}
          message={
            archiving.isActive
              ? `${archiving.name} sai das listas, mas todo o histórico clínico é preservado. Você pode reativar depois.`
              : `${archiving.name} volta a aparecer nas listas e buscas.`
          }
          confirmLabel={archiving.isActive ? 'Arquivar' : 'Reativar'}
          danger={archiving.isActive}
          pending={archive.isPending}
          onCancel={() => setArchiving(null)}
          onConfirm={() => archive.mutate({ id: archiving.id, isActive: !archiving.isActive })}
        />
      )}
    </>
  )
}

const FORM_TABS = [
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
function PatientForm({
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

const DOC_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  SENT: { label: 'Enviado', tone: 'info' },
  SIGNED: { label: 'Assinado', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
}

const DOC_KIND: Record<string, string> = {
  PRESCRIPTION: 'Receita',
  EXAM_REQUEST: 'Pedido de exame',
  GUIDANCE: 'Orientações',
  CERTIFICATE: 'Atestado',
}

const RECORD_TYPE: Record<string, string> = {
  ANAMNESIS: 'Anamnese',
  EVOLUTION: 'Evolução',
  ASSESSMENT: 'Avaliação',
  PROCEDURE: 'Procedimento',
  NOTE: 'Observação',
}

/**
 * Alergias, medicações em uso, comorbidades e gestação — o que precisa saltar
 * aos olhos antes de prescrever. Fica em destaque no topo da ficha e do
 * atendimento; sem isso, a informação ficava enterrada no texto de observações.
 */
export function ClinicalAlerts({ patient }: { patient: Partial<Patient> }) {
  const alerts: { label: string; value: string; critical?: boolean }[] = []

  if (patient.allergies) alerts.push({ label: 'Alergias', value: patient.allergies, critical: true })
  if (patient.medications) alerts.push({ label: 'Medicações em uso', value: patient.medications })
  if (patient.conditions) alerts.push({ label: 'Comorbidades', value: patient.conditions })
  if (patient.isPregnant) alerts.push({ label: 'Gestante', value: 'Confirmar segurança do que for prescrito', critical: true })
  if (patient.isBreastfeeding) alerts.push({ label: 'Amamentando', value: 'Confirmar segurança do que for prescrito', critical: true })

  if (!alerts.length) return null

  return (
    <div className="clinical-alerts">
      {alerts.map((alert) => (
        <div key={alert.label} className={`patient-alert ${alert.critical ? 'critical' : ''}`}>
          <AlertTriangle size={14} />
          <span>
            <strong>{alert.label}:</strong> {alert.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Prontuário da paciente: tudo que a clínica registrou, em ordem.
 * Só leitura — registro novo nasce em Atendimento, sempre vinculado à consulta.
 */
export function PatientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const client = useQueryClient()
  const [tab, setTab] = React.useState<'timeline' | 'documents' | 'procedures' | 'files'>('timeline')

  const query = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get(`/admin/patients/${id}`)).data,
  })

  const refresh = () => client.invalidateQueries({ queryKey: ['patient', id] })

  const p = query.data

  if (query.isLoading) {
    return (
      <Modal title="Prontuário" onClose={onClose} wide>
        <p className="hint">Carregando prontuário...</p>
      </Modal>
    )
  }
  if (!p) {
    return (
      <Modal title="Prontuário" onClose={onClose} wide>
        <p className="error">Não foi possível carregar o prontuário.</p>
      </Modal>
    )
  }

  const age = p.birthDate
    ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 86400000))
    : null

  const tabs = [
    ['timeline', `Evoluções (${p.records?.length ?? 0})`],
    ['documents', `Documentos (${p.prescriptions?.length ?? 0})`],
    ['procedures', `Procedimentos (${p.sessions?.length ?? 0})`],
    ['files', `Arquivos (${p.attachments?.length ?? 0})`],
  ] as const

  const address = [
    [p.street, p.streetNumber].filter(Boolean).join(', '),
    p.complement,
    p.district,
    [p.city, p.state].filter(Boolean).join(' - '),
    p.zipCode ? maskCEP(p.zipCode) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Modal
      title={p.socialName || p.name}
      subtitle={[age != null ? `${age} anos` : null, p.phone || p.email].filter(Boolean).join(' · ')}
      onClose={onClose}
      wide
    >
      <div className="form-grid">
        <ClinicalAlerts patient={p} />

        {p.notes && (
          <div className="patient-alert neutral">
            <strong>Observações:</strong> {p.notes}
          </div>
        )}

        <dl className="drawer-facts">
          <div>
            <dt>Contato</dt>
            <dd>{p.phone ? maskPhone(p.phone) : 'sem telefone'}</dd>
            <dd>{p.email}</dd>
          </div>
          <div>
            <dt>Documento</dt>
            <dd>{p.cpf ? maskCPF(p.cpf) : 'CPF não informado'}</dd>
            {p.rg && <dd>RG {p.rg}</dd>}
          </div>
          <div>
            <dt>Nascimento</dt>
            <dd>{formatDateBR(p.birthDate)}</dd>
            {p.gender && <dd>{labelOf(GENDERS, p.gender)}</dd>}
          </div>
          {p.socialName && (
            <div>
              <dt>Nome civil</dt>
              <dd>{p.name}</dd>
            </div>
          )}
          {address && (
            <div className="wide">
              <dt>Endereço</dt>
              <dd>{address}</dd>
            </div>
          )}
          {p.emergencyName && (
            <div>
              <dt>Emergência</dt>
              <dd>{p.emergencyName}{p.emergencyRelation ? ` (${p.emergencyRelation})` : ''}</dd>
              {p.emergencyPhone && <dd>{maskPhone(p.emergencyPhone)}</dd>}
            </div>
          )}
          {p.insuranceName && (
            <div>
              <dt>Convênio</dt>
              <dd>{p.insuranceName}</dd>
              {p.insuranceNumber && <dd>{p.insuranceNumber}</dd>}
            </div>
          )}
          {(p.occupation || p.maritalStatus) && (
            <div>
              <dt>Perfil</dt>
              {p.occupation && <dd>{p.occupation}</dd>}
              {p.maritalStatus && <dd>{labelOf(MARITAL_STATUSES, p.maritalStatus)}</dd>}
            </div>
          )}
          {p.referralSource && (
            <div>
              <dt>Como chegou</dt>
              <dd>{p.referralSource}</dd>
              {p.referredBy && <dd>por {p.referredBy}</dd>}
            </div>
          )}
          <div>
            <dt>Paciente desde</dt>
            <dd>{formatDateBR(p.createdAt)}</dd>
          </div>
          <div>
            <dt>Consultas</dt>
            <dd>{p.appointments?.length ?? 0}</dd>
          </div>
          <div>
            <dt>Consentimentos</dt>
            <dd>{p.lgpdConsentAt ? `LGPD em ${formatDateBR(p.lgpdConsentAt)}` : 'LGPD pendente'}</dd>
            <dd>{p.imageConsentAt ? `Imagem em ${formatDateBR(p.imageConsentAt)}` : 'Imagem não autorizada'}</dd>
          </div>
        </dl>

        <div className="area-tabs" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'timeline' &&
          (!p.records?.length ? (
            <p className="hint">Nenhuma evolução registrada. Os registros nascem no Atendimento.</p>
          ) : (
            <div className="timeline">
              {p.records.map((r: any) => (
                <article key={r.id} className="timeline-item">
                  <div className="timeline-head">
                    <div>
                      <strong>{r.title}</strong>
                      <Chip>{RECORD_TYPE[r.type] ?? r.type}</Chip>
                      {r.lockedAt && <Chip tone="success">Fechado</Chip>}
                    </div>
                    <span className="timeline-date">{formatDateBR(r.occurredAt ?? r.createdAt)}</span>
                  </div>
                  {r.complaint && (
                    <p className="timeline-field">
                      <span>Queixa</span>
                      {r.complaint}
                    </p>
                  )}
                  <p className="timeline-body">{r.body}</p>
                  {r.plan && (
                    <p className="timeline-field">
                      <span>Conduta</span>
                      {r.plan}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ))}

        {tab === 'documents' &&
          (!p.prescriptions?.length ? (
            <p className="hint">Nenhum documento emitido. Receitas e exames são emitidos no Atendimento.</p>
          ) : (
            <DataList>
              {p.prescriptions.map((doc: any) => {
                const meta = DOC_STATUS[doc.status] ?? { label: doc.status, tone: 'neutral' as const }
                return (
                  <DataRow
                    key={doc.id}
                    icon={FileText}
                    title={doc.title}
                    chips={<Chip tone={meta.tone}>{meta.label}</Chip>}
                    meta={
                      <>
                        <span>{DOC_KIND[doc.kind] ?? doc.kind}</span>
                        <span>{formatDateBR(doc.createdAt)}</span>
                        {doc.items?.length > 0 && <span>{doc.items.length} item(ns)</span>}
                      </>
                    }
                  />
                )
              })}
            </DataList>
          ))}

        {tab === 'procedures' &&
          (!p.sessions?.length ? (
            <p className="hint">Nenhum procedimento registrado.</p>
          ) : (
            <DataList>
              {p.sessions.map((s: any) => (
                <DataRow
                  key={s.id}
                  icon={HeartPulse}
                  title={s.procedure?.title ?? 'Procedimento'}
                  meta={
                    <>
                      <span>{formatDateBR(s.performedAt)}</span>
                      <span>{formatMoney(s.priceCents)}</span>
                    </>
                  }
                />
              ))}
            </DataList>
          ))}

        {tab === 'files' && <AttachmentsPanel patientId={id} attachments={p.attachments ?? []} onChanged={refresh} />}
      </div>
    </Modal>
  )
}

