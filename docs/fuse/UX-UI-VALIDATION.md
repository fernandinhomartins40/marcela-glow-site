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
