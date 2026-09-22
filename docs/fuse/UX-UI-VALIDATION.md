# Validacao de UX/UI

Complementa `UX-UI-AUDIT.md`. Toda cor aqui foi **medida** (WCAG 2.x, formula
de luminancia relativa), nao estimada a olho.

---

## F4 — Acessibilidade e bloqueios de uso · `PARTIALLY_VALIDATED`

Data: 2026-09-22. Ambiente: build local dos tres apps + producao.
Achados: `UX-01` `BLOCKER`, `UX-02` `BLOCKER`, `UX-03` `HIGH`,
`UX-05` `HIGH`, `UX-06` `HIGH`, `UX-09` e `UX-10` `MEDIUM`.

### `UX-01` — tela branca · `DONE`

Nenhum dos tres apps tinha `ErrorBoundary`: um erro de render desmontava a
arvore e deixava a pessoa sem mensagem, sem botao e sem saida.

Cada app ganhou o seu, no idioma que ja usa — o painel com CSS proprio, site e
portal com Tailwind. Sao silos independentes por construcao (nenhum importa do
outro), entao tres arquivos e o desenho correto aqui, nao duplicacao a evitar.

A mensagem muda com quem esta do outro lado:

| app | o que a tela diz | por que |
|---|---|---|
| `admin` | nada salvo foi perdido | a clinica esta no meio de um atendimento |
| `web` | oferece o WhatsApp da clinica | quem chega pode nao ter outro contato |
| `patient` | os dados estao seguros | app instalado que para parece quebrado de vez |

**Verificado:** contrato da classe (sem erro passa o filho adiante; com erro
mostra `role="alert"` e **esconde o filho quebrado**, que e o que substitui a
tela branca; `getDerivedStateFromError` guarda o erro). Build dos tres apps, e
a mensagem confirmada dentro do bundle publicado do painel.

**Nao verificado:** a captura pelo React em navegador real. Nao ha navegador
neste ambiente, e instalar Playwright ou jsdom so para isto seria mudanca
grande no monorepo. Por isso a fase fica `PARTIALLY_VALIDATED`.

### `UX-02` — bronze ilegivel · `DONE`

`--bronze` #9c8268 como texto, medido sobre os quatro fundos do painel:

| fundo | contraste | minimo 4,5:1 |
|---|---|---|
| `--cream` #f6efe4 | 3,17:1 | **falha** |
| `--cream-soft` #fffaf2 | 3,48:1 | **falha** |
| `--marble` #f2eadc | 3,03:1 | **falha** |
| `--marble-soft` #fbf6ee | 3,36:1 | **falha** |

Em vez de trocar as 78 ocorrencias, separei por funcao: **42 em `color`**,
36 em `border-color`, 5 em `background`. As 41 de borda e fundo sao decoracao e
ficaram.

Os 42 foram inspecionados um a um e se dividiram em tres grupos:

| grupo | quantos | tratamento |
|---|---|---|
| texto que se le (`.eyebrow` de 11px, titulos de secao, `.painel-link`, `.cert-link`) | 11 | `--bronze-text` #75604c |
| numero ou inicial em pilula, sobre `--cream-deep` | 4 | `--bronze-text-deep` #6b5641 |
| icone decorativo ao lado de texto legivel | 27 | mantido |

**O segundo grupo e a razao de nao ter feito substituicao cega:** sobre
`--cream-deep` #e5d8c7 o proprio #75604c da **4,24:1** — o fundo mais escuro
come a margem. Trocar tudo por um token so teria deixado esses quatro
falhando, com a aparencia de estarem corrigidos.

| token | pior caso medido | alvo |
|---|---|---|
| `--bronze-text` #75604c | 4,97:1 (sobre `--marble`) | 4,5:1 |
| `--bronze-text-deep` #6b5641 | 4,94:1 (sobre `--cream-deep`) | 4,5:1 |

### `UX-03` — alvo de toque · `DONE`

`.row-actions button` tinha `min-height: 30px`. A WCAG 2.5.8 pede 24px, e 44px
e o que o dedo acerta — e a recepcao usa no celular.

Passou a 44px **pelo padding**, nao pela fonte: a densidade da lista se mantem.
Confirmado no CSS publicado: `row-actions button{min-height:44px;padding:10px 14px}`.

### `UX-09` — borda invisivel · `DONE`

Medido: `--border` #d8cab8 da **1,41:1** sobre o creme, muito abaixo dos 3:1
que a WCAG 1.4.11 pede para componente. (A auditoria registrou 3,48:1; aquele
numero era do anel de foco somado a borda, nao da borda.)

Criado `--border-strong` #8f7c68, 3,35:1 no pior caso. `--border` continua
servindo para separar blocos, que e uso legitimo.

**A primeira tentativa falhou na propria medicao:** #9d8a74 dava 2,91:1 sobre
o creme, abaixo do minimo que eu tinha acabado de escrever no comentario ao
lado. Trocado.

### `UX-10` — foco invisivel · `DONE`

Indicador de foco existia so em `input` e `select`. Quem navega por teclado
passava por botao, link e aba sem pista nenhuma de onde estava.

Regra global `:focus-visible` — e nao `:focus`, para o anel nao reaparecer a
cada clique de mouse, que foi a razao de tanta gente desligar o padrao do
navegador. `--focus-ring` #5c4a3a da **7,04:1** no pior fundo claro, com
variante `--cream-soft` onde o fundo e escuro (barra lateral, tela de login,
botoes solidos).

### `UX-06` — Enter nao enviava · `DONE`

O `Modal` ja tratava `Esc`, foco no primeiro campo e trava da rolagem de fundo,
mas nao era `<form>`: em todo cadastro era preciso alcancar o botao com o
mouse. Agora aceita `onSubmit` e, nesse caso, envolve corpo e rodape num
`<form>`.

**Opcional de proposito.** Os 23 rodapes existentes tem botao com `onClick`
proprio; envolver todos de uma vez mudaria tela que ninguem revisou. Os tres
modais do `Catalog` (procedimento, lead, conteudo) foram migrados.

**Dois defeitos que a mudanca podia introduzir, e nao introduziu:**

1. **Botao sem `type` dentro de form e `submit`** (regra do HTML). Um
   "Cancelar" sem `type="button"` cadastraria; um `SubmitButton` que mantenha
   o `onClick` dispara a mutacao **duas vezes** — paciente em duplicidade, ou
   dois lancamentos no caixa. Nada disso quebra typecheck nem aparece para
   quem testa com o mouse. Por isso `SubmitButton` ganhou `type` explicito com
   padrao `button`, nao `submit`.
2. **Layout do rodape.** O `<form>` e um item flex novo dentro de
   `.drawer.page-view`, e o `margin-top: auto` do rodape passaria a medir
   contra o form em vez da tela — o rodape subiria para debaixo do ultimo
   campo. `.page-view-form` repete a coluna flex.

### `UX-05` — rotulos · `DONE`, **com correcao da auditoria**

A auditoria classificou como `HIGH` contando `htmlFor`: 3 contra 223 inputs.
**A metrica estava errada** — o projeto associa rotulo por aninhamento, que a
WCAG aceita igualmente.

Medido por via valida:

| via | campos |
|---|---|
| `<Field>` (renderiza `<label>` em volta do filho) | 176 |
| `<label>` direto | 22 |
| `aria-label` | varios, alguns com comentario explicando que placeholder nao e rotulo |
| `htmlFor` | 3 |
| **sem rotulo de fato** | **3** |

Os tres: motivo do cancelamento (`Schedule.tsx`), select de nivel de acesso e
link do convite (`Team.tsx`). Corrigidos com `aria-label`.

**Registro honesto do processo:** meu proprio detector acusou primeiro 194
campos, depois 20 — os dois numeros errados, por nao atravessar o componente
`Field` e por nao casar `aria-label` escrito em template string multi-linha.
So a leitura caso a caso deu os tres reais. Contagem de atributo nao mede
acessibilidade.

### Travado com teste

| arquivo | casos | protege |
|---|---|---|
| `apps/admin/src/formularios.test.ts` | 6 | `onSubmit` do Modal, padrao `button` do SubmitButton, `type` em todo botao de rodape com form, `<label>` do Field, `aria-label` do SearchBox |

**Verificados falhando**, nao so passando:

| defeito injetado | resultado |
|---|---|
| `SubmitButton` com `onClick` dentro de form | falha, dizendo "envia duas vezes" |
| `Cancelar` sem `type` | falha, apontando arquivo e linha |
| padrao do `SubmitButton` voltando a `submit` | falha |

Foi este teste que me obrigou a migrar **os tres** modais do arquivo em vez de
um: Enter funcionando em um e nao nos outros seria inconsistencia pior que a
ausencia.

### Regressao

- typecheck dos tres apps: limpo.
- build dos tres apps: passa — e o build e o que vale, pelo registro de
  08/09/2026 no `CLAUDE.md`.
- **147 testes em 14 arquivos**: todos passam.
- `npm run check:encoding`: passa.
- Producao apos o deploy `e9a0b66`: os quatro tokens novos presentes no CSS
  publicado, `focus-visible` presente, `row-actions button` com 44px, a
  mensagem do ErrorBoundary no bundle, e `/`, `/admin/`, `/paciente/` e
  `/api/health` em 200.

### O que falta na F4

- **Navegacao por teclado de ponta a ponta**, medida em navegador: o anel
  existe e tem contraste, mas a ordem de foco e as armadilhas de foco dentro do
  modal nao foram percorridas.
- **Captura real do ErrorBoundary** pelo React em runtime.
- **Os outros 20 rodapes de Modal** seguem sem `onSubmit` — funcionam como
  antes, sem Enter.
- `UX-05` nos apps `web` e `patient`: o `patient` tem 7 `htmlFor` para 7
  inputs e o `web` tem 2 inputs com 20 `aria-label`, mas nenhum foi auditado
  caso a caso como o admin.

---

## F5 e F7 — Consistencia e divida estrutural · `PARTIALLY_VALIDATED`

Data: 2026-09-22. Achados tratados: `UX-08`, `UX-17`, `UX-18` — e tres que a
medicao mostrou nao valerem a mudanca proposta.

### `UX-08` — Tailwind morto no painel · `DONE`

O `admin` tinha `tailwind.config.ts` com 118 linhas (cores, breakpoints,
animacoes, plugin `tailwindcss-animate`) e **nenhuma diretiva `@tailwind`** no
CSS. Confirmado no CSS compilado: `.flex`, `.gap-2`, `.text-sm` e `.p-4` nao
existem — nenhuma classe utilitaria era gerada.

Das 36 ocorrencias que o grep apontava como "classe utilitaria" no JSX, **35
sao classes proprias do projeto** (`form-grid`, `week-grid`, `duration-grid`,
`hours-grid`). A unica Tailwind de verdade era `inline-flex items-center gap-1`
no telefone da recepcao, e **nao estilizava nada**: o icone ficava desalinhado
do numero. Virou `.meta-com-icone`.

Removidos: `tailwind.config.ts`, `tailwindcss`, `tailwindcss-animate` e
`components.json` — este era config do shadcn/ui, que o painel nao usa (0
imports, nenhum `components/ui/`), apontando para **dois arquivos
inexistentes**: o config que apaguei e um `src/index.css` que nunca existiu.

**O que ficou, e por que:** o `postcss.config.js`, sem o plugin do Tailwind.
Ele tambem carrega o `autoprefixer`, que tem efeito real. Conferido depois: os
prefixos `-webkit-` seguem no CSS publicado.

**Efeito colateral medido:** o build do painel caiu de **78s para 6,4s**. O
Tailwind varria todo o `src/` para gerar CSS que ninguem usava.

### `UX-17` — 404 em ingles · `DONE`

Estava `"Oops! Page not found"` / `"Return to Home"`, com `bg-gray-100` e
`text-blue-500` — cinza e azul num site todo creme e bronze. Quem chega ali e
uma possivel paciente que errou o link.

Agora em pt-BR, com a paleta da clinica, alvo de toque de 44px e dois caminhos:
inicio e `/#contato` — ancora conferida em `Footer.tsx:80`, para o botao nao
levar a lugar nenhum.

Verificado no bundle publicado: os tres textos novos presentes, e
`"Page not found"`, `"Return to Home"` e `bg-gray-100` ausentes.

### `UX-18` — duplicacao entre apps · `DONE`, com correcao da auditoria

A auditoria afirmava duplicacao literal entre apps. Medido por hash de
conteudo em todos os `.ts`, `.tsx` e `.css` dos tres apps:

| arquivos byte-identicos entre apps | 2 |
|---|---|
| `vite-env.d.ts` (39 bytes, nos tres) | boilerplate do Vite, nao duplicacao |
| `lib/manifesto.ts` (2,7 KB, em `admin` e `patient`) | **duplicacao real, unica** |

Um arquivo nao justifica `packages/ui`, que criaria justamente o acoplamento
que o `CLAUDE.md` evita de proposito. O que foi feito: **corrigir a redacao do
`CLAUDE.md`**, que dizia "nao compartilham codigo" — certo quanto a
importacao, incompleto quanto a conteudo. Agora diz silo *por importacao*,
nomeia o arquivo repetido e avisa para mexer nos dois.

Junto, o `CLAUDE.md` ganhou duas convencoes que faltavam e que custaram tempo
nesta sessao: que cada app estiliza de um jeito (e que o painel **nao** tem
Tailwind), e que contraste no painel se mede, com os tokens de texto separados
dos de decoracao.

### Tres achados que a medicao mostrou nao valerem a mudanca

Registrados porque "nao fiz" precisa de razao tanto quanto "fiz".

**`UX-13` e parte do `UX-18` — remover `react-hook-form` e `zod` do `web`.**
Eles tem **zero imports** no codigo do site, o que a auditoria apontou
corretamente. Mas medi o efeito antes de remover:

| verificacao | resultado |
|---|---|
| bundle do `web` | 457 KB |
| `react-hook-form` dentro do bundle | **ausente** |
| `useForm`, `zodResolver`, `ZodError` | **ausentes** |
| componentes shadcn: total vs usados fora de `ui/` | **48 vs 7** |
| os 41 nao usados, no bundle | ausentes |

**O tree-shaking ja elimina tudo.** O custo em runtime e zero — nada disso
chega ao navegador da paciente. Remover 41 arquivos e mudanca grande, com risco
de quebrar import indireto (varios se importam entre si), para ganho nulo no
que se entrega. Fica como divida de **manutencao** (o `npm ci` baixa o que nao
se usa, e arquivo morto confunde quem le), nao de desempenho.

**`UX-11` — empty state no agendamento.** O formulario **ja tem** fallback com
8 procedimentos fixos quando a API nao responde, o que e melhor que um empty
state: a paciente sempre consegue pedir avaliacao. E a rota responde 200 com o
catalogo real, conferido em producao
(`/api/procedures?tenantSlug=marcela-duch`).

**`UX-19` — usar o `Skeleton`.** Mesmo motivo: o unico carregamento visivel do
site e o do select de procedimentos, e ele nunca fica vazio por causa do
fallback.

### Regressao

- typecheck do `web` e do `admin`: limpo.
- build dos dois: passa.
- **build Docker do `admin`**: passa. Era o teste que importava — remover
  dependencia quebra no `npm ci` do container, nao no build local (registro de
  08/09/2026 no `CLAUDE.md`).
- os 5 tokens da F4 presentes no CSS **dentro da imagem** de producao.
- `package-lock.json` atualizado com `--package-lock-only`.
- 147 testes: passam.

### O que fica aberto na F5

Os itens que exigem **medicao em navegador**, indisponivel neste ambiente:

- `UX-04`: os 52 valores fixos de largura. Sao candidatos, nao defeitos
  confirmados — o registro de 07/09/2026 no `CLAUDE.md` e a prova de que
  layout se verifica medindo (`.app-nav` tinha 2640px numa janela de 720px, e
  nenhum teste de estrutura pegou).
- `UX-14`: consolidar os 10 breakpoints.
- `UX-16`: `safe-area-inset` no painel.
- `UX-07`: sub-abas na URL.
- `UX-12`: padrao unico de mensagem de sucesso.

---

## As 6 tarefas que faltavam · encerradas em 2026-09-22

O responsavel perguntou se o plano estava todo implementado. A conferencia
tarefa a tarefa mostrou **30 de 36 feitas** e 6 em aberto. Estas sao as 6, e em
quatro delas a medicao mostrou que a tarefa, como escrita, partia de um
diagnostico incompleto.

### `VPS-00` — `default_server` que responda 444 · **fora de escopo**

A tarefa nao se aplica como planejada. O vhost `digiurban`, de **outro
projeto**, ja e catch-all: declara
`server_name digiurban.com.br www.digiurban.com.br 72.60.10.108 _`, e o `_`
casa qualquer Host desconhecido.

`default_server` tem precedencia sobre `_`. Adiciona-lo **tiraria trafego do
digiurban**, inclusive o acesso por IP que ele declara explicitamente — acao
sobre configuracao de terceiro, que a regra da skill proibe e a autorizacao
concedida nao cobre.

Medido: Host desconhecido responde 301 em `:80` e `:443`, caindo no vhost do
vizinho. **O site da clinica nao e afetado** — tem vhost proprio desde a F3.

Fica aberto como decisao de quem administra a VPS, nao como pendencia tecnica
deste projeto.

### `UX-14` — consolidar os 10 breakpoints · `DONE` (documentado, nao unificado)

Sao **11**, nao 10. Medidos um a um, e cada um existe por razao de **conteudo**,
com comentario no CSS que a explica:

| breakpoint | usos | por que existe |
|---|---|---|
| 1180px | 1 | a agenda de 3 colunas nao cabe mais |
| 1150px | 1 | a tabela passa de 3 para 2 colunas |
| 1080px | 1 | 3 cartoes de estatistica viram 2 |
| 1024px | 1 | as abas do CMS encurtam |
| 900px | 5 | layout de tablet |
| 861/860px | 1+1 | fronteira da gaveta do menu — **par proposital**, `min-width: 861` e `max-width: 860` se complementam sem sobrepor |
| 760px | 2 | a coluna da pagina estreita e o form empilha |
| 720px | 10 | **o breakpoint estrutural de celular** |
| 640px | 2 | telas de 390px: numeros lado a lado cortam |

**Nao unificados de proposito.** Mudar `760px` para `720px` altera o layout numa
faixa de 40px que so o navegador mostra, e o registro de 07/09/2026 no
`CLAUDE.md` prova que layout aqui se verifica medindo. O que foi feito e o que
impede o problema crescer: **a escala esta documentada no topo do
`styles.css`**, com a instrucao de usar um dos valores existentes em vez de
inventar o 12o.

### `UX-15` — vocabulario unico de token · `DONE` (risco documentado)

Encontrado algo mais concreto que "vocabulario inconsistente": **seis nomes
existem nos dois apps com formatos incompativeis**.

| token | `admin` | `web` / `patient` |
|---|---|---|
| `--background` | hex | tripla HSL |
| `--border` | `#d8cab8` | `32 18% 82%` |
| `--bronze` | `#9c8268` | `28 22% 55%` |
| `--cream` | `#f6efe4` | `36 35% 96%` |
| `--cream-deep` | `#e5d8c7` | `34 28% 88%` |
| `--espresso` | `#2f221b` | `22 30% 14%` |

A consequencia pratica: **copiar uma regra entre apps produz cor errada em
silencio.** `color: var(--bronze)` funciona no painel e falha no site, onde o
valor so vira cor dentro de `hsl()`. Os apps sao silos por importacao, entao o
conflito **nunca aparece em tempo de build**.

Nao unificados: exigiria escolher um formato e reescrever os tres apps de uma
vez, com verificacao visual indisponivel aqui. O risco esta documentado nos
**dois** arquivos, que e onde quem for copiar CSS vai ler.

Confirmado que o bloco `.lp` do painel (previa da landing) redeclara esses
nomes em HSL **no proprio escopo**, de proposito e ja comentado — nao e
conflito.

### `UX-07` — sub-abas na URL · `DONE` (convencao documentada)

O `/settings` ja faz, e bem. Os outros 4 casos com `useState` local
(`Encounter`, ficha da paciente, formulario, `TemplateForm`) sao abas **dentro
de modal**, e ali o padrao nao se aplica: o modal abre sobre a lista sem mudar
a URL, entao guardar a aba nela faria um F5 cair numa aba de um item que nao
esta mais aberto.

A distincao foi escrita junto ao codigo do `/settings`: sub-aba de **rota** vai
na URL; sub-aba de **modal** fica no estado.

### `UX-12` — padrao unico de sucesso · `DONE` (padrao existia, agora declarado)

Medido: **65 mutacoes no painel e nenhum componente de aviso flutuante.** A
primeira leitura foi "nao ha padrao". Havia — e e coerente:

- cadastro/edicao: o modal fecha e a lista se atualiza;
- acao no lugar: o proprio botao confirma (em `Avisos.tsx` passa a dizer
  "Avisado" com um check);
- acao que muda situacao: a tela mostra a nova (o "Aguardando conferencia da
  Dra. Marcela" depois de fechar o caixa).

**Toast seria pior aqui.** A clinica usa o painel o dia inteiro; um aviso
flutuante por acao vira ruido que se aprende a ignorar — e aviso ignorado nao
avisa. O `web` usa toast porque lá a pessoa faz **uma** acao e vai embora.

Documentado em `lib/ui.tsx`, para que ninguem introduza um terceiro padrao.

### `UX-04` — 52 valores fixos · `DONE` (medido: 1 candidato, e ele e intencional)

Dos 52, filtrei os que podem estourar um celular de 360px (`width` ou
`min-width` fixo >= 340px, fora de media query). Sobraram **2**, e so 1 e
global:

`.week-head, .week-body { min-width: 676px }` — a grade da semana. E
**intencional**: a linha acima tem `.week-scroll { overflow-x: auto }`, o
comentario explica que 104px e o piso para "17:05" e o primeiro nome
conviverem na coluna, e o breakpoint de 760px zera o `min-width` no celular.
Agenda semanal com rolagem horizontal e a solucao, nao o defeito.

Os outros 50 sao altura, largura de coluna de tabela e `max-width` de texto
(limite de leitura) — usos legitimos que a contagem bruta nao distinguia.

**Isto confirma o que o proprio plano dizia:** "os 52 valores fixos sao
candidatos, nao defeitos confirmados".

### Regressao destas 6

- typecheck do `admin` e do `web`: limpo.
- build dos dois: passa.
- os 6 tokens e regras da F4/F5 seguem no CSS publicado.
- os comentarios novos **nao vao para o CSS publicado** (a minificacao os
  remove): custo zero em bytes entregues.
- 147 testes: passam.
