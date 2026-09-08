# Prompt: auditar usuarios e niveis de acesso

> Para o Claude. Use quando o sistema tiver mais de um tipo de usuario.
> "leia kit-auditoria/prompts/7-auditar-acessos.md e execute".

## Tarefa

Descobrir o que cada papel **realmente** alcanca, e corrigir o que divergir da
intencao. Escrever o resultado no `CLAUDE.md`.

## A regra que decide o resultado

**Nao leia o mapa de papeis para concluir o que alguem pode.** Leia o token, a
sessao, a resposta da API.

Num caso real, o papel "Equipe" declarava 6 permissoes no codigo e o token
trazia 12 — as 6 extras incluiam ler e escrever prontuario. Ninguem que lesse o
arquivo de permissoes descobriria: o vazamento vinha de `UserPermission`
gravado pelo seed, por cima do papel. **O mapa estava certo e o sistema
errado.**

Esse e o defeito caracteristico desta area: a configuracao contradiz a
declaracao, em silencio, e a leitura do codigo confirma a declaracao.

## Roteiro

### 1. Inventariar

- Quais papeis existem? Quais permissoes existem?
- Ha permissao declarada e nunca usada? Usada e nao declarada?
- Como o middleware decide: por papel ou por permissao? Ha atalho para o
  administrador (`if role === ADMIN return next()`)? **Atalho de admin esconde
  defeito de todos os outros papeis** — teste sempre com um papel comum.
- "Exige todas" e "exige qualquer uma" sao a mesma funcao? Confundir as duas
  tranca a porta para todo mundo ou abre para todo mundo.

### 2. Montar a tabela de expectativa

Para **cada papel**, duas listas, escritas antes de testar:

- **Precisa alcancar** — o que o trabalho dele exige. 403 aqui e trabalho
  impedido, tao grave quanto vazamento.
- **Deve ser barrado** — 200 aqui e dado exposto.

Escreva em vocabulario do negocio ("recepcao nao le prontuario"), nao em nome
de permissao. A pergunta e se o desenho faz sentido para quem trabalha, e so o
vocabulario do negocio revela isso.

### 3. Testar contra a API

Suba banco descartavel e servidor, crie um usuario de cada papel, faca login e
chame cada rota. Um caso por linha, `ok` ou `FALHA`:

```
RECEPTION
   ok  precisa: operar o caixa (200)
   ok  bloqueio: ler prontuario (403)
 FALHA bloqueio: ler planos (200)   <- exposto
```

**Nunca contra producao.** O script cria usuario e escreve no banco.

Se um papel nao existe no seed, crie — e registre a ausencia. Papel sem conta
nunca foi testado por ninguem.

### 4. Achar a causa, nao o caso

Divergencia entre mapa e token vem quase sempre de uma destas:

- **Override gravado por seed ou migracao.** Override existe para a excecao de
  uma pessoa, decidida na tela de equipe. Seed que redefine um papel inteiro
  torna o mapa decorativo.
- **Papel novo sem entrada no mapa**, herdando um padrao permissivo.
- **Rota protegida por papel em vez de permissao**, que passa a divergir assim
  que alguem edita o mapa.

### 5. Conferir o menu contra a API

O menu e conveniencia; quem protege e a rota. Mas os dois devem cobrar o mesmo:

- Item exige **mais** que a rota → some para quem poderia usar. Encontrado num
  caso real: a medica nao via a propria tela de procedimentos.
- Item exige **menos** → aparece e devolve 403 ao clicar.
- Item exige permissao **inexistente** → some para todos menos o admin, sem
  erro nenhum.

### 6. Travar com teste

Escreva testes que falhem se o defeito voltar, e **confirme que falham**
reintroduzindo cada um. No minimo:

- Nenhum seed grava permissao por cima de um papel.
- Papeis sem funcao clinica/sensivel nao tem a permissao correspondente.
- So o administrador gerencia equipe e le auditoria.
- Cada item de menu cobra o que a rota cobra.

## Ao terminar

No `CLAUDE.md`: o que encontrou, o que corrigiu, o que ficou pendente, e o
principio que a auditoria confirmou.

Registre tambem os papeis **sem conta no seed** — sao os que nenhum teste
cobre. Se o usuario principal opera como administrador, diga: o atalho de admin
faz todo defeito dos outros papeis passar despercebido em producao.
