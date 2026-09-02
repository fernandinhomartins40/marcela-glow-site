# Estrategia: mapa de codigo barato para agentes

Passo 1 do `kit-auditoria`. Copie a pasta do kit para a raiz do projeto e peca:
**"leia kit-auditoria/1-instalar-mapa-de-codigo.md e aplique neste projeto"**.

O script pronto esta em `kit-auditoria/graph-map.js` - copie para `scripts/`.

## O problema que isto resolve

Um agente que precisa entender o codigo antes de mexer tende a abrir arquivos.
Isso e caro e piora conforme o projeto cresce. Medicao real (monorepo TS de
24k linhas, 148 arquivos), na pergunta "o que quebra se eu mudar a classe de
erro base?":

| Abordagem | Custo |
|---|---|
| Ler os arquivos afetados | ~166 KB |
| Consultar um grafo do codigo | ~1,6 KB |

~100x menos contexto, e a resposta e melhor: o grafo enxerga subclasses e
chamadas indiretas que um grep textual nao acha.

Mas esse ganho **so se realiza se o agente souber consultar antes de ler**.
Por isso a estrategia tem duas metades, e a segunda e a que costuma faltar:

1. **Indexar** o codigo num grafo (Graphify, via AST).
2. **Destilar** o grafo num `CLAUDE.md` que o agente ja le em toda sessao.

Sem a parte 2, o agente abre arquivos de qualquer jeito e o indice fica ocioso.

## Principio central: o que vai no CLAUDE.md

O `CLAUDE.md` e lido **em toda sessao**. Cada byte ali e um custo recorrente,
entao ele guarda so o que e **caro de descobrir e barato de guardar**.

A tentacao e colocar "um indice de tudo". Nao faca. Medicao no mesmo projeto:

| Granularidade do indice | Custo por sessao |
|---|---|
| Uma linha por simbolo (1742) | ~93 KB (~23k tokens) |
| Simbolos com 5+ conexoes (273) | ~15 KB |
| **Por diretorio (33)** | **~1,4 KB** |

Um indice de 23k tokens gastaria todo dia 14x mais do que a consulta pontual
que ele deveria evitar. Indexe **por diretorio**: responde "onde isso mora?",
que e a pergunta do indice. O detalhe fino fica a uma consulta de distancia.

Regra pratica: o CLAUDE.md **aponta** para o grafo, nao o substitui.

## Passo a passo

### 1. Instalar o Graphify

Requer Python 3.10+ e `uv` (ou `pipx`).

```sh
uv tool install "graphifyy[sql]"   # o extra [sql] inclui schemas .sql no grafo
graphify install                   # registra a skill no assistente
```

### 2. Indexar e automatizar

```sh
graphify update .        # primeira extracao (sem custo de LLM)
graphify hook install    # reconstroi o grafo a cada commit
```

### 3. Ignorar os artefatos pesados

A saida passa de 5 MB e e regeneravel. No `.gitignore`:

```
graphify-out/*
!graphify-out/GRAPH_REPORT.md
```

Use `graphify-out/*` (com barra-asterisco), **nao** `graphify-out/`: o git nao
reabre um diretorio ja excluido, entao a excecao do relatorio seria ignorada.

Se `graphify hook install` adicionar `graphify-out/graph.json merge=graphify`
ao `.gitattributes`, remova a linha — ela referencia um arquivo agora ignorado
e exigiria o merge driver nas outras maquinas sem nunca ser usada.

### 3b. Excluir o proprio kit do indice

O kit e documentacao, nao codigo do projeto. Sem excluir, ele entra no grafo e
distorce o mapa - num projeto pequeno chega a domina-lo. Crie um
`.graphifyignore` na raiz (ou some ao existente):

```
kit-auditoria/
```

Ha um modelo pronto em `kit-auditoria/.graphifyignore-exemplo`. Rode
`graphify update .` de novo depois de criar.

### 4. Copiar o script destilador

Copie `kit-auditoria/graph-map.js` para `scripts/`. Ele nao tem dependencia alem do
Node (`fs`, `path`) e nao assume nada do layout — agrupa por `apps/`,
`packages/`, `services/`, `libs/`, `modules/` e cai para o diretorio de topo
em repos de app unico. Para outros prefixos:

```sh
GRAPH_MAP_GROUPS=domains,adapters node scripts/graph-map.js
```

Modos:

```sh
node scripts/graph-map.js           # imprime o mapa
node scripts/graph-map.js --json    # saida estruturada
node scripts/graph-map.js --write   # regenera a secao do CLAUDE.md
node scripts/graph-map.js --check   # exit 1 se desatualizado (para CI)
```

### 5. Montar o CLAUDE.md

Estrutura em tres camadas:

1. **Como investigar** — a ordem de consulta e os limites do grafo.
2. **Mapa gerado** — entre `<!-- graph-map:begin -->` e `<!-- graph-map:end -->`.
3. **Escrito a mao** — convencoes, dividas, decisoes.

Os marcadores sao o detalhe que faz isto sustentavel: `--write` regenera **so**
o que esta entre eles, entao o texto escrito a mao nunca e sobrescrito e voce
pode regenerar sem revisar o diff.

Bloco inicial para o agente adaptar:

````markdown
## Como investigar este codigo

**Consulte o grafo antes de abrir arquivos.**

```sh
graphify affected "<simbolo>"       # o que quebra se eu mudar isto
graphify explain "<simbolo>"        # quem chama, o que chama, onde mora
graphify path "<a>" "<b>"           # como dois simbolos se ligam
node scripts/graph-map.js           # visao geral da arquitetura
```

Ordem: `graph-map` (onde estou) -> `affected` (o que arrisco) -> abrir **so**
os arquivos que sobraram.

Simbolo repetido em varios modulos da "No unique node match": a ferramenta
imprime os ids; repita com o id completo.

### Onde o grafo NAO ajuda
- **Nao atravessa HTTP.** Chamadas de rede nao tem ligacao sintatica com o
  handler no servidor. Para impacto de mudanca de rota, grep pela string.
- **`graphify query` em linguagem natural nao serve.** Casa nome de simbolo,
  nao intencao; trunca a resposta. Use `explain` / `affected` / `path`.

## Mapa da arquitetura

<!-- graph-map:begin -->
<!-- graph-map:end -->
````

Depois: `node scripts/graph-map.js --write`.

### 6. Verificar que funciona

Nao confie no setup sem testar as duas pontas:

```sh
graphify explain "<um simbolo real do projeto>"   # deve trazer arquivo e linha
node scripts/graph-map.js --check                 # deve dizer "atualizado"
```

E teste a deteccao de desatualizacao, que e a parte que costuma falhar em
silencio: crie um arquivo com uma funcao, rode `graphify update .` e confirme
que `--check` sai com codigo 1. Depois apague o arquivo e rode `--write`.

## Limites — leia antes de prometer resultado

- **O grafo nao atravessa fronteira de rede.** AST le um arquivo por vez;
  `fetch('/api/x')` e `router.post('/x')` nao tem ligacao sintatica. Em
  projetos com front e back separados, essa lacuna e real e nenhum ajuste
  resolve.
- **`graphify query` em linguagem natural e fraco.** Casa nome de simbolo.
  Pergunta em outro idioma retorna vazio.
- **O ganho cresce com acoplamento, nao com numero de arquivos.** Em projeto
  pequeno ou de estrutura obvia, grep ja resolve. O valor aparece onde varios
  modulos se cruzam (hierarquias de erro, middlewares, permissoes).
- **O CLAUDE.md nao se atualiza sozinho.** O grafo sim (hook de post-commit),
  mas escrever no CLAUDE.md durante o hook sujaria a arvore depois de cada
  commit. Rode `--write` apos mudanca estrutural, ou plugue `--check` no CI
  para transformar disciplina em garantia.
- **Nao modifique o codigo do Graphify.** Ele vive num ambiente isolado do
  `uv`; qualquer patch local e apagado no proximo `uv tool upgrade`. Tudo
  aqui e construido **em volta** da ferramenta, no seu repositorio.

## Por que nao usar um LLM para "melhorar" o grafo

A forca do Graphify e nao ser inteligente: ~99% das relacoes sao extraidas da
sintaxe (`EXTRACTED`), nao inferidas. E isso que permite confiar no `affected`
sem conferir. Trocar extracao deterministica por inferencia semantica troca
dado verificavel por resposta plausivel — e destroi justamente o motivo de a
ferramenta valer a pena.
