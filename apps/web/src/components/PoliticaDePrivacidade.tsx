import { useLanding } from "@/hooks/useLanding";

/**
 * O texto da política de privacidade, como o painel o grava (seção PRIVACY).
 *
 * Usado pela página `/privacidade` e pela prévia do painel. O texto é puro —
 * parágrafo por linha em branco, item de lista por "- " — e entra como texto,
 * nunca como HTML: quem edita no painel não escreve marcação na página pública.
 */

interface Privacidade {
  controller: { name: string; document: string; address: string; email: string; phone: string };
  dpo: { name: string; email: string };
  developer: { name: string; document: string; email: string; site: string };
  sections: { title: string; body: string }[];
}

function Corpo({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocos.map((bloco, i) => {
        const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
        if (linhas.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="mb-4 list-disc space-y-1.5 pl-5">
              {linhas.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
            </ul>
          );
        }
        return <p key={i} className="mb-4">{linhas.join(" ")}</p>;
      })}
    </>
  );
}

function Linha({ rotulo, valor, href }: { rotulo: string; valor: string; href?: string }) {
  if (!valor) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 text-muted-foreground sm:w-32">{rotulo}</dt>
      <dd className="break-words">{href ? <a href={href} className="underline underline-offset-2">{valor}</a> : valor}</dd>
    </div>
  );
}

export default function PoliticaDePrivacidade() {
  const { data, isLoading } = useLanding();
  const secao = data?.sections?.PRIVACY;
  const p = secao?.content as Privacidade | undefined;

  if (!p?.sections) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {isLoading ? "Carregando a política de privacidade…" : "Não foi possível carregar a política agora. Tente de novo em instantes."}
      </p>
    );
  }

  const atualizada = secao?.updatedAt
    ? new Date(secao.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  const { controller: c, dpo, developer: d } = p;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-relaxed text-foreground sm:px-6 md:py-16">
      <h1 className="mb-2 font-serif text-3xl font-semibold md:text-4xl">Política de Privacidade</h1>
      {atualizada && <p className="mb-8 text-sm text-muted-foreground">Última atualização: {atualizada}</p>}

      <section aria-labelledby="quem-responde" className="mb-10 rounded-lg border border-border bg-card p-5 text-sm">
        <h2 id="quem-responde" className="mb-4 font-serif text-xl font-semibold">Quem responde pelos seus dados</h2>
        <dl className="space-y-4">
          <div>
            <p className="mb-1.5 font-medium">Controladora</p>
            <div className="space-y-1">
              <Linha rotulo="Nome" valor={c.name} />
              <Linha rotulo="CNPJ/CPF" valor={c.document} />
              <Linha rotulo="Endereço" valor={c.address} />
              <Linha rotulo="E-mail" valor={c.email} href={`mailto:${c.email}`} />
              <Linha rotulo="Telefone" valor={c.phone} />
            </div>
          </div>
          {(dpo.name || dpo.email) && (
            <div>
              <p className="mb-1.5 font-medium">Encarregado pelo tratamento de dados (DPO)</p>
              <div className="space-y-1">
                <Linha rotulo="Nome" valor={dpo.name} />
                <Linha rotulo="E-mail" valor={dpo.email} href={`mailto:${dpo.email}`} />
              </div>
            </div>
          )}
          {d.name && (
            <div>
              <p className="mb-1.5 font-medium">Desenvolvedor do sistema (operador)</p>
              <div className="space-y-1">
                <Linha rotulo="Nome" valor={d.name} />
                <Linha rotulo="CNPJ/CPF" valor={d.document} />
                <Linha rotulo="E-mail" valor={d.email} href={`mailto:${d.email}`} />
                <Linha rotulo="Site" valor={d.site} href={/^https?:\/\//.test(d.site) ? d.site : `https://${d.site}`} />
              </div>
            </div>
          )}
        </dl>
      </section>

      {p.sections.map((s, i) => (
        <section key={i} className="mb-8">
          <h2 className="mb-3 font-serif text-2xl font-semibold">{i + 1}. {s.title}</h2>
          <Corpo texto={s.body} />
        </section>
      ))}
    </article>
  );
}
