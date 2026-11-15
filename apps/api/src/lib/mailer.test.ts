import { describe, expect, it } from 'vitest'
import { renderHtml } from './mailer'

describe('modelo de e-mail', () => {
  it('escapa o texto: nome de paciente não vira marcação no e-mail', () => {
    const html = renderHtml({
      to: 'a@b.c',
      subject: 'Olá <b>Ana</b>',
      body: 'Linha <script>x</script>',
      action: { label: 'Abrir', url: 'https://site/x?a="1"' },
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>Ana</b>')
    expect(html).toContain('Olá &lt;b&gt;Ana&lt;/b&gt;')
    expect(html).toContain('href="https://site/x?a=&quot;1&quot;"')
  })

  it('leva o monograma e o link da política do próprio site', () => {
    const html = renderHtml({ to: 'a@b.c', subject: 'Teste', body: 'Oi' })
    expect(html).toContain('/email/monograma-branco.png')
    expect(html).toContain('/privacidade')
  })
})
