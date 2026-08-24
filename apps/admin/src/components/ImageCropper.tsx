import React from 'react'
import axios from 'axios'
import { ImageOff, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { api, errorMessage, Field, Modal, SubmitButton } from '../lib/ui'
import {
  clampCrop,
  DEFAULT_BUDGET_BYTES,
  formatBytes,
  initialCrop,
  loadImage,
  renderCrop,
  type CropBox,
  type CropTarget,
  type LoadedImage,
} from '../lib/imageCrop'

/**
 * Escolher o arquivo, enquadrar e enviar — nesta ordem, numa tela só.
 *
 * O enquadramento é obrigatório porque o alvo tem proporção fixa: sem ele o
 * `object-cover` do site é que decide o que cortar, e ele corta pelo centro
 * geométrico, não pelo rosto.
 */
export function ImageCropper({
  slot,
  target,
  currentUrl,
  currentAlt,
  onDone,
  onClose,
}: {
  slot: string
  target: CropTarget
  currentUrl?: string
  currentAlt?: string
  onDone: () => void
  onClose: () => void
}) {
  const [image, setImage] = React.useState<LoadedImage | null>(null)
  const [crop, setCrop] = React.useState<CropBox | null>(null)
  const [alt, setAlt] = React.useState(currentAlt ?? '')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [progress, setProgress] = React.useState<string | null>(null)

  const frameRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ pointerX: number; pointerY: number; cropX: number; cropY: number } | null>(null)

  // A URL do objeto segura o arquivo em memória até ser revogada.
  React.useEffect(() => () => { if (image) URL.revokeObjectURL(image.url) }, [image])

  async function pick(file: File) {
    setError(null)
    try {
      const loaded = await loadImage(file)
      if (loaded.width < target.width || loaded.height < target.height) {
        setError(
          `Esta imagem tem ${loaded.width}×${loaded.height}px, menor que os ${target.width}×${target.height}px que o site usa. ` +
            'Ampliar não cria detalhe — escolha um arquivo maior.',
        )
        URL.revokeObjectURL(loaded.url)
        return
      }
      if (image) URL.revokeObjectURL(image.url)
      setImage(loaded)
      setCrop(initialCrop(loaded, target))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler esta imagem.')
    }
  }

  /* O quadro na tela mostra a área recortada; arrastar move a imagem por baixo
     dele. A conversão de pixels de tela para pixels da origem usa a razão entre
     a largura do recorte e a largura do quadro. */
  function scaleFactor() {
    const frame = frameRef.current
    if (!frame || !crop) return 1
    return crop.width / frame.clientWidth
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!crop) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, cropX: crop.x, cropY: crop.y }
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || !crop || !image) return
    const scale = scaleFactor()
    setCrop(
      clampCrop(
        {
          width: crop.width,
          x: drag.cropX - (event.clientX - drag.pointerX) * scale,
          y: drag.cropY - (event.clientY - drag.pointerY) * scale,
        },
        image,
        target,
      ),
    )
  }

  function onPointerUp(event: React.PointerEvent) {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  /** Zoom em torno do centro do quadro, para não deslocar o que está enquadrado. */
  function zoom(factor: number) {
    if (!crop || !image) return
    const ratio = target.width / target.height
    const nextWidth = crop.width * factor
    const centerX = crop.x + crop.width / 2
    const centerY = crop.y + crop.width / ratio / 2
    setCrop(
      clampCrop(
        { width: nextWidth, x: centerX - nextWidth / 2, y: centerY - nextWidth / ratio / 2 },
        image,
        target,
      ),
    )
  }

  /* Renderizar de verdade a cada ajuste é o único jeito honesto de mostrar o
     peso final — estimar por área erra por um fator de dois em imagem lisa. O
     atraso evita refazer isso a cada quadro do arrasto. */
  const [preview, setPreview] = React.useState<{ bytes: number; quality: number } | null>(null)
  React.useEffect(() => {
    if (!image || !crop) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const rendered = await renderCrop(image.element, crop, target)
        if (!cancelled) setPreview({ bytes: rendered.sizeBytes, quality: rendered.quality })
      } catch {
        // Prévia é conforto, não requisito: o envio real reporta o erro.
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [image, crop, target])

  async function submit() {
    if (!image || !crop) return
    setPending(true)
    setError(null)
    try {
      setProgress('Preparando a imagem...')
      const rendered = await renderCrop(image.element, crop, target)

      setProgress('Enviando...')
      const presign = await api.post('/landing/admin/images/presign', {
        slot,
        mimeType: target.mime,
      })
      await axios.put(presign.data.uploadUrl, rendered.blob, {
        headers: { 'Content-Type': target.mime },
      })
      await api.post('/landing/admin/images', {
        slot,
        storageKey: presign.data.storageKey,
        width: rendered.width,
        height: rendered.height,
        sizeBytes: rendered.sizeBytes,
        mimeType: target.mime,
        alt: alt.trim(),
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar a imagem.'))
    } finally {
      setPending(false)
      setProgress(null)
    }
  }

  const ratio = target.width / target.height
  const zoomPercent = image && crop ? Math.round((image.width / crop.width) * 100) : 100
  const canZoomIn = Boolean(crop && crop.width > target.width)
  const canZoomOut = Boolean(image && crop && crop.width < Math.min(image.width, image.height * ratio) - 1)
  const valid = Boolean(image && crop && alt.trim().length >= 3)

  return (
    <Modal
      title={target.label}
      subtitle={`Recortado para ${target.width}×${target.height}px — o tamanho que o site usa`}
      wide
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>Cancelar</button>
          <SubmitButton pending={pending} disabled={!valid} onClick={submit}>
            {progress ?? 'Enviar imagem'}
          </SubmitButton>
        </>
      }
    >
      <div className="form-grid">
        {!image ? (
          <>
            {currentUrl && (
              <div className="crop-current">
                <img src={currentUrl} alt={currentAlt ?? ''} style={{ aspectRatio: `${ratio}` }} />
                <p className="hint">Imagem atual. Escolher um arquivo abaixo substitui esta.</p>
              </div>
            )}
            <label className="crop-drop">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
              />
              <Upload size={20} aria-hidden="true" />
              <strong>Escolher imagem</strong>
              <span>
                JPEG, PNG ou WebP com pelo menos {target.width}×{target.height}px
              </span>
            </label>
          </>
        ) : (
          <>
            <div
              ref={frameRef}
              className="crop-frame"
              style={{ aspectRatio: `${ratio}` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {crop && (
                <img
                  src={image.url}
                  alt=""
                  draggable={false}
                  /* Percentuais são relativos ao quadro: `left`/`width` à
                     largura dele, `top`/`height` à altura. Por isso o
                     deslocamento vertical se mede contra a altura do recorte
                     (crop.width / ratio), não contra a largura. */
                  style={{
                    position: 'absolute',
                    width: `${(image.width / crop.width) * 100}%`,
                    height: `${(image.height / (crop.width / ratio)) * 100}%`,
                    left: `${(-crop.x / crop.width) * 100}%`,
                    top: `${(-crop.y / (crop.width / ratio)) * 100}%`,
                    maxWidth: 'none',
                  }}
                />
              )}
              <div className="crop-guides" aria-hidden="true" />
            </div>

            <div className="crop-controls">
              <button type="button" onClick={() => zoom(1 / 0.85)} disabled={!canZoomOut} title="Menos zoom">
                <ZoomOut size={15} aria-hidden="true" />
              </button>
              <span className="crop-zoom">{zoomPercent}%</span>
              <button type="button" onClick={() => zoom(0.85)} disabled={!canZoomIn} title="Mais zoom">
                <ZoomIn size={15} aria-hidden="true" />
              </button>
              <span className="hint">Arraste a imagem para escolher o enquadramento.</span>
              <button type="button" className="crop-reset" onClick={() => setCrop(initialCrop(image, target))}>
                Centralizar
              </button>
            </div>

            {preview && (
              <p className="crop-weight">
                Resultado: {target.width}×{target.height}px · {formatBytes(preview.bytes)}
                {preview.quality < 0.9 && ' · comprimida para caber no orçamento da página'}
                {preview.bytes > DEFAULT_BUDGET_BYTES && (
                  <strong>
                    {' '}
                    — acima do que uma página deveria carregar
                    {target.mime === 'image/png' && ': PNG guarda foto sem comprimir, e o logo funciona melhor como desenho simples'}
                    .
                  </strong>
                )}
              </p>
            )}

            <Field
              label="Descrição da imagem"
              required
              hint="Lida em voz alta por quem usa leitor de tela, e exibida se a imagem não carregar."
            >
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Ex.: Dra. Marcela em pé no consultório"
                maxLength={200}
              />
            </Field>
          </>
        )}

        {error && (
          <p className="error crop-error">
            <ImageOff size={14} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
