import React from 'react'
import { Bold, Braces, Italic, List, Minus, Underline as UnderlineIcon } from 'lucide-react'
import { DOC_FIELDS, GROUP_LABEL, fieldToken, type DocField } from './docFields'

/**
 * Editor de texto formatado dos modelos de documento.
 *
 * `contentEditable` com `document.execCommand`, sem biblioteca: o que se escreve
 * aqui é papel timbrado — título, ênfase, cor, lista e linha divisória dão conta,
 * e um editor pronto traria centenas de kB para o painel inteiro.
 *
 * `execCommand` está formalmente obsoleto, mas continua sendo o caminho que todos
 * os navegadores implementam para edição rica sem framework próprio. O conteúdo
 * gravado é HTML simples, então trocar o editor um dia não exige migrar dado.
 */

const COMANDOS = [
  { cmd: 'bold', icon: Bold, label: 'Negrito' },
  { cmd: 'italic', icon: Italic, label: 'Itálico' },
  { cmd: 'underline', icon: UnderlineIcon, label: 'Sublinhado' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Lista' },
] as const

const ALINHAMENTOS = [
  { cmd: 'justifyLeft', label: 'Alinhar à esquerda', simbolo: '⌐' },
  { cmd: 'justifyCenter', label: 'Centralizar', simbolo: '≡' },
  { cmd: 'justifyRight', label: 'Alinhar à direita', simbolo: '¬' },
] as const

/** Cores que combinam com papel impresso — preto, cinza e os tons da marca. */
const CORES = ['#2c2c2c', '#666666', '#b08d57', '#8c6d46', '#a33131'] as const

/**
 * Deixa passar só a marcação que o editor produz.
 *
 * Vale tanto para o que a médica formata aqui quanto para o que ela cola de
 * fora: sem isto, colar de um site traria script, iframe e estilo que quebram a
 * folha impressa.
 */
export function sanitizeHtml(html: string): string {
  const permitidas = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN',
    'UL', 'OL', 'LI', 'H2', 'H3', 'HR', 'FONT',
  ])
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')

  const limpar = (no: Element) => {
    for (const filho of [...no.children]) {
      if (!permitidas.has(filho.tagName)) {
        // Mantém o texto, descarta a marcação desconhecida.
        filho.replaceWith(...filho.childNodes)
        continue
      }
      for (const attr of [...filho.attributes]) {
        // `color` e `size` são o que o execCommand escreve em <font>.
        if (filho.tagName === 'FONT' && (attr.name === 'color' || attr.name === 'size')) continue
        if (attr.name !== 'style') {
          filho.removeAttribute(attr.name)
          continue
        }
        // Do estilo inline sobrevivem alinhamento e cor; o resto veio colado.
        const limpo = attr.value
          .split(';')
          .map((d) => d.trim())
          .filter((d) => /^(text-align:\s*(left|center|right)|color:\s*#[0-9a-f]{3,8})$/i.test(d))
          .join('; ')
        if (limpo) filho.setAttribute('style', limpo)
        else filho.removeAttribute('style')
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
  /** Mostra o menu de campos automáticos ({{paciente}}, {{data}}…) */
  withFields = true,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  withFields?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [menuCampos, setMenuCampos] = React.useState(false)
  const [menuCor, setMenuCor] = React.useState(false)

  /* O conteúdo só é escrito no DOM quando o que vem de fora difere do que já
     está lá. Reescrever a cada tecla jogaria o cursor para o início. */
  React.useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  const emitir = () => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML))
  }

  const aplicar = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emitir()
  }

  /* Insere no ponto onde o cursor estava. Sem restaurar a seleção, clicar no
     menu tira o foco do texto e o campo cairia sempre no fim. */
  const inserirTexto = (texto: string) => {
    ref.current?.focus()
    document.execCommand('insertText', false, texto)
    emitir()
  }

  const porGrupo = DOC_FIELDS.reduce<Record<string, DocField[]>>((acc, f) => {
    ;(acc[f.group] ??= []).push(f)
    return acc
  }, {})

  return (
    <div className="rich-text">
      <div className="rich-toolbar" role="toolbar" aria-label="Formatação">
        <select
          aria-label="Estilo do parágrafo"
          className="rich-select"
          value=""
          onChange={(e) => {
            if (e.target.value) aplicar('formatBlock', e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">Texto</option>
          <option value="h2">Título</option>
          <option value="h3">Subtítulo</option>
          <option value="p">Parágrafo</option>
        </select>

        <span className="rich-sep" aria-hidden="true" />
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

        <span className="rich-sep" aria-hidden="true" />
        <button
          type="button"
          onClick={() => aplicar('insertHorizontalRule')}
          title="Linha divisória"
          aria-label="Linha divisória"
        >
          <Minus size={14} aria-hidden="true" />
        </button>

        <div className="rich-menu-wrap">
          <button
            type="button"
            onClick={() => { setMenuCor((v) => !v); setMenuCampos(false) }}
            title="Cor do texto"
            aria-label="Cor do texto"
            aria-expanded={menuCor}
          >
            <span className="rich-color-dot" aria-hidden="true" />
          </button>
          {menuCor && (
            <div className="rich-menu rich-menu-cores">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  style={{ background: cor }}
                  title={cor}
                  aria-label={`Cor ${cor}`}
                  onClick={() => { aplicar('foreColor', cor); setMenuCor(false) }}
                />
              ))}
            </div>
          )}
        </div>

        {withFields && (
          <div className="rich-menu-wrap" style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="rich-field-button"
              onClick={() => { setMenuCampos((v) => !v); setMenuCor(false) }}
              title="Inserir campo automático"
              aria-expanded={menuCampos}
            >
              <Braces size={13} aria-hidden="true" />
              Campo
            </button>
            {menuCampos && (
              <div className="rich-menu rich-menu-campos" role="menu">
                <p className="rich-menu-hint">
                  O sistema troca pelo valor real ao emitir o documento.
                </p>
                {Object.entries(porGrupo).map(([grupo, campos]) => (
                  <div key={grupo}>
                    <p className="rich-menu-group">{GROUP_LABEL[grupo as DocField['group']]}</p>
                    {campos.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        role="menuitem"
                        onClick={() => { inserirTexto(fieldToken(f.key)); setMenuCampos(false) }}
                      >
                        {f.label}
                        <span>{f.sample}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
        onInput={emitir}
        onBlur={emitir}
        onPaste={(e) => {
          // Colar de Word ou navegador traz estilo e marcação de fora: entra
          // como texto puro, e a formatação se aplica aqui.
          e.preventDefault()
          const texto = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, texto)
          emitir()
        }}
      />
    </div>
  )
}
