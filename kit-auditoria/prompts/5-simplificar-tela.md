# Prompt: simplificar uma tela inchada

> Para o Claude. Use quando o plano pedir. Diga qual tela:
> "leia kit-auditoria/prompts/5-simplificar-tela.md e aplique em <arquivo>".

## Tarefa

Reduzir um arquivo de tela grande **sem mudar o que ele faz**.

## A regra principal

**Extrair, nao reescrever.** Uma tela de mil linhas acumulou anos de casos de
borda - validacao, estado de carregamento, tratamento de erro, ajuste que so
existe porque um usuario reclamou. Reescrever do zero perde tudo isso em
silencio, e o que volta parece mais limpo ate a primeira semana de uso.

Voce esta movendo codigo, nao repensando o problema.

## Antes de mexer

1. **Procure a camada de componentes que o projeto ja tem** (`lib/ui`,
   `components/common`, `shared/`). Quase sempre existe e esta subutilizada: a
   tela cresceu montando formulario inline em vez de usar o que ja estava
   pronto. Use o que existe antes de criar qualquer coisa.
2. Leia a tela inteira e identifique os blocos - por etapa do fluxo, por secao,
   por entidade editada.
3. Confira se ela e usada em mais de um lugar (`graphify affected`).

## Como quebrar

- **Por unidade de trabalho do usuario**, nao por tipo tecnico. "Anamnese",
  "Prescricao", "Anexos" - nao "handlers", "estado", "helpers".
- Cada bloco extraido vira um componente que **compoe com o que ja existe**.
- Estado que so um bloco usa vai com ele. Estado compartilhado fica no pai.
- Sem prop drilling profundo. Se um valor desce mais de dois niveis, o corte
  esta errado - refaca o agrupamento.

## Nao faca

- Nao mude comportamento, texto, validacao ou chamada de API. Se achar bug,
  anote e siga - corrigir junto torna impossivel saber o que quebrou.
- Nao introduza biblioteca nova de estado ou formulario.
- Nao crie abstracao para um caso so. Dois componentes parecidos sao melhores
  que um generico com sete parametros.

## Experiencia do usuario

Ao terminar, verifique:

- A tarefa principal continua em **ate 3 passos**.
- Um caminho obvio por tela.
- Estado vazio, carregando e erro continuam tratados em cada bloco extraido -
  e o que mais se perde numa extracao.

Extrair componente nao garante que a tela funcione no aparelho: o codigo pode
ficar limpo e o layout continuar quebrado em tela estreita. Depois de extrair,
meca com `9-interface-que-funciona-na-tela-real.md`.

## Ao terminar

1. Build e testes verdes. Relate o resultado real.
2. Compare o antes e depois em linhas.
3. **Diga o que voce nao conseguiu extrair e por que.** Costuma sobrar um nucleo
   que so se resolve mudando comportamento - e isso e outra tarefa, com decisao
   do dono.
4. Commit explicando o criterio do corte, nao a lista de arquivos.
