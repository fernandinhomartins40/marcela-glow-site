// Gera, a partir do ícone mestre de cada app, tudo o que mostra a marca fora do
// próprio ícone da loja:
//   - public/icon-192.png, icon-512.png e icon.svg (PWA e a abertura animada,
//     que busca o ícone no manifesto do servidor);
//   - a tela de abertura nativa do iOS (Splash.imageset) e do Android
//     (drawable*/splash.png).
//
// A abertura nativa imita o primeiro quadro da abertura animada (`Splash.tsx`):
// o mesmo degradê de 160° e o ícone com 74pt e cantos de 20pt, no centro. Assim
// a passagem de uma para a outra não pisca.
//
// Uso: node scripts/gerar-aberturas.mjs   (depois de trocar icone-mestre.png)
import sharp from 'sharp'
import { readdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const hsl = (h, s, l) => {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
  return '#' + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const APPS = {
  patient: { mestre: 'docs/nativo/lojas/icones/paciente/icone-mestre.png', de: hsl(30, 29, 98), ate: hsl(28, 42, 85) }, // --card → --secondary
  admin: { mestre: 'docs/nativo/lojas/icones/medica/icone-mestre.png', de: '#fffdfa', ate: '#e9d8c9' }, // --cream-soft → --cream-deep
}

// Degradê CSS de 160° num retângulo w×h, em coordenadas do próprio retângulo.
function fundo(w, h, de, ate) {
  const a = (160 * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a)
  const meio = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const [x1, y1, x2, y2] = [w / 2 - dx * meio, h / 2 - dy * meio, w / 2 + dx * meio, h / 2 + dy * meio]
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${de}"/><stop offset="1" stop-color="${ate}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`)
}

async function iconeArredondado(mestre, lado) {
  const raio = Math.round((lado * 20) / 74)
  const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${raio}" ry="${raio}"/></svg>`)
  return sharp(mestre).resize(lado, lado, { kernel: 'lanczos3' }).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer()
}

async function abertura(arquivo, w, h, app, lado) {
  const { mestre, de, ate } = APPS[app]
  const icone = await iconeArredondado(mestre, lado)
  await sharp(fundo(w, h, de, ate))
    .composite([{ input: icone, left: Math.round((w - lado) / 2), top: Math.round((h - lado) / 2) }])
    .flatten({ background: de })
    .png({ compressionLevel: 9 })
    .toFile(arquivo)
}

for (const app of Object.keys(APPS)) {
  const { mestre } = APPS[app]
  const raiz = `apps/${app}`

  // PWA e abertura animada. O SVG leva o PNG dentro: é o mesmo desenho, e quem
  // ainda aponta para `icon.svg` (manifesto do build, apple-touch-icon) recebe a marca nova.
  for (const lado of [192, 512]) await sharp(mestre).resize(lado, lado, { kernel: 'lanczos3' }).png().toFile(join(raiz, 'public', `icon-${lado}.png`))
  const b64 = (await sharp(mestre).resize(256, 256, { kernel: 'lanczos3' }).png().toBuffer()).toString('base64')
  writeFileSync(join(raiz, 'public', 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${b64}"/></svg>\n`)

  // iOS: imagem quadrada de 2732 mostrada em "aspect fill"; num iPhone de 3x a
  // escala fica perto de 0,94, então 237px no arquivo dão os 74pt da tela.
  const ios = join(raiz, 'ios/App/App/Assets.xcassets/Splash.imageset')
  for (const f of readdirSync(ios).filter((f) => /^Default@.*\.png$/.test(f))) await abertura(join(ios, f), 2732, 2732, app, 237)
  // A fonte do `@capacitor/assets` também: senão uma nova geração de ícones traz a abertura antiga de volta.
  for (const f of ['splash.png', 'splash-dark.png']) if (existsSync(join(raiz, 'resources', f))) await abertura(join(raiz, 'resources', f), 2732, 2732, app, 237)

  // Android: um arquivo por densidade e orientação; 74dp em telas de ~340dp.
  const res = join(raiz, 'android/app/src/main/res')
  for (const pasta of readdirSync(res).filter((p) => p.startsWith('drawable'))) {
    const f = join(res, pasta, 'splash.png')
    if (!existsSync(f)) continue
    const { width: w, height: h } = await sharp(f).metadata()
    await abertura(f, w, h, app, Math.round((Math.min(w, h) * 74) / 340))
  }
  console.log(app, 'ok')
}
