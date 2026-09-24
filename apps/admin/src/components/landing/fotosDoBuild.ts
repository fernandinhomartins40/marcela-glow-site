import draEditorial from '../../assets/dra-marcela-editorial-limpa-v1.png'
import draPortrait from '../../assets/dra-marcela-portrait-limpa-v1.png'
import marble from '../../assets/hero-regeneracao-desktop-v1.png'
import logoMD from '../../assets/brand/md-monogram-white.webp'
import careFace from '../../assets/approved/treatment-face-v2.webp'
import careSkin from '../../assets/approved/treatment-skin-v2.webp'
import careNeck from '../../assets/approved/treatment-neck-v2.webp'
import careBody from '../../assets/approved/treatment-body-v2.webp'

/**
 * As fotos que o site traz no build.
 *
 * Sem uma foto enviada pelo painel, o site NÃO mostra espaço vazio: ele cai
 * nestas. O painel mostrava um retângulo escrito "sem foto", o que fazia
 * parecer que a seção estava incompleta quando ela já estava no ar, com foto.
 *
 * São os mesmos arquivos de `apps/web/src/assets`, na mesma ordem em que o
 * hero os usa. Um espaço que não aparece aqui é um que o site deixa mesmo
 * vazio até alguém enviar a imagem — o fundo de mármore e a imagem de
 * compartilhamento são assim.
 *
 * Cópia consciente: os quatro apps são silos independentes e não compartilham
 * código. Se o site trocar a foto de um slide, esta lista precisa acompanhar —
 * é o preço de a prévia dizer a verdade sem o admin importar de `apps/web`.
 */
export const FOTOS_DO_BUILD: Record<string, string> = {
  'hero.0': draEditorial,
  'hero.1': draPortrait,
  'hero.2': marble,
  'about.portrait': draPortrait,
  'footer.logo': logoMD,
  /* Os cartões das áreas de cuidado, na ordem do site (`CareAreas.tsx`). */
  'care.0': careFace,
  'care.1': careSkin,
  'care.2': careNeck,
  'care.3': careBody,
}
