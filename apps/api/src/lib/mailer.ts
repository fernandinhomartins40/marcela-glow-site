/**
 * Envio de e-mail transacional, pelo Velomail (servidor de e-mail próprio do
 * desenvolvedor, API HTTP — `POST /api/emails/send` com chave Bearer).
 *
 * Existe porque os fluxos de recuperação de senha, convite da equipe, ativação
 * do portal e avisos de agendamento geram algo que só serve se chegar à pessoa.
 *
 * Sem `VELOMAIL_API_KEY` o link vai para o log do servidor em vez de sumir: em
 * desenvolvimento isso mantém o fluxo utilizável sem provedor, e em produção
 * deixa rastro para a equipe socorrer alguém preso na porta. O e-mail nunca
 * derruba a requisição que o disparou.
 */

const apiKey = process.env.VELOMAIL_API_KEY
const apiUrl = process.env.VELOMAIL_API_URL || 'https://www.velomail.com.br/api/emails/send'
// O Velomail só aceita endereço puro no `from`, de domínio autenticado nele.
const from = process.env.MAIL_FROM || 'nao-responda@dramarceladuch.com.br'
const replyTo = process.env.MAIL_REPLY_TO || undefined

export const mailerConfigured = Boolean(apiKey)

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

/* Paleta oficial do kit de marca (Dra_Marcela_Duch_Brand_Assets/README.md).
   Contraste medido (WCAG): grafite/branco 15,57:1; botão off-white/institucional
   9,33:1; rodapé #6B5A4E/nude claro 4,73:1; nude/marrom profundo 6,21:1. */
const COR = {
  profundo: '#3E281F',
  institucional: '#5B3828',
  nude: '#C7A98D',
  nudeClaro: '#E9D8C9',
  offWhite: '#F8F3EE',
  grafite: '#272321',
  apoio: '#6B5A4E',
}

const SERIFA = "'Cormorant Garamond',Georgia,'Times New Roman',serif"
const SANS = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/**
 * Layout único para todo e-mail do sistema, na identidade da marca: faixa em
 * marrom profundo com o monograma MD branco, cartão branco sobre off-white,
 * botão no marrom institucional. Tabelas e estilo inline porque cliente de
 * e-mail (Outlook, Gmail) ignora folha de estilo e layout moderno.
 */
export function renderHtml(input: MailInput): string {
  const base = publicBaseUrl()
  const paragrafos = input.body
    .split('\n\n')
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${COR.grafite}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`,
    )
    .join('')

  const acao = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:${COR.institucional}">
<a href="${escapeHtml(input.action.url)}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:.04em;color:${COR.offWhite};text-decoration:none;border-radius:999px">${escapeHtml(input.action.label)}</a>
</td></tr></table>
<p style="margin:16px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${COR.apoio}">Se o botão não funcionar, copie este endereço no navegador:<br><span style="word-break:break-all">${escapeHtml(input.action.url)}</span></p>`
    : ''

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${COR.offWhite}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.offWhite}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="background:${COR.profundo};border-radius:16px 16px 0 0;padding:28px 24px 22px">
<img src="${base}/email/monograma-branco.png" width="56" height="56" alt="MD" style="display:block;border:0;width:56px;height:56px">
<p style="margin:14px 0 0;font-family:${SERIFA};font-size:20px;letter-spacing:.22em;text-transform:uppercase;color:${COR.offWhite}">Dra. Marcela Duch</p>
<p style="margin:4px 0 0;font-family:${SANS};font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${COR.nude}">Medicina Estética</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 32px;border-left:1px solid ${COR.nudeClaro};border-right:1px solid ${COR.nudeClaro}">
<h1 style="margin:0 0 20px;font-family:${SERIFA};font-size:26px;font-weight:600;line-height:1.25;color:${COR.institucional}">${escapeHtml(input.subject)}</h1>
${paragrafos}${acao}
</td></tr>
<tr><td align="center" style="background:${COR.nudeClaro};border-radius:0 0 16px 16px;padding:20px 24px">
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${COR.apoio}">Este é um e-mail automático da clínica Dra. Marcela Duch — não responda.<br>
<a href="${base}/privacidade" style="color:${COR.institucional}">Política de privacidade</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

/**
 * Envia um e-mail. Nunca lança: quem chama está no meio de um fluxo que já
 * concluiu (token gravado, convite criado) e não pode falhar por causa do envio.
 */
export async function sendMail(input: MailInput): Promise<{ sent: boolean }> {
  if (!apiKey) {
    const link = input.action ? ` | ${input.action.url}` : ''
    console.warn(`[mailer] Velomail nao configurado. Destino: ${input.to} | ${input.subject}${link}`)
    return { sent: false }
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from,
        reply_to: replyTo,
        to: input.to,
        subject: input.subject,
        text: input.action ? `${input.body}\n\n${input.action.url}` : input.body,
        html: renderHtml(input),
        tracking_enabled: false,
      }),
    })
    if (!res.ok) throw new Error(`Velomail respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return { sent: true }
  } catch (err) {
    console.error(`[mailer] Falha ao enviar para ${input.to}:`, err)
    return { sent: false }
  }
}
