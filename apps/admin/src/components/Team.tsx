import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react'
import {
  api,
  Chip,
  ConfirmDialog,
  DataList,
  DataRow,
  EmptyState,
  errorMessage,
  Field,
  formatDateBR,
  Modal,
  PERMISSION_GROUPS,
  ROLE_HINTS,
  ROLE_LABELS,
  RowAction,
  SearchBox,
  SubmitButton,
  Toolbar,
} from '../lib/ui'
import { useDebounced } from '../lib/useDebounced'

interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  /** Só as exceções: o que o papel já concede não é guardado aqui. */
  permissions: { id: string; permission: string }[]
  _count: { sessions: number }
}

interface RoleCatalog {
  roles: { id: string; permissions: string[] }[]
  permissions: string[]
}

export function Team({ currentUserId }: { currentUserId?: string }) {
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search)
  const [editing, setEditing] = React.useState<TeamUser | null>(null)
  const [inviting, setInviting] = React.useState(false)
  const [disconnecting, setDisconnecting] = React.useState<TeamUser | null>(null)
  const client = useQueryClient()

  const users = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => (await api.get('/admin/users')).data as TeamUser[],
  })
  const catalog = useQuery({
    queryKey: ['role-catalog'],
    queryFn: async () => (await api.get('/admin/roles')).data as RoleCatalog,
    staleTime: Infinity, // é o enum do banco: não muda enquanto o app roda
  })

  const revokeAll = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/revoke-sessions`),
    onSuccess: () => {
      setDisconnecting(null)
      client.invalidateQueries({ queryKey: ['team-users'] })
    },
  })

  const term = debounced.trim().toLowerCase()
  const list = (users.data ?? []).filter(
    (u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
  )

  return (
    <>
      <Toolbar>
        <span className="toolbar-title">
          {list.length} {list.length === 1 ? 'pessoa' : 'pessoas'}
        </span>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail" />
        <button className="primary" onClick={() => setInviting(true)}>
          <UserPlus size={15} />
          Convidar
        </button>
      </Toolbar>

      {users.isLoading ? (
        <p className="hint">Carregando equipe...</p>
      ) : users.isError ? (
        <p className="error">{errorMessage(users.error)}</p>
      ) : !list.length ? (
        <EmptyState
          icon={UserRound}
          title={term ? 'Ninguém com esse nome' : 'Só você por aqui'}
          description={
            term
              ? 'Tente outro trecho do nome ou do e-mail.'
              : 'Convide a equipe e defina o que cada pessoa pode ver e fazer.'
          }
          action={
            !term && (
              <button className="primary" onClick={() => setInviting(true)}>
                <UserPlus size={15} />
                Convidar
              </button>
            )
          }
        />
      ) : (
        <DataList>
          {list.map((user) => {
            const isMe = user.id === currentUserId
            const extras = user.permissions.length
            return (
              <DataRow
                key={user.id}
                icon={UserRound}
                title={user.name}
                dimmed={!user.isActive}
                chips={
                  <>
                    <Chip tone={user.role === 'ADMIN' ? 'info' : 'neutral'} icon={ShieldCheck}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Chip>
                    {!user.isActive && <Chip tone="danger">Desativada</Chip>}
                    {isMe && <Chip tone="success">Você</Chip>}
                    {extras > 0 && (
                      <Chip tone="warning" title="Permissões fora do padrão do papel">
                        +{extras} exceç{extras > 1 ? 'ões' : 'ão'}
                      </Chip>
                    )}
                  </>
                }
                meta={
                  <>
                    <span>{user.email}</span>
                    <span>
                      {user.lastLoginAt
                        ? `último acesso em ${formatDateBR(user.lastLoginAt)}`
                        : 'nunca acessou'}
                    </span>
                    {user._count.sessions > 0 && (
                      <span>
                        {user._count.sessions === 1
                          ? '1 sessão aberta'
                          : `${user._count.sessions} sessões abertas`}
                      </span>
                    )}
                  </>
                }
                actions={
                  <>
                    <RowAction
                      icon={Pencil}
                      title="Editar papel e permissões"
                      onClick={() => setEditing(user)}
                    />
                    <RowAction
                      icon={LogOut}
                      title={
                        user._count.sessions
                          ? 'Desconectar de todos os aparelhos'
                          : 'Nenhuma sessão aberta'
                      }
                      disabled={!user._count.sessions}
                      onClick={() => setDisconnecting(user)}
                    />
                  </>
                }
              />
            )
          })}
        </DataList>
      )}

      {editing && (
        <UserForm
          user={editing}
          catalog={catalog.data}
          isMe={editing.id === currentUserId}
          onClose={() => setEditing(null)}
        />
      )}

      {inviting && <InviteForm catalog={catalog.data} onClose={() => setInviting(false)} />}

      {disconnecting && (
        <ConfirmDialog
          title="Desconectar de todos os aparelhos?"
          message={
            `${disconnecting.name} vai precisar entrar de novo em cada aparelho. ` +
            'Use quando um celular ou computador da equipe se perder.' +
            (revokeAll.isError ? ` — ${errorMessage(revokeAll.error)}` : '')
          }
          confirmLabel="Desconectar"
          danger
          pending={revokeAll.isPending}
          onCancel={() => setDisconnecting(null)}
          onConfirm={() => revokeAll.mutate(disconnecting.id)}
        />
      )}
    </>
  )
}

/**
 * Marcação das permissões. As que o papel já concede aparecem marcadas e
 * travadas: desmarcar ali não teria efeito nenhum — o papel as devolveria na
 * próxima leitura. Quem quer tirar uma delas troca o papel.
 */
function PermissionPicker({
  role,
  catalog,
  extras,
  onToggle,
}: {
  role: string
  catalog?: RoleCatalog
  extras: string[]
  onToggle: (permission: string) => void
}) {
  const fromRole = new Set(catalog?.roles.find((r) => r.id === role)?.permissions ?? [])

  return (
    <div className="perm-groups">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.id} className="perm-group">
          <legend>{group.label}</legend>
          {/* O fieldset não se comporta como container de grid/flex de forma
              confiável; a div interna é que faz o layout. */}
          <div className="perm-group-body">
          {group.items.map((item) => {
            const byRole = fromRole.has(item.id)
            const checked = byRole || extras.includes(item.id)
            return (
              <label key={item.id} className={`perm-item ${byRole ? 'by-role' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={byRole}
                  onChange={() => onToggle(item.id)}
                />
                <span>{item.label}</span>
                {byRole && <span className="perm-source">do papel</span>}
              </label>
            )
          })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (role: string) => void
  disabled?: boolean
}) {
  return (
    <>
      <select
        aria-label="Nivel de acesso"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {Object.keys(ROLE_LABELS).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <span className="field-hint">{ROLE_HINTS[value]}</span>
    </>
  )
}

function UserForm({
  user,
  catalog,
  isMe,
  onClose,
}: {
  user: TeamUser
  catalog?: RoleCatalog
  isMe: boolean
  onClose: () => void
}) {
  const client = useQueryClient()
  const [name, setName] = React.useState(user.name)
  const [role, setRole] = React.useState(user.role)
  const [isActive, setIsActive] = React.useState(user.isActive)
  const [extras, setExtras] = React.useState<string[]>(user.permissions.map((p) => p.permission))

  // Trocar o papel muda o que já vem de graça; a exceção que o novo papel
  // cobre deixa de ser exceção.
  React.useEffect(() => {
    const fromRole = new Set(catalog?.roles.find((r) => r.id === role)?.permissions ?? [])
    setExtras((current) => current.filter((permission) => !fromRole.has(permission)))
  }, [role, catalog])

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/users/${user.id}`, {
        name,
        permissions: extras,
        // O servidor recusa auto-rebaixamento; nem enviamos os campos.
        ...(isMe ? {} : { role, isActive }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['team-users'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
  })

  const toggle = (permission: string) =>
    setExtras((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission],
    )

  return (
    <Modal
      title={user.name}
      subtitle={user.email}
      wide
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={save.isPending} disabled={name.trim().length < 2} onClick={() => save.mutate()}>
            Salvar acesso
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome" required>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Papel" hint={isMe ? 'Você não pode alterar o próprio papel.' : undefined}>
          <RoleSelect value={role} onChange={setRole} disabled={isMe} />
        </Field>

        {!isMe && (
          <label className="check-row">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Conta ativa — ao desativar, as sessões abertas caem na hora</span>
          </label>
        )}

        <div>
          <p className="form-section-title">Permissões</p>
          <p className="hint" style={{ marginBottom: 10 }}>
            O papel já concede o essencial. Marque aqui só o que esta pessoa
            precisa além disso.
          </p>
          <PermissionPicker role={role} catalog={catalog} extras={extras} onToggle={toggle} />
        </div>

        {save.isError && <p className="error">{errorMessage(save.error)}</p>}
      </div>
    </Modal>
  )
}

function InviteForm({ catalog, onClose }: { catalog?: RoleCatalog; onClose: () => void }) {
  const client = useQueryClient()
  const [email, setEmail] = React.useState('')
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState('STAFF')
  const [extras, setExtras] = React.useState<string[]>([])
  const [sent, setSent] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fromRole = new Set(catalog?.roles.find((r) => r.id === role)?.permissions ?? [])
    setExtras((current) => current.filter((permission) => !fromRole.has(permission)))
  }, [role, catalog])

  const invite = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/invites', {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        permissions: extras,
      })
      return data as { inviteToken?: string }
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['team-users'] })
      client.invalidateQueries({ queryKey: ['admin'] })
      // Em produção o token vai por e-mail e não volta na resposta.
      if (data.inviteToken) setSent(data.inviteToken)
      else onClose()
    },
  })

  const valid = /\S+@\S+\.\S+/.test(email)

  if (sent) {
    return (
      <Modal title="Convite criado" onClose={onClose}>
        <div className="form-grid">
          <p className="hint">
            Envie este link para <strong>{email}</strong>. Ele vale por 7 dias e
            só pode ser usado uma vez.
          </p>
          <input
            aria-label="Link do convite, para copiar"
            readOnly
            value={`${window.location.origin}/convite/${sent}`}
            onFocus={(e) => e.target.select()}
          />
          <p className="hint">
            <Mail size={13} aria-hidden="true" /> Em produção o link é enviado
            por e-mail automaticamente.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Convidar para a equipe"
      subtitle="A pessoa define a própria senha ao aceitar"
      wide
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={invite.isPending} disabled={!valid} onClick={() => invite.mutate()}>
            <Check size={14} aria-hidden="true" />
            Enviar convite
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="E-mail" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@clinica.com"
            autoFocus
          />
        </Field>

        <Field label="Nome" hint="Opcional — a pessoa confirma ao aceitar o convite.">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Papel">
          <RoleSelect value={role} onChange={setRole} />
        </Field>

        <div>
          <p className="form-section-title">Permissões extras</p>
          <PermissionPicker role={role} catalog={catalog} extras={extras} onToggle={(p) =>
            setExtras((current) =>
              current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
            )
          } />
        </div>

        {invite.isError && <p className="error">{errorMessage(invite.error)}</p>}
      </div>
    </Modal>
  )
}
