import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react'
import { api, errorMessage, Field, FormRow, SubmitButton } from '../lib/ui'

type ProviderId = 'BIRDID' | 'VIDAAS' | 'SAFEID' | 'CUSTOM'

interface Provider {
  id: ProviderId
  label: string
  consoleUrl: string
  passwordLabel: string
  notes: string
}

interface Config {
  provider: ProviderId
  clientId: string
  clientSecretMasked: string | null
  cpf: string
  certificateAlias: string | null
  tokenUrl: string
  signUrl: string
  enabled: boolean
  configured: boolean
  lastTestAt: string | null
  lastTestOk: boolean | null
}

/**
 * Configuração do certificado digital em nuvem.
 *
 * Não existe upload de arquivo aqui, e isso é proposital: no certificado em
 * nuvem a chave privada nasce e permanece na Autoridade Certificadora, sob
 * controle exclusivo da médica. O sistema guarda apenas as credenciais de
 * integração e envia o hash do documento na hora de assinar.
 */
export function Certificate() {
  const client = useQueryClient()
  const [form, setForm] = React.useState({
    provider: 'BIRDID' as ProviderId,
    clientId: '',
    clientSecret: '',
    cpf: '',
    tokenUrl: '',
    signUrl: '',
  })
  const [otp, setOtp] = React.useState('')
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null)
  const [loaded, setLoaded] = React.useState(false)

  const providers = useQuery({
    queryKey: ['signature-providers'],
    queryFn: async () => (await api.get('/clinical/signature/providers')).data as Provider[],
  })

  const configQuery = useQuery({
    queryKey: ['signature-config'],
    queryFn: async () =>
      (await api.get('/clinical/signature/config')).data as { config: Config | null; currentLevel: string },
  })

  React.useEffect(() => {
    const config = configQuery.data?.config
    if (!config || loaded) return
    setForm({
      provider: config.provider,
      clientId: config.clientId,
      clientSecret: '',
      cpf: config.cpf,
      tokenUrl: config.tokenUrl ?? '',
      signUrl: config.signUrl ?? '',
    })
    setLoaded(true)
  }, [configQuery.data, loaded])

  const save = useMutation({
    mutationFn: async () =>
      api.put('/clinical/signature/config', {
        provider: form.provider,
        clientId: form.clientId,
        // Vazio significa "manter o segredo atual"
        clientSecret: form.clientSecret || undefined,
        cpf: form.cpf,
        ...(form.provider === 'CUSTOM' ? { tokenUrl: form.tokenUrl, signUrl: form.signUrl } : {}),
      }),
    onSuccess: () => {
      setForm((prev) => ({ ...prev, clientSecret: '' }))
      client.invalidateQueries({ queryKey: ['signature-config'] })
    },
  })

  const test = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/clinical/signature/test', { otp })
      return data as { ok: boolean; certificateAlias?: string }
    },
    onSuccess: (data) => {
      setTestResult({
        ok: true,
        message: data.certificateAlias
          ? `Certificado reconhecido: ${data.certificateAlias}`
          : 'Conexão validada com sucesso.',
      })
      setOtp('')
      client.invalidateQueries({ queryKey: ['signature-config'] })
    },
    onError: (error) => setTestResult({ ok: false, message: errorMessage(error) }),
  })

  const config = configQuery.data?.config
  const profile = providers.data?.find((p) => p.id === form.provider)
  const active = config?.enabled && config?.lastTestOk

  return (
    <div className="grid" style={{ gap: 14 }}>
      {/* Situação atual */}
      <section className={`cert-status ${active ? 'active' : ''}`}>
        {active ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
        <div>
          <strong>
            {active ? 'Assinatura qualificada ativa' : 'Certificado digital não configurado'}
          </strong>
          <p>
            {active
              ? 'As receitas assinadas têm validade legal em farmácia, inclusive para medicamentos controlados e antimicrobianos.'
              : 'Sem certificado ICP-Brasil, as receitas emitidas aqui não são aceitas na farmácia. Siga os passos abaixo para configurar.'}
          </p>
          {config?.lastTestAt && (
            <p className="cert-meta">
              Último teste: {new Date(config.lastTestAt).toLocaleString('pt-BR')} —{' '}
              {config.lastTestOk ? 'sucesso' : 'falhou'}
            </p>
          )}
        </div>
      </section>

      {/* Passo 1 — obter o certificado */}
      <section className="list">
        <h2>1. Obter o certificado digital</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          O CFM oferece certificado ICP-Brasil em nuvem <strong>gratuito</strong> para médicos com
          inscrição ativa e em dia. É o mesmo padrão exigido por lei para receitas de medicamentos
          controlados.
        </p>

        <ol className="cert-steps">
          <li>
            <span>Verifique os pré-requisitos</span>
            <p>
              Inscrição regular e adimplente no CRM, Cédula de Identidade Médica em policarbonato, e
              não ter recebido certificado gratuito nos últimos 12 meses.
            </p>
          </li>
          <li>
            <span>Solicite pelo site do CFM</span>
            <p>
              Acesse o portal do Certificado Digital do CFM e clique em “Solicite seu certificado”.
              Também é possível solicitar pelo CRM Virtual do seu estado.
            </p>
            <a href="https://certificadodigital.cfm.org.br/" target="_blank" rel="noopener noreferrer" className="cert-link">
              certificadodigital.cfm.org.br <ExternalLink size={13} />
            </a>
          </li>
          <li>
            <span>Faça a validação por videoconferência</span>
            <p>
              A Autoridade Certificadora agenda uma videoconferência para confirmar sua identidade.
              Tenha os documentos originais em mãos.
            </p>
          </li>
          <li>
            <span>Instale o aplicativo no celular</span>
            <p>
              Ao final, você ativa o certificado no app do provedor (Bird ID, VIDaaS ou SafeID). É
              nele que você gera o código de 6 dígitos usado para assinar cada documento.
            </p>
          </li>
        </ol>
      </section>

      {/* Passo 2 — credenciais de integração */}
      <section className="list">
        <h2>2. Conectar ao sistema</h2>
        <p className="hint" style={{ marginBottom: 14 }}>
          Solicite ao provedor as credenciais de integração por API (<code>client_id</code> e{' '}
          <code>client_secret</code>). Elas identificam a clínica; sua identidade continua sendo
          confirmada pelo aplicativo a cada assinatura.
        </p>

        <div className="form-grid">
          <Field label="Provedor do certificado" required>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as ProviderId })}
            >
              {providers.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {profile?.notes && (
            <p className="hint">
              {profile.notes}
              {profile.consoleUrl && (
                <>
                  {' '}
                  <a href={profile.consoleUrl} target="_blank" rel="noopener noreferrer" className="cert-link">
                    Site do provedor <ExternalLink size={12} />
                  </a>
                </>
              )}
            </p>
          )}

          <FormRow>
            <Field label="Client ID" required>
              <input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                placeholder="fornecido pelo provedor"
              />
            </Field>
            <Field
              label="Client Secret"
              required={!config?.configured}
              hint={config?.clientSecretMasked ? `Salvo: ${config.clientSecretMasked} — deixe em branco para manter` : 'Guardado cifrado'}
            >
              <input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                placeholder={config?.clientSecretMasked ?? 'fornecido pelo provedor'}
              />
            </Field>
          </FormRow>

          <Field label="CPF da médica" required hint="Titular do certificado">
            <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
          </Field>

          {form.provider === 'CUSTOM' && (
            <FormRow>
              <Field label="URL de autenticação" required>
                <input value={form.tokenUrl} onChange={(e) => setForm({ ...form, tokenUrl: e.target.value })} />
              </Field>
              <Field label="URL de assinatura" required>
                <input value={form.signUrl} onChange={(e) => setForm({ ...form, signUrl: e.target.value })} />
              </Field>
            </FormRow>
          )}

          {save.isError && <p className="error">{errorMessage(save.error)}</p>}

          <div className="row-actions">
            <SubmitButton
              pending={save.isPending}
              disabled={!form.clientId || !form.cpf || (!config?.configured && !form.clientSecret)}
              onClick={() => save.mutate()}
            >
              Salvar credenciais
            </SubmitButton>
            {save.isSuccess && (
              <span className="saved-flag">
                <CheckCircle2 size={13} /> Salvo
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Passo 3 — validar */}
      <section className="list">
        <h2>3. Validar a conexão</h2>
        <p className="hint" style={{ marginBottom: 14 }}>
          Abra o aplicativo do certificado no celular, gere o código de 6 dígitos e informe abaixo.
          O sistema fará uma assinatura de teste para confirmar que está tudo certo.
        </p>

        <div className="otp-row">
          <Smartphone size={17} />
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder={profile?.passwordLabel ?? 'Código do aplicativo'}
            inputMode="numeric"
            aria-label="Código do aplicativo"
          />
          <button
            className="primary"
            onClick={() => {
              setTestResult(null)
              test.mutate()
            }}
            disabled={!config?.configured || otp.length < 6 || test.isPending}
          >
            {test.isPending ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
            Testar
          </button>
        </div>

        {!config?.configured && <p className="hint">Salve as credenciais antes de testar.</p>}

        {testResult && (
          <div className={testResult.ok ? 'legal-ok' : 'legal-warning'} style={{ marginTop: 12 }}>
            {testResult.ok ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
            <div>
              <strong>{testResult.ok ? 'Certificado ativo' : 'Não foi possível validar'}</strong>
              <p>{testResult.message}</p>
            </div>
          </div>
        )}
      </section>

      {/* Por que não há upload */}
      <section className="list">
        <h2>Por que não envio um arquivo de certificado?</h2>
        <p className="hint">
          No certificado em nuvem, a chave privada é criada e permanece na Autoridade Certificadora,
          protegida em hardware. Ela nunca é exportada — nem para você, nem para este sistema. Na
          hora de assinar, o sistema envia apenas o <strong>resumo criptográfico</strong> do
          documento; a assinatura acontece do lado da AC, autorizada pelo código do seu aplicativo.
          É esse controle exclusivo que dá validade jurídica à assinatura, conforme a MP 2.200-2 e a
          Lei 14.063/2020.
        </p>
      </section>
    </div>
  )
}
