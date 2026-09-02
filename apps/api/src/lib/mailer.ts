import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envio de e-mail transacional.
 *
 * Existe porque três fluxos geram um token que só serve se chegar à pessoa:
 * recuperação de senha da equipe, da paciente, e convite de novo integrante.
 * Sem SMTP configurado o token era gerado e descartado — em produção a resposta
 * nem devolvia o valor, então ninguém conseguia concluir.
 *
 * Quando o SMTP não está configurado o link vai para o log do servidor em vez
 * de sumir: em desenvolvimento isso mantém o fluxo utilizável sem depender de
 * um provedor, e em produção deixa rastro para a equipe socorrer alguém preso
 * na porta. O e-mail nunca derruba a requisição que o disparou.
 */

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT || 587)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASSWORD
const from = process.env.SMTP_FROM || 'Dra. Marcela Duch <nao-responda@drmarceladuch.com.br>'

export const mailerConfigured = Boolean(host && user && pass)

let transporter: Transporter | null = null
if (mailerConfigured) {
  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 é TLS implícito; as demais portas usam STARTTLS.
    secure: port === 465,
    auth: { user: user!, pass: pass! },
  })
}

export interface MailInput {
  to: string
  subject: string
  /** Texto puro. O HTML é derivado dele, para não manter duas versões. */
  body: string
  /** Chamada para ação opcional, renderizada como botão no HTML e URL no texto. */
  action?: { label: string; url: string }
}

/** URL pública do site, base para os links enviados por e-mail. */
export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || 'http://localhost:3095').replace(/\/$/, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Layout único para todo e-mail do sistema. Estilo inline porque cliente de
 * e-mail ignora folha de estilo externa.
 */
function renderHtml(input: MailInput): string {
  const paragraphs = input.body
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  const action = input.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.action.url)}" style="background:#b08d57;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(input.action.label)}</a></p>
       <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.6">Se o botão não funcionar, copie este endereço no navegador:<br>${escapeHtml(input.action.url)}</p>`
    : ''

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#faf7f2;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2c2c2c">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<h1 style="margin:0 0 24px;font-size:18px;font-weight:600">${escapeHtml(input.subject)}</h1>
${paragraphs}${action}
<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:12px">Este é um e-mail automático — não responda.</p>
</div></body></html>`
}

/**
 * Envia um e-mail. Nunca lança: quem chama está no meio de um fluxo que já
 * concluiu (token gravado, convite criado) e não pode falhar por causa do envio.
 */
export async function sendMail(input: MailInput): Promise<{ sent: boolean }> {
  if (!transporter) {
    const link = input.action ? ` | ${input.action.url}` : ''
    console.warn(`[mailer] SMTP nao configurado. Destino: ${input.to} | ${input.subject}${link}`)
    return { sent: false }
  }

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.action ? `${input.body}\n\n${input.action.url}` : input.body,
      html: renderHtml(input),
    })
    return { sent: true }
  } catch (err) {
    console.error(`[mailer] Falha ao enviar para ${input.to}:`, err)
    return { sent: false }
  }
}
