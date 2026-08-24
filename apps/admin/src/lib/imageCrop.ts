/**
 * Recorte e compressão no navegador, antes do upload.
 *
 * Cada imagem da landing tem uma proporção fixa no layout (o hero é 4/5, o
 * fundo é 16/9). Enviar o arquivo cru significava duas coisas ruins ao mesmo
 * tempo: a foto de celular de 4032×3024 entrava inteira — seis megabytes na
 * primeira tela do site — e o `object-cover` decidia sozinho qual pedaço
 * mostrar, cortando cabeças. Recortar aqui resolve os dois: quem edita escolhe
 * o enquadramento, e o que sai é exatamente o tamanho que o site usa.
 */

export interface CropTarget {
  width: number
  height: number
  mime: string
  label: string
}

/** Posição e escala do recorte, em coordenadas da imagem original. */
export interface CropBox {
  /** Deslocamento do canto superior esquerdo da área visível, em px da origem. */
  x: number
  y: number
  /** Largura da área recortada na origem; a altura sai da proporção do alvo. */
  width: number
}

export interface LoadedImage {
  element: HTMLImageElement
  width: number
  height: number
  /** Precisa ser revogado quando a imagem sai de cena. */
  url: string
}

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const element = new Image()
    element.onload = () =>
      resolve({ element, width: element.naturalWidth, height: element.naturalHeight, url })
    element.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler esta imagem. Tente JPEG ou PNG.'))
    }
    element.src = url
  })
}

/**
 * Recorte inicial: o maior quadro na proporção do alvo que cabe na imagem,
 * centralizado. É o enquadramento que quem edita quase sempre quer, e evita
 * abrir a ferramenta com a imagem já cortada de um jeito estranho.
 */
export function initialCrop(image: { width: number; height: number }, target: CropTarget): CropBox {
  const targetRatio = target.width / target.height
  const imageRatio = image.width / image.height

  const width = imageRatio > targetRatio ? image.height * targetRatio : image.width
  const height = width / targetRatio

  return {
    x: (image.width - width) / 2,
    y: (image.height - height) / 2,
    width,
  }
}

/** Mantém o recorte dentro da imagem depois de arrastar ou dar zoom. */
export function clampCrop(
  crop: CropBox,
  image: { width: number; height: number },
  target: CropTarget,
): CropBox {
  const ratio = target.width / target.height

  // Nunca menor que o alvo: ampliar pixels que não existem só borra a imagem.
  const maxWidth = Math.min(image.width, image.height * ratio)
  const minWidth = Math.min(maxWidth, target.width)
  const width = Math.min(maxWidth, Math.max(minWidth, crop.width))
  const height = width / ratio

  return {
    width,
    x: Math.min(Math.max(0, crop.x), image.width - width),
    y: Math.min(Math.max(0, crop.y), image.height - height),
  }
}

export interface RenderedImage {
  blob: Blob
  width: number
  height: number
  sizeBytes: number
  /** Qualidade JPEG onde parou; útil para avisar que houve perda. */
  quality: number
}

/**
 * Orçamento por uso. O hero carrega na primeira tela e três slides somam o
 * triplo, então é o mais apertado. O logo é PNG e minúsculo de qualquer jeito.
 */
export const DEFAULT_BUDGET_BYTES = 320 * 1024

/**
 * Desenha o recorte no tamanho exato do alvo e comprime até caber no orçamento.
 *
 * A busca de qualidade é uma descida simples em vez de bisseção: são no máximo
 * cinco tentativas, cada `toBlob` custa poucos milissegundos, e o resultado é
 * previsível — sempre a maior qualidade da escala que coube.
 */
export async function renderCrop(
  image: HTMLImageElement,
  crop: CropBox,
  target: CropTarget,
  budgetBytes = DEFAULT_BUDGET_BYTES,
): Promise<RenderedImage> {
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('O navegador não conseguiu preparar a imagem.')

  // Reduções grandes ficam serrilhadas sem isto — e toda foto de celular é uma
  // redução grande.
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  const height = crop.width / (target.width / target.height)
  context.drawImage(image, crop.x, crop.y, crop.width, height, 0, 0, target.width, target.height)

  const toBlob = (quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))),
        target.mime,
        quality,
      )
    })

  /* PNG ignora o parâmetro de qualidade: ele existe pelo canal alfa, não pela
     compressão. O logo é o único uso, e um logo de verdade sai com poucos KB —
     mas uma foto salva em PNG passa de 300KB. Quem envia vê o tamanho final
     antes de confirmar. */
  if (target.mime === 'image/png') {
    const blob = await toBlob(1)
    return { blob, width: target.width, height: target.height, sizeBytes: blob.size, quality: 1 }
  }

  let blob = await toBlob(0.9)
  let quality = 0.9
  for (const next of [0.82, 0.74, 0.66, 0.58]) {
    if (blob.size <= budgetBytes) break
    quality = next
    blob = await toBlob(next)
  }

  return { blob, width: target.width, height: target.height, sizeBytes: blob.size, quality }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
