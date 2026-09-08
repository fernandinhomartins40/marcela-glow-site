# Kit: auditar, concluir e manter uma aplicacao

Material para retomar projetos que ficaram grandes, complexos e inacabados —
e para nao deixar os novos chegarem la. Copie a pasta `kit-auditoria/` para a
raiz do outro projeto e execute os prompts na ordem.

Foi extraido de um caso real: um monorepo de 24k linhas (site + painel medico +
painel do paciente + API) que parecia incompleto e, auditado, estava completo -
faltavam tres coisas pontuais. O kit existe para chegar a esse tipo de conclusao
antes de reescrever o que ja funciona.

Os prompts 6 a 8 vieram da fase seguinte do mesmo projeto, ja em producao:
sao os que evitam os erros que aparecem **depois** que o codigo esta escrito -
declarar pronto sem verificar, papel de usuario que alcanca o que nao devia, e
deploy que falha sem que se saiba por que.

## Ordem de uso

**Para tirar o projeto do papel** — em ordem:

| # | Arquivo | O que faz | Quando |
|---|---|---|---|
| 1 | `1-instalar-mapa-de-codigo.md` | Indexa o codigo e monta o `CLAUDE.md` | Uma vez, no inicio |
| 2 | `prompts/2-auditoria.md` | Levanta o estado real do projeto | Depois do passo 1 |
| 3 | `prompts/3-plano-de-entrega.md` | Vira a auditoria em plano executavel | Depois do passo 2 |
| 4 | `prompts/4-executar-passo.md` | Executa um passo do plano | Repetir por passo |
| 5 | `prompts/5-simplificar-tela.md` | Reduz uma tela inchada | Quando o plano pedir |

**Para manter a qualidade** — sem ordem, conforme a necessidade:

| # | Arquivo | O que faz | Quando |
|---|---|---|---|
| 6 | `prompts/6-verificar-antes-de-entregar.md` | Confere se o "pronto" se sustenta | **Toda** mudanca, antes do commit |
| 7 | `prompts/7-auditar-acessos.md` | Testa o que cada papel alcanca | Sistema com mais de um tipo de usuario |
| 8 | `prompts/8-diagnosticar-deploy.md` | Acha a causa da falha pelo log | Deploy vermelho |

Os passos 1 a 3 sao sequenciais. Os demais se repetem conforme a necessidade.
O passo 6 e o mais barato de adotar e o que mais evita retrabalho: use sempre.

## Como executar um prompt

Abra o Claude Code na raiz do projeto e peca, por exemplo:

```
leia kit-auditoria/prompts/2-auditoria.md e execute
```

Cada prompt e escrito para o Claude, nao para voce. Eles ja contem as regras que
evitam os erros mais caros - principalmente concluir sem medir e reescrever o
que ja funciona.

## O que vem junto

Alem dos prompts, dois arquivos para copiar:

- `graph-map.js` -> `scripts/` (passo 1): destila o grafo no `CLAUDE.md`.
- `ver-deploy.mjs` -> `scripts/` (passo 8): le os logs do GitHub Actions. Ele
  descobre o repositorio pelo `git remote` e usa o token que o `git push` ja
  guarda em `~/.git-credentials`.

## O que o kit assume

- O projeto esta em git.
- Da para rodar o build (ou os testes) para verificar o estado.
- Python 3.10+ e `uv` disponiveis, para o indexador do passo 1.
- Linguagem coberta por tree-sitter (o mainstream todo: TS/JS, Python, Go, Rust,
  Java, C#, PHP, Ruby, Kotlin, Swift...). Fora disso o grafo sai pobre e o passo
  1 rende pouco - os passos 2 a 5 continuam validos.

## O principio por tras

Duas ideias sustentam o kit:

**1. Medir antes de concluir.** "Esta incompleto" e "esta complexo" sao
sensacoes. Contar rotas, modelos e linhas por arquivo transforma isso em fato -
e o fato costuma ser diferente da sensacao. No caso original, o sistema tinha
118 rotas e 29 modelos funcionando; o que faltava era envio de e-mail.

**2. Verificar do jeito que producao executa.** Ler o codigo prova que a
chamada existe; so a execucao prova que ela faz o que diz. Tres defeitos reais
passaram por revisao de codigo com o build verde: um mapa de permissoes correto
no arquivo e sobrescrito no banco, um build que passa no monorepo e quebra no
container, e um menu com a estrutura certa e 2640px de altura numa janela de
720px. Nenhum apareceu lendo — cada um exigiu executar a coisa certa. E o
assunto do passo 6.

**3. Consultar o grafo antes de abrir arquivos.** Medido no projeto original:
responder "o que quebra se eu mudar esta classe" custou ~1,6 KB pelo grafo
contra ~166 KB lendo os arquivos - cerca de 100x menos contexto, com resposta
melhor. Isso e o que permite auditar um projeto grande sem estourar o contexto.
