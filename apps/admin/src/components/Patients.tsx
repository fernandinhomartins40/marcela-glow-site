import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Archive, ArchiveRestore, CalendarDays, FileText, HeartPulse, Mail, MessageCircle, Pencil, Phone, Plus, Search, UserRound } from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  formatDateBR,
  maskCPF,
  maskPhone,
  Modal,
  RowAction,
  SearchBox,
  splitTags,
  Toolbar,
} from '../lib/ui'
import { useDebounced } from '../lib/useDebounced'
import { PatientForm } from './patients/form'
import { ClinicalAlerts, PatientDetail } from './patients/ficha'
import { labelOf, GENDERS, type Patient } from './patients/shared'

// Reexportados porque Clinical, Atendimento e AdminPanel ja importavam daqui.
export { ClinicalAlerts, PatientDetail } from './patients/ficha'
export { GENDERS, MARITAL_STATUSES, BLOOD_TYPES, REFERRAL_SOURCES, type Patient } from './patients/shared'

/**
 * Lista de pacientes: busca, cadastro e porta de entrada da ficha.
 * O formulario e a ficha vivem em ./patients.
 */
export function Patients() {
  const client = useQueryClient()
  /* A busca da barra superior chega como `?busca=`. Sincroniza também quando
     a pessoa já está aqui e busca de novo lá em cima. */
  const [params] = useSearchParams()
  const buscaNaUrl = params.get('busca') ?? ''
  const [search, setSearch] = React.useState(buscaNaUrl)
  React.useEffect(() => {
    if (buscaNaUrl) setSearch(buscaNaUrl)
  }, [buscaNaUrl])
  // A busca vai ao servidor: sem atraso cada tecla vira uma requisição
  const debouncedSearch = useDebounced(search)
  const [showArchived, setShowArchived] = React.useState(false)
  const [editing, setEditing] = React.useState<Patient | 'new' | null>(null)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [detailTab, setDetailTab] = React.useState<'timeline' | 'messages'>('timeline')
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

  const inbox = useQuery({
    queryKey: ['message-inbox'],
    refetchInterval: 30_000,
    queryFn: async () => (await api.get('/admin/message-inbox')).data as {
      patientId: string
      patientName: string
      lastAt: string
    }[],
  })

  const openDetail = (id: string, tab: 'timeline' | 'messages' = 'timeline') => {
    setDetailTab(tab)
    setDetailId(id)
  }

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
      <section className="message-inbox" aria-labelledby="message-inbox-title">
        <div className="message-inbox-head">
          <h2 id="message-inbox-title"><MessageCircle size={17} aria-hidden="true" /> Mensagens aguardando resposta</h2>
        </div>
        {inbox.isLoading ? <p className="hint">Carregando conversas...</p> : inbox.isError ? (
          <p className="error" role="alert">Não foi possível carregar as mensagens. <button type="button" onClick={() => inbox.refetch()}>Tentar novamente</button></p>
        ) : !inbox.data?.length ? (
          <p className="hint">Nenhuma conversa aguardando resposta.</p>
        ) : (
          <DataList>
            {inbox.data.map((item) => (
              <DataRow
                key={item.patientId}
                icon={MessageCircle}
                title={item.patientName}
                meta={<span>Última mensagem em {formatDateBR(item.lastAt)}</span>}
                onOpen={() => openDetail(item.patientId, 'messages')}
                openLabel={`Abrir conversa com ${item.patientName}`}
              />
            ))}
          </DataList>
        )}
      </section>
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
              onOpen={() => openDetail(patient.id)}
              openLabel={`Abrir prontuário de ${patient.name}`}
              title={patient.socialName || patient.name}
              chips={
                <>
                  {!patient.isActive && <Chip>Arquivada</Chip>}
                  {/* "Alergia:" uma vez, seguido de uma tag por item. Sem o rotulo
                     as tags viram palavras soltas ("latex", "sulfa") sem dizer do que
                     se trata; repeti-lo em cada tag gastaria a linha inteira.
                     Acima de tres vira contagem, senao uma paciente com lista longa
                     empurra o contato e o CPF para fora da linha. */}
                  {splitTags(patient.allergies).length > 0 && (
                    <span className="chip-group" title={`Alergias: ${patient.allergies}`}>
                      <AlertTriangle size={12} aria-hidden="true" />
                      <span className="chip-group-label">Alergia:</span>
                      {splitTags(patient.allergies).slice(0, 3).map((alergia) => (
                        <Chip key={alergia} tone="danger">
                          {alergia}
                        </Chip>
                      ))}
                      {splitTags(patient.allergies).length > 3 && (
                        <Chip tone="danger">+{splitTags(patient.allergies).length - 3}</Chip>
                      )}
                    </span>
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
                    className="primary data-action-label"
                    onClick={() => openDetail(patient.id)}
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

      {detailId && <PatientDetail key={detailId} id={detailId} initialTab={detailTab} onClose={() => { setDetailId(null); client.invalidateQueries({ queryKey: ['message-inbox'] }) }} />}

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
