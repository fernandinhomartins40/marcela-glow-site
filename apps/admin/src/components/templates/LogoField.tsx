import React from 'react'
import axios from 'axios'
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { api, errorMessage } from '../../lib/ui'

/**
 * Logo do modelo, enviado ao storage.
 *
 * O arquivo vai direto do navegador para o bucket por URL assinada — a API só
 * assina e registra. Campo de link externo não entra aqui: um servidor de
 * terceiros fora do ar deixaria o papel timbrado quebrado no meio de uma
 * impressão, e o projeto já tem o fluxo de upload pronto.
 */
export function LogoField({
  url,
  onChange,
}: {
  url: string | null | undefined
  onChange: (url: string | null) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function enviar(file: File) {
    setPending(true)
    setError(null)
    try {
      const meta = {
        fileName: file.name,
        mimeType: file.type || 'image/png',
        sizeBytes: file.size,
      }
      const presign = await api.post('/clinical/templates/logo/presign', meta)
      await axios.put(presign.data.uploadUrl, file, { headers: { 'Content-Type': meta.mimeType } })
      const { data } = await api.post('/clinical/templates/logo/complete', {
        ...meta,
        storageKey: presign.data.storageKey,
      })
      onChange(data.url)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar o logo.'))
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="logo-field">
      <div className="logo-thumb">
        {url ? (
          <img src={url} alt="Logo do modelo" />
        ) : (
          <span className="logo-empty">
            <ImageIcon size={18} aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="logo-text">
        <span className="hint">
          {url ? 'Aparece no bloco de dados da clínica.' : 'PNG, JPG, WEBP ou SVG, até 5 MB.'}
        </span>
        <div className="logo-actions">
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) enviar(file)
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            {url ? 'Trocar' : 'Enviar logo'}
          </button>
          {url && !pending && (
            <button type="button" onClick={() => onChange(null)} title="Remover logo">
              <Trash2 size={14} />
              Remover
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
