import React from 'react'
import { Bold, Italic, List, Underline as UnderlineIcon } from 'lucide-react'

/**
 * Editor de texto formatado para cabeçalho e rodapé dos modelos.
 *
 * `contentEditable` com `document.execCommand`, sem biblioteca: o que se escreve
 * aqui é cabeçalho e rodapé de papel timbrado — negrito, itálico, sublinhado,
 * lista e alinhamento dão conta, e uma dependência de editor traria centenas de
 * kB para o painel inteiro por causa de dois campos.
 *
 * `execCommand` está formalmente obsoleto, mas continua sendo o caminho que
 * todos os navegadores implementam para edição rica sem framework próprio. Se
 * um dia sair, o conteúdo continua sendo HTML simples — trocar o editor não
 * exige migrar dado.
 */

const COMANDOS = [
  { cmd: 'bold', icon: Bold, label: 'Negrito' },
  { cmd: 'italic', icon: Italic, label: 'Itálico' },
  { cmd: 'underline', icon: UnderlineIcon, label: 'Sublinhado' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Lista' },
] as const

const ALINHAMENTOS = [
  { cmd: 'justifyLeft', label: 'Esquerda', simbolo: '⌐' },
  { cmd: 'justifyCenter', label: 'Centro', simbolo: '≡' },
  { cmd: 'justifyRight', label: 'Direita', simbolo: '¬' },
] as const

/** Só as marcações que o editor produz: o resto sai fora. */
export function sanitizeHtml(html: string): string {
  const permitidas = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'SPAN'])
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')

  const limpar = (no: Element) => {
    for (const filho of [...no.children]) {
      if (!permitidas.has(filho.tagName)) {
        // Mantém o texto, descarta a marcação desconhecida.
        filho.replaceWith(...filho.childNodes)
        continue
      }
      // Atributo nenhum sobrevive: é por onde entraria script ou estilo colado.
      for (const attr of [...filho.attributes]) {
        if (attr.name !== 'style') filho.removeAttribute(attr.name)
        else if (!/^text-align:\s*(left|center|right)$/.test(attr.value)) filho.removeAttribute('style')
      }
      limpar(filho)
    }
  }

  const raiz = doc.body.firstElementChild
  if (!raiz) return ''
  limpar(raiz)
  return raiz.innerHTML
}

export function RichText({
  value,
  onChange,
  placeholder,
  minHeight = 90,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  /* O conteúdo só é escrito no DOM quando vem de fora diferente do que já está
     lá. Reescrever a cada tecla jogaria o cursor para o início. */
  React.useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  const aplicar = (cmd: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false)
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML))
  }

  return (
    <div className="rich-text">
      <div className="rich-toolbar" role="toolbar" aria-label="Formatação">
        {COMANDOS.map(({ cmd, icon: Icon, label }) => (
          <button key={cmd} type="button" onClick={() => aplicar(cmd)} title={label} aria-label={label}>
            <Icon size={14} aria-hidden="true" />
          </button>
        ))}
        <span className="rich-sep" aria-hidden="true" />
        {ALINHAMENTOS.map(({ cmd, label, simbolo }) => (
          <button key={cmd} type="button" onClick={() => aplicar(cmd)} title={label} aria-label={label}>
            <span aria-hidden="true">{simbolo}</span>
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="rich-area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={(e) => onChange(sanitizeHtml((e.target as HTMLDivElement).innerHTML))}
        onPaste={(e) => {
          // Colar de Word ou navegador traz estilo e marcação de fora: entra
          // como texto puro, e a formatação se aplica aqui.
          e.preventDefault()
          const texto = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, texto)
        }}
      />
    </div>
  )
}
