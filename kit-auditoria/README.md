# Kit: auditar e concluir uma aplicacao parada

Material para retomar projetos que ficaram grandes, complexos e inacabados.
Copie a pasta `kit-auditoria/` para a raiz do outro projeto e execute os prompts
na ordem.

Foi extraido de um caso real: um monorepo de 24k linhas (site + painel medico +
painel do paciente + API) que parecia incompleto e, auditado, estava completo -
faltavam tres coisas pontuais. O kit existe para chegar a esse tipo de conclusao
antes de reescrever o que ja funciona.

## Ordem de uso

| # | Arquivo | O que faz | Quando |
|---|---|---|---|
| 1 | `1-instalar-mapa-de-codigo.md` | Indexa o codigo e monta o `CLAUDE.md` | Uma vez, no inicio |
| 2 | `prompts/2-auditoria.md` | Levanta o estado real do projeto | Depois do passo 1 |
| 3 | `prompts/3-plano-de-entrega.md` | Vira a auditoria em plano executavel | Depois do passo 2 |
| 4 | `prompts/4-executar-passo.md` | Executa um passo do plano | Repetir por passo |
| 5 | `prompts/5-simplificar-tela.md` | Reduz uma tela inchada | Quando o plano pedir |

Os passos 1 a 3 sao sequenciais. Os passos 4 e 5 se repetem.

## Como executar um prompt

Abra o Claude Code na raiz do projeto e peca, por exemplo:

```
leia kit-auditoria/prompts/2-auditoria.md e execute
```

Cada prompt e escrito para o Claude, nao para voce. Eles ja contem as regras que
evitam os erros mais caros - principalmente concluir sem medir e reescrever o
que ja funciona.

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

**2. Consultar o grafo antes de abrir arquivos.** Medido no projeto original:
responder "o que quebra se eu mudar esta classe" custou ~1,6 KB pelo grafo
contra ~166 KB lendo os arquivos - cerca de 100x menos contexto, com resposta
melhor. Isso e o que permite auditar um projeto grande sem estourar o contexto.
