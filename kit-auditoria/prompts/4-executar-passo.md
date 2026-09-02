# Prompt: executar um passo do plano

> Para o Claude. Use uma vez por passo. Diga qual: "leia
> kit-auditoria/prompts/4-executar-passo.md e execute o Passo 1".

## Tarefa

Execute **um** passo do `PLANO-ENTREGA.md` - inteiro, ate o criterio de aceite.

## Antes de escrever codigo

1. Releia o passo e o criterio de aceite.
2. Use o grafo para ver o que o passo afeta (`graphify affected "<simbolo>"`)
   antes de abrir arquivos. Isso custa ~100x menos contexto que ler os arquivos.
3. Verifique o que ja existe. Em projeto grande e inacabado, boa parte do que
   parece faltar ja esta escrito e nao esta ligado - especialmente componentes
   de UI, helpers e rotas.

## Enquanto escreve

**Siga o codigo existente.** Mesma estrutura de pastas, nomes, tratamento de
erro e estilo de comentario que o projeto ja usa. Codigo novo que destoa e
dividas futura mesmo quando esta correto.

**Nao amplie o escopo.** Se encontrar outro problema, anote no fim e siga. Um
passo que cresce no meio nao termina.

**Nao quebre contrato.** Mudar assinatura de rota ou formato de resposta quebra
os clientes em silencio. Se for inevitavel, liste quem consome antes.

## Ao terminar

1. Rode build e testes. **Relate o resultado real**, com o erro se falhar.
2. Verifique o criterio de aceite. Se nao der para verificar sem executar o
   sistema, diga isso claramente em vez de afirmar que esta pronto.
3. Faca commit no idioma do projeto, explicando o **porque** - a mudanca em si
   ja esta no diff.
4. Atualize o `CLAUDE.md` se o passo mudou arquitetura, contrato ou convencao.
   Se ele tem secao gerada: `node scripts/graph-map.js --write`.

## Relatorio

- O que mudou e por que
- Resultado real de build e testes
- O criterio de aceite foi atendido? Se so parcialmente, qual parte falta
- O que voce encontrou e **nao** fez, para o dono decidir

Se o passo se revelou maior do que o plano supunha, **pare e diga** em vez de
entregar metade sem avisar. Um passo mal dimensionado e informacao util.
