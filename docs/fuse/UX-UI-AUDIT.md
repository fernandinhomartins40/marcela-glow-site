# Auditoria UX/UI

Base: `UX-UI-INVENTORY.md` (varredura de 2026-09-21) mais verificacao direta e
medicao de contraste. Escopo: `apps/web`, `apps/admin`, `apps/patient`.

Gravidade: `BLOCKER` impede uso ou fere norma · `HIGH` dano real de uso ·
`MEDIUM` inconsistencia mensuravel · `REFINEMENT` melhoria.

Base normativa: WCAG 2.2 AA.

## Resumo

Os tres apps estao em **tres estagios de maturidade diferentes**, e a diferenca
nao e de gosto — e de infraestrutura de UI. O `web` tem shadcn/ui com 28 pacotes
Radix; o `patient` tem uma biblioteca propria minima mas coerente; o `admin`
— **o app que a clinica usa o dia inteiro** — nao tem biblioteca alguma: 990
linhas de UI manual sobre 2958 linhas de CSS.

O achado mais concreto e que o `admin` **carrega Tailwind e nao o usa**:
`tailwind.config.ts` e byte-identico ao dos outros dois (md5
`70403b20fd8931b5b045f9dd5eebbc36`), `postcss.config.js` idem, mas
`styles.css` nao tem uma diretiva `@tailwind` sequer e os `.tsx` do app tem
**zero** classes responsivas. O app paga o custo de configuracao e nao recebe
o beneficio.

Dois achados atravessam os tres apps: **nenhum tem `ErrorBoundary`** (uma
excecao de render derruba a arvore inteira) e **nenhum dos 8 formularios usa
biblioteca de formulario**, embora `react-hook-form` + `zod` +
`@hookform/resolvers` estejam instalados no `web` e `components/ui/form.tsx`
esteja pronto e nao consumido.

| ID | grav. | app | problema |
|---|---|---|---|
| `UX-01` | `BLOCKER` | todos | Sem `ErrorBoundary`: erro de render derruba a tela |
| `UX-02` | `BLOCKER` | admin | `--bronze` como texto falha contraste (3,17:1) |
| `UX-03` | `HIGH` | admin | Alvo de toque de 30px (minimo 24px, recomendado 44px) |
| `UX-04` | `HIGH` | admin | `min-width: 676px` forca scroll horizontal no celular |
| `UX-05` | `HIGH` | todos | Campos sem `<label htmlFor>`: 1/3/7 em dezenas de campos |
| `UX-06` | `HIGH` | admin | Modais sem `<form>`: Enter nao envia |
| `UX-07` | `HIGH` | admin | 11 de 12 sub-abas perdem estado ao recarregar |
| `UX-08` | `MEDIUM` | admin | Tailwind configurado e nao usado |
| `UX-09` | `MEDIUM` | admin | `--border` a 1,41:1: limite de campo quase invisivel |
| `UX-10` | `MEDIUM` | admin | Anel de foco a 1,18:1 (salvo pela borda, a 3,48:1) |
| `UX-11` | `MEDIUM` | web | Sem empty state em nenhuma secao |
| `UX-12` | `MEDIUM` | web/admin | Sem feedback de sucesso consistente |
| `UX-13` | `MEDIUM` | todos | RHF + zod instalados e nao usados |
| `UX-14` | `MEDIUM` | admin | 31 media queries com 10 breakpoints fora de sistema |
| `UX-15` | `MEDIUM` | admin/patient | Tokens divergem do `web` em dois vocabularios |
| `UX-16` | `MEDIUM` | admin | Sem `safe-area-inset`: conteudo sob o notch |
| `UX-17` | `REFIN.` | web | `NotFound` em ingles num produto pt-BR |
| `UX-18` | `REFIN.` | todos | Duplicacao literal de config e assets |
| `UX-19` | `REFIN.` | web | `Skeleton` existe e nao e usado |

---

## `UX-01` · `BLOCKER` · Nenhum app tem `ErrorBoundary`

**Revalidação em 22/09/2026.** Este achado descreve o estado do inventário original, não o código atual. Web, admin e patient possuem `ErrorBoundary` na raiz. O CRM também envolve `AdminPanel` por seção, com recuperação local e remount ao trocar de aba, mantendo menu e cabeçalho quando uma tela falha. Build e teste estrutural passaram; o erro forçado em navegador continua pendente, portanto o critério de aceite abaixo ainda não está totalmente validado.

**Evidencia.** Zero ocorrencias de `ErrorBoundary` ou `componentDidCatch` nos
tres apps (inventario, secao 5).

**Impacto.** Em React 18, uma excecao nao capturada durante o render
**desmonta a arvore inteira** — a paciente ou a recepcao ve tela branca, sem
mensagem e sem caminho de volta. Num painel clinico usado durante o
atendimento, isso interrompe o trabalho com a paciente na sala.

Agrava: o `admin` e o `patient` nao tem sistema de toast (0 ocorrencias de
`toast`), entao nao ha nem canal para avisar do erro.

**Solucao.** `ErrorBoundary` na raiz de cada app com mensagem em pt-BR e acao de
recarregar; no `admin`, um por area para que a falha de uma secao nao derrube a
navegacao.

**Criterio de aceite.** Erro forcado num componente filho mostra a mensagem de
recuperacao, mantem a navegacao utilizavel e registra o erro.

---

## `UX-02` · `BLOCKER` · `--bronze` como cor de texto falha contraste

**Evidencia.** Medido (formula WCAG 2.x de luminancia relativa):

| combinacao | razao | minimo | veredito |
|---|---|---|---|
| `--bronze` `#9c8268` sobre `--cream` `#f6efe4` | **3,17:1** | 4,5:1 | FALHA |
| `--bronze` sobre `--cream-soft` `#fffaf2` | **3,48:1** | 4,5:1 | FALHA |

Usado como `color:` em **78 lugares** de `apps/admin/src/styles.css`.

O pior caso e `styles.css:31` — `.eyebrow` combina o bronze com **11px** e
`font-weight: 700`: texto pequeno, onde o limite de 4,5:1 se aplica
integralmente. Tambem em `:251` (titulo de secao, 12px) e `:2000`.

**Impacto.** Rotulos de seccao ilegiveis para baixa visao e em tela com brilho
alto. O painel e usado durante o expediente, nem sempre em ambiente ideal.

**Nota de contraste.** O que **passa** no admin: texto `--espresso` sobre
`--cream` da 13,46:1, e `--text-muted` da 4,75:1. O problema e especifico do
bronze — que e cor de marca. A solucao nao e abandonar a marca, e escurecer o
tom **para uso em texto**, mantendo o bronze atual em bordas, icones
decorativos e fundos.

**Solucao.** Criar `--bronze-text` escurecido ate atingir 4,5:1 sobre `--cream`
e trocar as ocorrencias de `color:`. As 78 ocorrencias precisam ser separadas
entre texto (trocar) e decoracao (manter).

**Criterio de aceite.** Toda combinacao texto/fundo >= 4,5:1 (>= 3:1 para texto
grande), verificada com medicao, nao a olho.

---

## `UX-03` · `HIGH` · Alvo de toque de 30px

**Evidencia.** `apps/admin/src/styles.css`, tres niveis:

- `:39` — `button { min-height: 42px }` (base, adequado)
- `:114` — `main button { min-height: 36px }` (dentro do painel)
- `:131` — `.row-actions button { min-height: 30px }` (acoes de linha)

**Impacto.** WCAG 2.2 AA (2.5.8) exige **24x24px** como minimo absoluto; 44px e
a recomendacao para uso confortavel. Os 30px passam no minimo mas ficam bem
abaixo do confortavel — e sao justamente as **acoes por item de lista**, onde
um toque errado numa linha vizinha significa agir sobre a paciente errada.

Comparacao interna: o `patient` usa **44px** (`AppShell.tsx:77`). O app da
paciente trata o toque melhor que o app de quem trabalha o dia inteiro.

**Solucao.** Elevar `.row-actions button` para 44px, ou manter o alvo visual
menor e ampliar a area clicavel por padding/pseudo-elemento.

**Criterio de aceite.** Todo alvo interativo com area efetiva >= 44x44px, ou
>= 24x24px com espacamento que impeca ativacao acidental.

---

## `UX-04` · `HIGH` · `min-width: 676px` quebra o layout no celular

**Evidencia.** `apps/admin/src/styles.css:1121` — o maior `min-width` do
arquivo. Abaixo de 676px de viewport, forca scroll horizontal.

Ha **52 declaracoes de largura/altura fixa >= 100px**. Alem do 676px:
`:22` (`min-height: 610px` na coluna do login), `:1608` (`min-width: 220px` +
`height: 300px`), `:1303` (`height: 260px`), `:881` (`132px`).

**Impacto.** Telas de celular comuns tem 360-430px de largura. O painel exige
scroll horizontal — o pior padrao de leitura em tela pequena.

**Contexto que o registro do `CLAUDE.md` reforca.** Em 2026-09-07 uma medicao no
navegador achou a `.app-nav` com 2640px de altura numa janela de 720px, e o
proprio registro conclui: *"layout se verifica medindo no navegador"*. Os 52
valores fixos sao candidatos ao mesmo tipo de defeito, e **so medicao no
navegador confirma** — esta auditoria e estatica.

**Solucao.** Substituir por `min-width: min(676px, 100%)` ou `clamp()`, seguindo
o padrao fluido que o proprio arquivo ja usa em `:50` e `:98`.

**Criterio de aceite.** Sem scroll horizontal em 360, 390 e 430px de largura,
verificado no navegador.

---

## `UX-05` · `HIGH` · Campos sem `<label htmlFor>`

**Evidencia.** `label htmlFor` — web: **1**, admin: **3**, patient: **7**.
Contra dezenas de campos (115 `disabled` so no admin).

Padroes por app:
- `web`: depende de `placeholder` como rotulo — **NAO ENCONTRADO** label associada
- `admin`: label **envolvente** sem `htmlFor` (`pages/Login.tsx:92-93`)
- `patient`: `htmlFor` correto no login (`Login.tsx:131,146,163,179`)

**Impacto.** A label envolvente do `admin` funciona para leitor de tela, entao
nao e falha total — mas `placeholder` como unico rotulo (`web`) **e** falha:
some ao digitar, falha contraste por padrao e nao e anunciado de forma
confiavel. Afeta preenchimento do agendamento na landing, que e a porta de
entrada da paciente.

**Solucao.** `<label htmlFor>` + `id` em todo campo. Onde o rotulo visual nao
couber, `aria-label` — nunca `placeholder` sozinho.

**Criterio de aceite.** Todo campo com nome acessivel, verificado por leitor de
tela ou arvore de acessibilidade.

---

## `UX-06` · `HIGH` · Modais do admin nao usam `<form>`: Enter nao envia

**Evidencia.** So 3 `<form>` com `onSubmit` em todo o `admin`
(`Login.tsx`, `Avisos.tsx`, `Caixa.tsx`). Os demais formularios sao
`Modal` + `Field` + `SubmitButton` com `onClick` direto
(`lib/ui.tsx:52,138,169`).

**Impacto.** Enter nao envia. Numa tela de cadastro usada muitas vezes ao dia,
obriga a tirar a mao do teclado a cada registro. Tambem perde validacao nativa
do navegador e semantica de formulario para tecnologia assistiva.

**Solucao.** Envolver o corpo do `Modal` em `<form onSubmit>` e converter
`SubmitButton` para `type="submit"`.

**Criterio de aceite.** Enter envia em todo formulario modal; Escape fecha
(ja funciona, `lib/ui.tsx:154-159`).

---

## `UX-07` · `HIGH` · Sub-abas perdem estado ao recarregar

**Revalidação em 22/09/2026.** As quatro páginas com sub-abas (`registry`, `cms`, `security`, `settings`) agora derivam a seleção de `?aba=...`, preservam outros parâmetros e criam entrada no histórico para o botão Voltar. Abas têm painel associado e navegação por setas/Home/End. Build e teste estrutural passaram; reload, histórico e teclado ainda precisam de execução no navegador. A contagem antiga “11 de 12” abaixo não corresponde às quatro páginas atuais e permanece apenas como registro histórico.

**Evidencia.** 12 secoes com 12 sub-abas no `admin`; so `/settings` guarda a
sub-aba na URL (`AdminPanel.tsx:126-131`). **11 de 12** voltam ao padrao no
reload (inventario, 4.4).

**Impacto.** Recarregar, compartilhar link ou voltar pelo navegador descarta o
contexto. Sem deep link, nao da para mandar "olha essa aba" para a colega.

**Solucao.** Levar o estado de sub-aba para a URL, como `/settings` ja faz.

**Criterio de aceite.** Toda sub-aba tem URL propria; reload e botao voltar
preservam o contexto.

---

## `UX-08` · `MEDIUM` · Tailwind configurado e nao usado no admin

**Evidencia verificada.** `apps/admin/src/styles.css`: **0** ocorrencias de
`@tailwind`/`@apply`. Classes responsivas em `apps/admin/src/**/*.tsx`: **0**.
E `tailwind.config.ts` e byte-identico ao dos outros dois apps (md5
`70403b20fd8931b5b045f9dd5eebbc36`), assim como `postcss.config.js`.

Pior: `apps/admin/components.json` aponta `"css": "src/index.css"` e alias
`@/components/ui` — **nenhum dos dois existe** no admin. E copia literal do web.

**Impacto.** Custo de manutencao sem beneficio, e armadilha: quem abrir o admin
vendo `tailwind.config.ts` vai supor que classes utilitarias funcionam. Elas
nao geram estilo nenhum.

**Solucao.** Decidir explicitamente: remover a configuracao morta, **ou**
adotar Tailwind no admin. Nao deixar no meio. Remover e a mudanca minima;
adotar resolve junto `UX-14`.

---

## `UX-09` · `MEDIUM` · `--border` quase invisivel

**Evidencia.** `--border: #d8cab8` sobre `--cream` `#f6efe4`: **1,41:1**.
WCAG 2.2 (1.4.11) exige **3:1** para limites de componente de interface.

**Impacto.** Limite de campo e separador de card mal perceptiveis. Em
formulario longo, dificulta enxergar onde um campo termina.

**Solucao.** Escurecer `--border` ate >= 3:1 para bordas funcionais; manter o
tom atual apenas em divisoria decorativa.

---

## `UX-10` · `MEDIUM` · Anel de foco com contraste insuficiente

**Evidencia.** `styles.css:36` remove o outline dos campos (`outline: 0`, em 5
seletores: `:36,742,744,760,1592`). `:37` compensa com
`box-shadow: 0 0 0 3px rgba(156,130,104,.16)` + `border-color: var(--bronze)`.

Medido:

| elemento | razao | minimo | veredito |
|---|---|---|---|
| anel `box-shadow` (16% sobre `#fffaf2`) | **1,18:1** | 3:1 | FALHA |
| borda bronze no foco | **3,48:1** | 3:1 | passa |

**Impacto.** O anel em si e praticamente invisivel; **quem salva o estado de
foco e a borda**, que muda de cor junto. Ou seja, o foco e perceptivel, mas por
um elemento sutil, nao pelo anel de 3px que aparenta ser o indicador.

Por isso este achado e `MEDIUM`, nao `BLOCKER` — a verificacao rebaixou a
gravidade que a contagem bruta sugeria. Mas ha **apenas 1** regra
`:focus-visible` em todo o admin (`styles.css:2826`), contra 55 no web e 7 no
patient, e nenhuma regra global.

**Solucao.** Aumentar a opacidade do anel ate >= 3:1 e adicionar regra global
`:focus-visible` para os elementos interativos que nao sao campo (botoes,
links, abas) — hoje dependem do estilo padrao do navegador ou de nada.

---

## `UX-11` · `MEDIUM` · `web` sem empty state

**Evidencia.** Empty state em `apps/web/src/components/*.tsx`: **NAO
ENCONTRADO**. O `admin` tem `EmptyState` (`lib/ui.tsx:230`) e o `patient` usa em
todas as 5 listas.

**Impacto.** Sem horario disponivel no agendamento, a paciente ve area vazia
sem explicacao nem proxima acao.

---

## `UX-12` · `MEDIUM` · Feedback de sucesso inconsistente

**Evidencia.** `web`: toast (`sonner`). `admin`: **um unico** caso
(`Certificate.tsx:274`) — as demais mutacoes so trocam o texto do botao.
`patient`: `Feedback tone="success"`. Toast global: so no `web`.

**Impacto.** No `admin`, a pessoa registra pagamento ou salva prontuario e nao
recebe confirmacao clara — so o botao voltando ao normal. Gera retrabalho:
salvar de novo por duvida.

**Solucao.** Padrao unico de confirmacao por app. No `admin`, aproveitar o
`Feedback` que o `patient` ja tem.

---

## `UX-13` · `MEDIUM` · RHF e zod instalados e nao usados

**Evidencia.** `apps/web/package.json` tem `react-hook-form ^7.61.1`,
`zod ^3.25.76` e `@hookform/resolvers`. `useForm` nos tres apps: **0**.
`apps/web/src/components/ui/form.tsx` (a ponte shadcn↔RHF) existe e **nao e
consumido**.

**Impacto.** Peso no bundle do `web` sem contrapartida, e validacao manual
espalhada — no `admin`, `isValidCPF` e mascaras em `lib/ui.tsx:321-346`.
Validacao manual diverge com o tempo.

**Solucao.** Usar nos formularios do `web` (onde ja esta pago), ou remover a
dependencia. Decisao explicita, nao inercia.

---

## `UX-14` · `MEDIUM` · Breakpoints fora de sistema

**Evidencia.** 31 media queries no `admin` com 10 valores distintos de
`max-width`: 640, **720 (9x)**, 760 (2x), 860, 900 (5x), 1024, 1080, 1150, 1180.
O mais usado, 720px, **nao existe** no `tailwind.config.ts` que o app carrega
(que define `xs480/sm640/md768/lg1024/xl1280/2xl1440`).

**Impacto.** Comportamento imprevisivel entre telas e manutencao cara: mudar um
limite exige achar qual dos 10 valores rege aquele trecho.

**Solucao.** Consolidar nos breakpoints do `tailwind.config.ts`.

---

## `UX-15` · `MEDIUM` · Dois vocabularios de token

**Evidencia.** `web` e `patient` usam HSL com nomes shadcn (`--primary`,
`--foreground`, `--radius`). O `admin` usa **HEX/RGBA** e nao tem nenhum desses
nomes. Unica ponte: `styles.css:618` usa `hsl(var(--primary))` na previa da
landing.

E o `patient` ja **divergiu** do `web` em 7 valores, apesar do comentario em
`styles.css:5-8` afirmar que sao "os mesmos" — divergencia silenciosa ja
acontecendo.

**Impacto.** Mudanca de marca precisa ser feita tres vezes, em dois formatos.

**Solucao.** Vocabulario unico. Como os apps sao silos por construcao, a opcao
de menor atrito e um arquivo de tokens gerado, copiado no build — nao um
`packages/ui`, que criaria o acoplamento que o `CLAUDE.md` evita.

---

## `UX-16` · `MEDIUM` · `admin` sem `safe-area-inset`

**Evidencia.** `env(safe-area-inset-*)`: presente no `patient`
(`AppShell.tsx:122,151,159`), **NAO ENCONTRADO** no `admin`. Ambos sao PWA
instalavel (`AdminApp.tsx:284-286`).

**Impacto.** Instalado em iPhone com notch, o conteudo do admin fica sob a
barra de status ou o indicador inferior.

---

## `UX-17` · `REFINEMENT` · `NotFound` em ingles

**Evidencia.** `apps/web/src/pages/NotFound.tsx` em ingles, num produto pt-BR
para pacientes brasileiras.

---

## `UX-18` · `REFINEMENT` · Duplicacao literal entre apps

**Evidencia por hash.** Byte-identicos nos tres: `tailwind.config.ts`,
`logo-md.png`, `marble-texture.jpg`, `components.json`, `postcss.config.js`.
Entre `admin` e `patient`: `lib/manifesto.ts` byte-identico;
`Splash.tsx` quase identico — e recebe prop `app: 'admin' | 'patient'`
(`:95`), ou seja, **foi escrito para servir aos dois e depois copiado**.

**Nota sobre o `CLAUDE.md`.** O arquivo afirma que os apps "nao compartilham
codigo". Confirmado quanto a imports — nenhum app importa de outro. **Refutado
quanto a conteudo**: ha duplicacao literal. A afirmacao vale como decisao de
arquitetura, nao como descricao do estado atual, e convem ajustar a redacao.

**Risco.** Divergencia silenciosa — ja materializada nos 7 valores de token do
`patient` (`UX-15`).

---

## `UX-19` · `REFINEMENT` · `Skeleton` existe e nao e usado no web

**Evidencia.** `apps/web/src/components/ui/skeleton.tsx` existe, nao e
consumido. O `web` usa texto no botao (`Appointment.tsx:305`); o `admin` nao
tem skeleton algum (loading e sempre `<p className="hint">Carregando...</p>`,
em 24 telas); o `patient` usa skeleton de verdade (`sections.tsx:354`).

---

## Limitacoes desta auditoria

- **Estatica.** Nada foi medido no navegador. Os 52 valores fixos (`UX-04`) e
  qualquer defeito de layout real precisam de verificacao em viewport, como o
  proprio registro de 2026-09-07 do `CLAUDE.md` demonstra.
- **Contraste medido a partir dos tokens**, nao de pixel renderizado:
  sobreposicao, opacidade herdada e imagem de fundo podem alterar o resultado.
- **Sem teste com leitor de tela.** As contagens de `aria-*` medem volume, nao
  correcao — e volume alto pode mascarar uso incorreto.
- **Sem avaliacao com usuarias reais.** Nada aqui substitui ver a recepcao e a
  medica usando o painel.
- **Assets raster:** nenhuma necessidade identificada ate aqui, portanto
  `CODEX-ASSET-JOBS.md` nao foi criado. Todos os achados sao resolviveis em
  CSS/HTML/TSX.
