# Prompt: auditar usuarios e niveis de acesso

> Para o Claude. Use quando o sistema tiver mais de um tipo de usuario.
> "leia kit-auditoria/prompts/7-auditar-acessos.md e execute".

## Tarefa

Descobrir o que cada papel **realmente** alcanca, e corrigir o que divergir da
intencao. Escrever o resultado no `CLAUDE.md`.

## A regra que decide o resultado

**Nao leia o mapa de papeis para concluir o que alguem pode.** Leia o token, a
sessao, a resposta da API.

Caso medido: um papel declarava 6 permissoes no codigo e o token entregava 12.
As 6 extras davam acesso ao recurso mais sensivel do sistema. Ninguem que lesse
o arquivo de permissoes descobriria — as extras vinham de uma tabela de
excecoes por usuario, gravada pelo script de carga inicial, por cima do papel.
**O mapa estava certo e o sistema errado.**

Esse e o defeito caracteristico desta area: a configuracao contradiz a
declaracao, em silencio, e a leitura do codigo confirma a declaracao.

## Roteiro

### 1. Inventariar

- Quais papeis existem? Quais permissoes existem?
- Ha permissao declarada e nunca usada? Usada e nao declarada?
- Como o middleware decide: por papel ou por permissao? Ha atalho para o
  administrador (`if (role === ADMIN) return next()`)? **Atalho de admin
  esconde defeito de todos os outros papeis** — teste sempre com um papel
  comum.
- "Exige todas" e "exige qualquer uma" sao a mesma funcao? Confundir as duas
  tranca a porta para todo mundo ou abre para todo mundo. Se ha rota que dois
  papeis alcancam por caminhos diferentes, ela precisa da variante "qualquer
  uma" — com "todas", nenhum dos dois entra.

### 2. Montar a tabela de expectativa

Para **cada papel**, duas listas, escritas antes de testar:

- **Precisa alcancar** — o que o trabalho dele exige. 403 aqui e trabalho
  impedido, tao grave quanto vazamento.
- **Deve ser barrado** — 200 aqui e dado exposto.

Escreva em **vocabulario do negocio deste projeto**, nao em nome de permissao.
A pergunta e se o desenho faz sentido para quem trabalha, e so o vocabulario de
quem trabalha revela isso. Se o sistema tem um papel de atendimento e um de
retaguarda, escreva o que cada um faz no dia — nao `RECORD_READ`.

### 3. Testar contra a API

Suba banco descartavel e servidor, crie um usuario de cada papel, faca login e
chame cada rota. Um caso por linha, `ok` ou `FALHA`:

```
<PAPEL>
   ok  precisa: <acao do dia a dia dele> (200)
   ok  bloqueio: <recurso de outro papel> (403)
 FALHA bloqueio: <outro recurso> (200)   <- exposto
```

**Nunca contra producao.** O script cria usuario e escreve no banco.

Se um papel nao existe nos dados de carga, crie — e registre a ausencia. Papel
sem conta nunca foi testado por ninguem.

### 4. Achar a causa, nao o caso

Divergencia entre mapa e token vem quase sempre de uma destas:

- **Excecao por usuario gravada por script de carga ou migracao.** Esse
  mecanismo existe para a excecao de **uma pessoa**, decidida na tela de
  administracao. Script que redefine um papel inteiro torna o mapa decorativo.
- **Papel novo sem entrada no mapa**, herdando um padrao permissivo.
- **Rota protegida por papel em vez de permissao**, que passa a divergir assim
  que alguem edita o mapa.

### 5. Conferir o menu contra a API

O menu e conveniencia; quem protege e a rota. Mas os dois devem cobrar o mesmo:

- Item exige **mais** que a rota → some para quem poderia usar. Caso medido: o
  item pedia permissao de configuracao para abrir uma tela que a API protege
  com permissao de edicao, e o papel que mais usava a tela nao a enxergava.
- Item exige **menos** → aparece e devolve 403 ao clicar.
- Item exige permissao **inexistente** → some para todos menos o admin, sem
  erro nenhum.

### 6. Travar com teste

Escreva testes que falhem se o defeito voltar, e **confirme que falham**
reintroduzindo cada um. No minimo:

- Nenhum script de carga grava permissao por cima de um papel.
- Papeis sem funcao sensivel nao tem a permissao correspondente.
- So o administrador gerencia usuarios e le auditoria.
- Cada item de menu cobra o que a rota cobra.

## Ao terminar

No `CLAUDE.md`: o que encontrou, o que corrigiu, o que ficou pendente, e o
principio que a auditoria confirmou.

Registre tambem os papeis **sem conta nos dados de carga** — sao os que nenhum
teste cobre. Se o usuario principal opera como administrador, diga: o atalho de
admin faz todo defeito dos outros papeis passar despercebido em producao.
