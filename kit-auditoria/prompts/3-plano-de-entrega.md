# Prompt: plano de entrega

> Para o Claude. Execute depois de `2-auditoria.md`, com o `AUDITORIA.md` pronto.

## Tarefa

Transforme a auditoria em `PLANO-ENTREGA.md`: uma sequencia de passos que leva
esta aplicacao de "quase pronta" a "entregavel ao cliente".

## Como ordenar

**Por bloqueio de entrega, nao por facilidade nem por area tecnica.** O primeiro
passo e o que, sozinho, impede entregar hoje. Se nada impede, o primeiro passo e
o que o usuario final percebe primeiro.

Cada passo precisa de:

- **Objetivo em uma frase** - o que muda para quem usa o sistema
- **O que fazer** - concreto, com arquivo e linha quando ja se sabe onde
- **Criterio de aceite** - observavel por quem nao le codigo. "Pedir nova senha
  faz chegar e-mail com link que conclui o login" serve; "implementar SMTP" nao.

Poucos passos. Se passar de 6, agrupe: um passo que ninguem termina numa sessao
e um projeto disfarcado de passo.

## Regras de conteudo

**Preserve o que funciona.** O plano deve dizer explicitamente o que **nao**
mexer. Toda auditoria de projeto inacabado encontra decisoes boas que parecem
pendencias - fallbacks, degradacao graciosa, escolhas de arquitetura. Sem essa
secao, elas viram vitima da proxima refatoracao.

**Simplificar e extrair, nao reescrever.** Para tela inchada, o caminho e
quebrar em componentes usando o que ja existe no projeto. Reescrever do zero
perde comportamento que ninguem lembra de reimplementar.

**Nao invente escopo.** O plano cobre o que a auditoria encontrou. Se algo seria
bom mas nao bloqueia, registre no fim como divida, fora dos passos.

## Experiencia do usuario

Todo passo que toca interface deve respeitar:

- **Tarefa principal em ate 3 passos** a partir da tela inicial.
- **Um caminho obvio por tela.** Se ha duas formas de fazer a mesma coisa,
  escolha uma.
- **Reaproveitar os componentes que o projeto ja tem.** Antes de propor
  componente novo, verifique o que existe - normalmente ja existe e nao esta
  sendo usado.
- **Estado vazio, carregando e erro** resolvidos em toda tela nova. Sao o que
  faz o sistema parecer inacabado numa demonstracao.

## Formato

1. **Resumo executivo** - onde o projeto esta e o que falta, em 3 linhas
2. **Os bloqueadores** - com arquivo, linha e efeito no usuario
3. **Plano** - os passos, na ordem, com criterio de aceite
4. **O que NAO fazer** - o que funciona e deve ser preservado
5. **Divida registrada** - o que fica para depois, sem entrar nos passos

## Ao terminar

Aponte qual passo comecar e por que. Se algum passo depender de decisao do dono
(qual provedor de e-mail, se o WhatsApp e manual ou automatico), pergunte em vez
de assumir - mas so o que muda o trabalho de verdade.
