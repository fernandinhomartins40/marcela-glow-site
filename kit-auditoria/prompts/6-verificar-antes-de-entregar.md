# Prompt: verificar antes de dizer que esta pronto

> Para o Claude. Use ao terminar qualquer mudanca, antes do commit e antes de
> relatar conclusao. "leia kit-auditoria/prompts/6-verificar-antes-de-entregar.md
> e execute".

## Por que este prompt existe

Os passos 2 a 5 evitam concluir sem medir. Este evita o erro seguinte, que so
aparece depois que o codigo esta escrito: **declarar pronto o que nao foi
verificado do jeito certo**.

Tres casos reais, todos de um mesmo projeto, todos com o build passando:

| O que foi verificado | O que estava quebrado |
|---|---|
| `rolePermissions` lido no codigo: 6 permissoes | O token trazia 12 — o seed gravava override por cima |
| `turbo run build` local: sucesso | O build do container falhava: dependencia so existia na raiz |
| Estrutura do menu: correta | A barra tinha 2640px de altura numa janela de 720px |

Nenhum foi pego lendo codigo. Cada um exigiu executar a coisa certa.

## As quatro perguntas

### 1. Eu verifiquei o comportamento ou so o codigo?

Ler prova que a chamada existe. So a execucao prova que ela faz o que diz.

Um mapa de permissoes correto no arquivo pode estar sobrescrito no banco. Um
`if` correto pode nunca ser alcancado. **Onde houver estado (banco, cache,
variavel de ambiente, dado de seed), o codigo e uma hipotese** — a fonte da
verdade e o sistema rodando.

Pergunte ao sistema, nao ao arquivo:

```sh
# permissao efetiva: consulte o token/sessao, nao o mapa de papeis
# dado gravado: consulte o banco, nao o seed
# rota protegida: chame com cada papel e veja o status
```

### 2. Eu verifiquei do mesmo jeito que producao executa?

Build local e build de deploy sao coisas diferentes quando ha container,
workspace ou monorepo. Um monorepo resolve dependencia pela raiz; um
`Dockerfile` que instala so o proprio app, nao.

Antes de confiar num build verde, pergunte:

- O deploy compila **em container**? Entao o teste que vale e o do container.
- O comando de build inclui arquivos que producao nao precisa (testes, mocks,
  fixtures)? Cada um e uma dependencia a mais que precisa existir la.
- Ha variavel de ambiente que so existe na sua maquina?

Quando nao der para rodar o container, reproduza a condicao dele: esconda a
dependencia que so existe na raiz e rode o mesmo comando.

### 3. Se for interface, eu medi ou so olhei a estrutura?

Estrutura correta e layout quebrado convivem sem conflito. Um menu pode ter os
grupos certos, na ordem certa, e ainda estar inutilizavel.

Meca no navegador, com numeros:

```js
el.getBoundingClientRect()   // altura, largura, posicao real
window.innerHeight           // compare com o que a tela tem
getComputedStyle(el)         // o que venceu a cascata, nao o que voce escreveu
```

Compare o medido com o esperado. "A barra tem 2640px numa janela de 720px" e um
fato; "o menu parece bom" nao e.

**E meca para mais de um caso.** Interface com papeis, estados ou permissoes
tem um caminho para cada um. Ver so o seu — normalmente o de mais privilegio —
esconde exatamente o que quebra para os outros.

### 4. O teste que escrevi realmente falha quando o defeito volta?

Teste que passa sempre nao protege nada, e da a sensacao mais perigosa que
existe: a de estar coberto.

Para cada teste novo:

1. Reintroduza o defeito que ele deveria pegar.
2. Rode e **confirme que falha**.
3. Restaure e confirme que volta a passar.

Se ele passou com o defeito presente, ele nao testa o que voce pensou.

## Ao relatar

Diga o que **verificou** e como, separando do que **inferiu**:

- "40/40 verificacoes contra a API, sete papeis" — verificado
- "o build passa" — diga **qual** build: local ou o do deploy
- "a tela ficou melhor" — sem numero, nao afirme

Se algo nao deu para verificar, **diga isso** em vez de escolher a palavra que
soa pronta. "Implementado, nao verificado em execucao" e uma frase util. "Feito"
sobre o que nao foi executado e uma que custa caro.

## O criterio final

Antes de dizer "esta pronto", responda: **o que eu teria que fazer para provar
que isto esta errado?** Se a resposta for algo que voce nao fez, faca antes de
concluir.
