import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pause, Play, Plus, Sparkles, SquarePen, XCircle } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  FormRow,
  Modal,
  RowAction,
  SubmitButton,
  tenantSlug,
} from '../../lib/ui'

/**
 * Planos de tratamento na ficha da paciente — o lado da médica da jornada.
 *
 * O registro de procedimento era uma lista do que já tinha acontecido. Faltava
 * o plano: quantas sessões este caso pede, com que intervalo, e o que é
 * específico desta paciente. Procedimento estético raramente cabe em uma sessão
 * só, e o número muda de pessoa para pessoa — é isso que a tela deixa a médica
 * definir, e é o que a paciente passa a ver no portal.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

interface Campo {
  key: string
  label: string
  hint?: string
}

interface Procedimento {
  id: string
  title: string
  defaultSessions?: number | null
  intervalDays?: number | null
  fieldSchema?: Campo[] | null
  careBefore?: string | null
  careAfter?: string | null
}

export interface Plano {
  id: string
  procedureId: string | null
  title: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  totalSessions: number
  intervalDays: number | null
  details: Record<string, string> | null
  careBefore: string | null
  careAfter: string | null
  internalNotes: string | null
  procedure?: { id: string; title: string; fieldSchema?: Campo[] | null } | null
  sessions: { id: string; sessionNumber: number | null; performedAt: string }[]
  progresso: {
    feitas: number
    total: number
    restantes: number
    percentual: number
    concluido: boolean
  }
}

/* Os tons vem da paleta que o painel ja usa (.chip.success e irmaos): inventar
   classe nova aqui daria um chip sem cor nenhuma, que foi o que aconteceu. */
const STATUS: Record<Plano['status'], { label: string; tom: 'success' | 'warning' | 'info' | 'neutral' }> = {
  ACTIVE: { label: 'Em andamento', tom: 'info' },
  PAUSED: { label: 'Pausado', tom: 'warning' },
  COMPLETED: { label: 'Concluído', tom: 'success' },
  CANCELLED: { label: 'Cancelado', tom: 'neutral' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel
// ─────────────────────────────────────────────────────────────────────────────

export function PlanosPanel({ patientId }: { patientId: string }) {
  const client = useQueryClient()
  const [editando, setEditando] = React.useState<Plano | 'novo' | null>(null)
  const [encerrando, setEncerrando] = React.useState<Plano | null>(null)

  const planos = useQuery<Plano[]>({
    queryKey: ['plans', patientId],
    queryFn: async () => (await api.get('/plans', { params: { patientId } })).data,
  })

  const procedimentos = useQuery<Procedimento[]>({
    queryKey: ['procedures'],
    queryFn: async () => (await api.get('/procedures', { params: { tenantSlug } })).data,
  })

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['plans', patientId] })
    client.invalidateQueries({ queryKey: ['patient', patientId] })
  }

  const status = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Plano['status'] }) =>
      (await api.post(`/plans/${id}/status`, { status })).data,
    onSuccess: () => {
      refresh()
      setEncerrando(null)
    },
  })

  const lista = planos.data ?? []

  return (
    <div className="form-grid">
      <div className="toolbar">
        <p className="hint">
          O plano define quantas sessões o caso pede. A paciente acompanha o progresso no portal.
        </p>
        <button className="primary" onClick={() => setEditando('novo')}>
          <Plus size={14} aria-hidden="true" />
          Novo plano
        </button>
      </div>

      {planos.isLoading ? (
        <p className="hint">Carregando planos...</p>
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum plano de tratamento"
          description="Crie um plano para acompanhar as sessões deste procedimento e mostrar a jornada à paciente."
        />
      ) : (
        <DataList>
          {lista.map((plano) => (
            <DataRow
              key={plano.id}
              icon={Sparkles}
              title={plano.title}
              dimmed={plano.status === 'CANCELLED'}
              chips={<Chip tone={STATUS[plano.status].tom}>{STATUS[plano.status].label}</Chip>}
              meta={
                <>
                  <span>
                    {plano.progresso.feitas} de {plano.progresso.total}{' '}
                    {plano.progresso.total === 1 ? 'sessão' : 'sessões'}
                  </span>
                  {plano.progresso.restantes > 0 && plano.status === 'ACTIVE' && (
                    <span>{plano.progresso.restantes} a fazer</span>
                  )}
                  {plano.intervalDays && <span>a cada {plano.intervalDays} dias</span>}
                </>
              }
              counts={<Barra percentual={plano.progresso.percentual} />}
              actions={
                <>
                  <RowAction icon={SquarePen} title="Editar plano" onClick={() => setEditando(plano)} />
                  {plano.status === 'ACTIVE' && (
                    <RowAction
                      icon={Pause}
                      title="Pausar"
                      onClick={() => status.mutate({ id: plano.id, status: 'PAUSED' })}
                    />
                  )}
                  {plano.status === 'PAUSED' && (
                    <RowAction
                      icon={Play}
                      title="Retomar"
                      onClick={() => status.mutate({ id: plano.id, status: 'ACTIVE' })}
                    />
                  )}
                  {(plano.status === 'ACTIVE' || plano.status === 'PAUSED') && (
                    <>
                      <RowAction
                        icon={CheckCircle2}
                        title="Concluir"
                        onClick={() => status.mutate({ id: plano.id, status: 'COMPLETED' })}
                      />
                      <RowAction
                        icon={XCircle}
                        title="Cancelar plano"
                        onClick={() => setEncerrando(plano)}
                      />
                    </>
                  )}
                </>
              }
            />
          ))}
        </DataList>
      )}

      {editando && (
        <PlanoForm
          patientId={patientId}
          plano={editando === 'novo' ? null : editando}
          procedimentos={procedimentos.data ?? []}
          onClose={() => setEditando(null)}
          onSaved={() => {
            refresh()
            setEditando(null)
          }}
        />
      )}

      {encerrando && (
        <ConfirmDialog
          title="Cancelar plano"
          message={`O plano "${encerrando.title}" sai do portal da paciente. As sessões já registradas continuam no prontuário.`}
          confirmLabel="Cancelar plano"
          danger
          pending={status.isPending}
          onCancel={() => setEncerrando(null)}
          onConfirm={() => status.mutate({ id: encerrando.id, status: 'CANCELLED' })}
        />
      )}
    </div>
  )
}

function Barra({ percentual }: { percentual: number }) {
  return (
    <span className="plano-barra" role="img" aria-label={`${percentual}% concluído`}>
      <span className="plano-barra-preenchida" style={{ width: `${percentual}%` }} />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulário
// ─────────────────────────────────────────────────────────────────────────────

function PlanoForm({
  patientId,
  plano,
  procedimentos,
  onClose,
  onSaved,
}: {
  patientId: string
  plano: Plano | null
  procedimentos: Procedimento[]
  onClose: () => void
  onSaved: () => void
}) {
  const [procedureId, setProcedureId] = React.useState(plano?.procedureId ?? '')
  const [title, setTitle] = React.useState(plano?.title ?? '')
  const [totalSessions, setTotalSessions] = React.useState(String(plano?.totalSessions ?? 1))
  const [intervalDays, setIntervalDays] = React.useState(
    plano?.intervalDays ? String(plano.intervalDays) : '',
  )
  const [details, setDetails] = React.useState<Record<string, string>>(plano?.details ?? {})
  const [careBefore, setCareBefore] = React.useState(plano?.careBefore ?? '')
  const [careAfter, setCareAfter] = React.useState(plano?.careAfter ?? '')
  const [internalNotes, setInternalNotes] = React.useState(plano?.internalNotes ?? '')
  const [erro, setErro] = React.useState<string | null>(null)

  const escolhido = procedimentos.find((p) => p.id === procedureId)
  /* Num plano já salvo o procedimento pode ter sido desativado desde então; os
     campos vêm junto no plano para que a ficha não perca os rótulos. */
  const campos = escolhido?.fieldSchema ?? plano?.procedure?.fieldSchema ?? []

  /* Escolher o procedimento traz os padrões dele. Só preenche o que está
     vazio: numa edição, o que a médica já ajustou para esta paciente vale
     mais que o padrão do catálogo. */
  function escolherProcedimento(id: string) {
    setProcedureId(id)
    const proc = procedimentos.find((p) => p.id === id)
    if (!proc) return
    if (!title.trim()) setTitle(proc.title)
    if (!plano) {
      if (proc.defaultSessions) setTotalSessions(String(proc.defaultSessions))
      if (proc.intervalDays) setIntervalDays(String(proc.intervalDays))
      if (proc.careBefore && !careBefore) setCareBefore(proc.careBefore)
      if (proc.careAfter && !careAfter) setCareAfter(proc.careAfter)
    }
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const corpo = {
        patientId,
        procedureId: procedureId || undefined,
        title: title.trim(),
        totalSessions: Number(totalSessions) || 1,
        intervalDays: intervalDays ? Number(intervalDays) : null,
        // Campo em branco não vira chave: o portal mostra só o que foi preenchido.
        details: Object.fromEntries(Object.entries(details).filter(([, v]) => v.trim())),
        careBefore: careBefore.trim() || undefined,
        careAfter: careAfter.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      }
      return plano
        ? (await api.patch(`/plans/${plano.id}`, corpo)).data
        : (await api.post('/plans', corpo)).data
    },
    onSuccess: onSaved,
    onError: (e) => setErro(errorMessage(e, 'Não foi possível salvar o plano.')),
  })

  const valido = title.trim().length >= 2 && Number(totalSessions) >= 1

  return (
    <Modal
      title={plano ? 'Editar plano' : 'Novo plano de tratamento'}
      subtitle={
        plano ? `${plano.progresso.feitas} de ${plano.progresso.total} sessões realizadas` : undefined
      }
      onClose={onClose}
      footer={
        <>
          <button className="ghost" onClick={onClose}>
            Voltar
          </button>
          <SubmitButton pending={salvar.isPending} disabled={!valido} onClick={() => salvar.mutate()}>
            {plano ? 'Salvar' : 'Criar plano'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {erro && <p className="error">{erro}</p>}

        <Field label="Procedimento" hint="Traz as sessões, o intervalo e os cuidados já cadastrados.">
          <select value={procedureId} onChange={(e) => escolherProcedimento(e.target.value)}>
            <option value="">Sem procedimento do catálogo</option>
            {procedimentos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Nome do plano" required hint="É o título que a paciente vê no portal.">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>

        <FormRow>
          <Field label="Sessões previstas" required>
            <input
              type="number"
              min={1}
              max={60}
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
            />
          </Field>
          <Field label="Intervalo (dias)" hint="Usado para prever a próxima sessão.">
            <input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              placeholder="opcional"
            />
          </Field>
        </FormRow>

        {campos.length > 0 && (
          <fieldset className="form-fieldset">
            <legend>Detalhes desta paciente</legend>
            {campos.map((campo) => (
              <Field key={campo.key} label={campo.label} hint={campo.hint}>
                <input
                  value={details[campo.key] ?? ''}
                  onChange={(e) => setDetails((d) => ({ ...d, [campo.key]: e.target.value }))}
                  maxLength={400}
                />
              </Field>
            ))}
          </fieldset>
        )}

        <Field label="Cuidados antes" hint="A paciente lê no portal antes de cada sessão.">
          <textarea
            rows={3}
            value={careBefore}
            onChange={(e) => setCareBefore(e.target.value)}
            maxLength={2000}
          />
        </Field>

        <Field label="Cuidados depois" hint="Orientações de pós-procedimento.">
          <textarea
            rows={3}
            value={careAfter}
            onChange={(e) => setCareAfter(e.target.value)}
            maxLength={2000}
          />
        </Field>

        <Field label="Anotação interna" hint="Só a equipe vê. Nunca aparece no portal da paciente.">
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </div>
    </Modal>
  )
}
