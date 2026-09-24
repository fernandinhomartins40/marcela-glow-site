/**
 * Como o site aparece no Google e ao ser compartilhado.
 *
 * É a única prévia que o painel desenha por conta própria: título e resumo do
 * resultado de busca não são uma seção da página. As seções da landing são
 * mostradas pelo próprio site, embutido em `PreviaAoVivo`.
 */
export function SearchPreview({
  title,
  description,
  og,
}: {
  title: string
  description: string
  og?: { url: string; alt: string }
}) {
  return (
    <div className="preview-stack" style={{ display: 'grid', gap: 10 }}>
      <div className="serp-preview">
        <p className="serp-url">dramarceladuch.com.br</p>
        <p className="serp-title">{title || 'Título da página'}</p>
        <p className="serp-desc">{description || 'A descrição aparece aqui.'}</p>
      </div>
      {/* O mesmo texto acompanha o link quando ele é colado no WhatsApp ou no
          Instagram — lá a imagem é o que aparece primeiro. */}
      {og && <img className="serp-og" src={og.url} alt={og.alt} />}
    </div>
  )
}
