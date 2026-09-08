# Prompt: interface que funciona na tela real

> Para o Claude. Use ao mexer em layout, responsividade ou aplicativo
> instalavel. "leia kit-auditoria/prompts/9-interface-que-funciona-na-tela-real.md
> e aplique em <tela>".

## Tarefa

Fazer a tela funcionar no aparelho em que ela sera usada — nao na janela em que
voce a escreveu.

## A regra que decide o resultado

**Meca no navegador. Estrutura correta e layout quebrado convivem sem
conflito.**

Casos medidos, todos com o codigo aparentemente certo:

| O que parecia | O que a medicao mostrou |
|---|---|
| Menu com os grupos certos | A barra tinha 2640px numa janela de 720px |
| "Vazio a esquerda, e padding" | Duas grades desalinhadas: cabecalho com 6 colunas, corpo com 1 |
| Responsivo escrito e testado | O bloco vinha **antes** das regras que corrigia; a cascata o ignorava |

Nenhum apareceu lendo CSS. Use:

```js
el.getBoundingClientRect()   // posicao e tamanho reais
getComputedStyle(el)         // o que venceu a cascata, nao o que voce escreveu
window.innerHeight           // compare com a altura que o elemento ocupou
```

Compare o medido com o esperado e **diga o numero**. "A barra tem 2640px numa
janela de 720px" e um fato; "ficou melhor" nao e.

## Antes de escrever CSS

### 1. Use as classes que existem — nao invente

Erro caro e recorrente: escrever uma classe plausivel (`chip-ok`, `card-alt`)
que nao existe em lugar nenhum. Nada quebra, nada avisa, e o elemento aparece
sem estilo. O mesmo vale para variavel de tema inexistente.

Antes de usar qualquer classe ou variavel, **confirme que ela existe**:

```sh
grep -oE "\.chip\.[a-z-]+" <arquivo-de-estilo> | sort -u
grep -oE "\-\-[a-z-]+:" <arquivo-de-estilo> | sort -u
```

### 2. Procure a camada de componentes antes de criar

Quase todo projeto tem `lib/ui`, `components/common` ou equivalente, e quase
sempre subutilizada — a tela cresceu montando o mesmo cartao inline. Reusar
mantem o visual coerente de graca.

### 3. Saiba onde a regra vai cair na cascata

**Media query so vence se vier depois das regras que corrige.** Um bloco
responsivo escrito no meio do arquivo nao afeta regras anexadas no fim: a
cascata dá a vitoria a quem vem por ultimo com a mesma especificidade. Isso ja
fez um responsivo inteiro nunca valer.

O mesmo com especificidade: uma regra generica (`.lista span { display: flex }`)
pode vencer a especifica que voce acabou de escrever. Se o estilo "nao pegou",
`getComputedStyle` diz quem ganhou — nao adivinhe, nem empilhe `!important`.

## Responsividade

### Meca nas larguras que existem

Nao basta "encolher a janela". Verifique pelo menos:

- **~390px** — celular comum. E onde tudo quebra primeiro.
- **~768px** — tablet ou janela estreita.
- **~1366px** — notebook. Barra lateral fixa rouba largura do conteudo aqui.

### O que quebra em tela estreita, por frequencia

1. **Grade que exige largura minima.** Uma grade de N colunas num aparelho
   estreito corta colunas e trunca texto. No celular, troque a grade por **uma
   coluna com seletor**: os itens viram botoes e a area desenha so o escolhido.
2. **Duas grades que precisam alinhar** (cabecalho e corpo). Se as declaracoes
   divergem, aparece um "vazio" que parece padding e nao e. Ou as duas tem a
   mesma declaracao, ou o cabecalho deixa de ser cabecalho de coluna.
3. **Altura fixa com rolagem propria dentro de pagina que ja rola.** Corta
   conteudo no topo e no fundo. Mas soltar a altura tambem erra: uma lista
   longa empurra o resto da pagina para milhares de pixels abaixo. Limite por
   **numero de itens visiveis**, nao por `vh`.
4. **Elemento esticado por celula de grade.** Uma barra lateral como celula
   estica ate a altura do conteudo. Prenda a tela (`position: sticky`,
   `height: 100vh`, `align-self: start`) e deixe so ela rolar.
5. **Numeros e botoes lado a lado.** Em ~390px o rotulo quebra em duas linhas e
   o alvo de toque fica irregular. Empilhe em largura inteira.

### Estado inicial que so quebra no celular

Quando o desktop mostra tudo e o celular mostra **um**, um estado inicial
invalido deixa de ser invisivel e passa a mostrar tela vazia. Exemplo medido:
o item selecionado era "hoje", que num fim de semana ficava fora do intervalo
exibido — no desktop as colunas apareciam de qualquer forma; no celular, nada.

Ao passar para "um por vez", pergunte: **o padrao sempre existe no conjunto
visivel?** Se nao, caia para o primeiro item disponivel.

## Aplicativo instalavel (PWA)

### Separe "instalado" de "no navegador"

Tudo que imita aplicativo deve valer **so** quando instalado. No navegador a
barra de endereco e o botao de voltar ja dao contexto, e bloquear gestos ali e
problema de acessibilidade, nao app.

Detecte com mais de um sinal — nenhum cobre todos os aparelhos:

```js
matchMedia('(display-mode: standalone)').matches   // padrao
navigator.standalone                                // Safari/iOS
// + o parametro de start_url do manifesto, como terceiro sinal
```

Aplique numa classe no elemento raiz e prenda todo o resto a ela.

### O que denuncia que nao e um app

- **Zoom por pinca e duplo toque.** `user-scalable=no` **nao funciona**: o iOS o
  ignora desde a versao 10, de proposito. O que ele respeita e `touch-action`
  mais o cancelamento dos gestos. A classe vai no elemento **raiz**, nao num
  container interno — os gestos acontecem no documento inteiro.
- **Campo com fonte menor que 16px.** O Safari aproxima sozinho ao focar e
  **nao desfaz**: a tela fica torta pelo resto da sessao.
- **Rolagem elastica e selecao de texto.** Desligue nas areas de navegacao, mas
  **mantenha** em paragrafos, campos e codigos: copiar um telefone ou um numero
  de protocolo e uso real.
- **Navegacao longe do polegar.** Menu no topo exige a mao inteira. Barra
  inferior com os poucos itens do dia a dia, e o resto atras de "Mais".
- **Entalhe e barra de gestos.** Use `safe-area-inset` no topo e no rodape, com
  folga para o ultimo item nao ficar atras da barra.

### Para ser instalavel de verdade

- **Icone PNG de 192px ou maior.** SVG sozinho nao satisfaz o requisito do
  Chrome no Android — sem PNG, o app simplesmente nao e oferecido.
- **`id` proprio em cada manifesto.** Sem ele a identidade sai da URL; dois apps
  na mesma origem com caminhos parecidos podem ser tratados como o mesmo, e
  instalar o segundo substitui o primeiro. Use um valor **estavel** (o proprio
  `scope` serve): trocar o `id` de um app instalado o transforma em app novo e
  deixa o antigo orfao.
- **Manifesto que nao dependa do servidor de API.** Se o HTML aponta para um
  manifesto dinamico e a API cai, o app deixa de ser instalavel. Aponte para o
  arquivo estatico do build e troque pelo dinamico depois de carregar.

## Telas de edicao e configuracao

Padroes que se repetem em qualquer painel administrativo:

- **Conte os niveis ate o campo.** Aba > lista lateral > sanfona > lista e
  quatro niveis para chegar a um campo de texto. Duas costumam bastar.
- **Sanfona fechada esconde o que se procura.** Se a pessoa nao sabe em qual
  dobra esta o campo, ela abre todas — a rolagem que a sanfona evitava custa
  menos que a procura. Prefira divisorias com titulo.
- **Escolha entre muitas opcoes pede cartao, nao pilula.** Nome, icone e uma
  frase do que faz, agrupados por finalidade. Rotulo sozinho vira adivinhacao a
  partir de meia duzia de opcoes.
- **Rotule pelo que a pessoa ve**, nao pelo nome do campo no banco:
  "linha pequena acima do titulo" em vez de "sobrelinha".
- **Previa sob demanda.** Previa fixa rouba metade da largura do formulario o
  tempo todo; aberta quando pedida, ela cabe e vale a olhada.
- **Acao destrutiva pede confirmacao** e nao fica encostada nos campos.
- **Salvar fixo no rodape**, com o estado escrito por extenso, e aviso ao sair
  com alteracao pendente.

## Quando a mesma tela existe em varias aplicacoes

Se voce mantem varios sistemas parecidos — mesma ideia de painel, de editor de
conteudo, de listagem —, cada correcao feita aqui e uma correcao que os outros
ainda nao tem. Duas regras evitam que isso vire trabalho repetido:

**Corrija a causa e os irmaos dela.** Se o defeito veio de um padrao copiado
entre modulos (mesma configuracao, mesma receita de grade, mesmo componente
duplicado), o proximo a esbarrar nele repete a queda. Dentro do projeto,
procure o padrao antes de dar por encerrado.

**Registre o aprendizado, nao so o conserto.** Um defeito de layout resolvido
so no CSS morre naquele arquivo. Escrito no `CLAUDE.md` — o que quebrou, por
que passou despercebido, como verificar — ele viaja para a proxima aplicacao
como regra, e e barato de aplicar antes de o problema aparecer.

**Ao portar para outro projeto, porte a regra, nao o codigo.** Sistemas
parecidos raramente tem a mesma folha de estilo, as mesmas classes ou o mesmo
componente base. Copiar CSS de um para o outro traz classe que nao existe do
lado de la — e o elemento aparece sem estilo, sem erro nenhum. Leve o
**criterio** ("no celular esta grade vira uma coluna com seletor"; "campo com
menos de 16px faz o iOS aproximar e nao desfazer") e implemente com o que o
projeto de destino ja tem.

## Ao terminar

1. Meca de novo, nas larguras da lista, e **relate os numeros**.
2. Se ha papeis ou estados diferentes, veja **mais de um** — o seu costuma ser
   o de mais privilegio, e e o que menos revela.
3. Se e aplicativo instalavel, verifique instalado **e** no navegador: sao dois
   caminhos, e o que conserta um pode quebrar o outro.
4. Diga o que nao deu para verificar. "Implementado, nao medido em aparelho
   real" e uma frase util.
