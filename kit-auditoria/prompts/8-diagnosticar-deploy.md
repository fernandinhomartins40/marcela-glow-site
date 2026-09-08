# Prompt: diagnosticar deploy que falhou

> Para o Claude. "leia kit-auditoria/prompts/8-diagnosticar-deploy.md e execute"
> — ou, se o script ja estiver instalado, so
> `node scripts/ver-deploy.mjs falhas`.

## Tarefa

Descobrir por que o deploy falhou, pelo log, e corrigir a causa.

## Instale o acesso ao log antes de investigar

O erro mais caro aqui e **investigar sem o log**. Num caso real, uma falha foi
diagnosticada por SSH no servidor, comparando data de imagem Docker com data de
release para deduzir em que passo o job morreu — quatro conexoes para chegar ao
que o log dizia numa linha.

Antes de qualquer outra coisa, verifique se da para ler o log:

1. **`gh` instalado?** `gh run list` e `gh run view <id> --log-failed` bastam.
2. **Sem `gh`?** Copie `kit-auditoria/ver-deploy.mjs` para `scripts/` e ajuste a
   constante `REPO`. Ele usa o token que o `git push` ja guarda em
   `~/.git-credentials` — normalmente nao ha credencial a criar, so a ler.
3. **Repositorio privado sem token?** Ai sim peca ao dono um token com escopo
   `repo` e `workflow`, explicando para que serve.

```sh
node scripts/ver-deploy.mjs              # ultimas execucoes, com o run id
node scripts/ver-deploy.mjs falhas       # so as que falharam
node scripts/ver-deploy.mjs <run_id>     # passo que quebrou + linhas de erro
node scripts/ver-deploy.mjs <run_id> --tudo
```

## Ao ler o log

**O erro raramente esta na ultima linha.** Um build quebra no meio e o resto e
ruido de rollback e limpeza. Procure a primeira linha que casa com `error`,
`ERROR:`, `Cannot find`, `exit code` — e leia o que veio **antes** dela.

Identifique, nesta ordem: qual passo, qual comando, qual arquivo e linha.

## A armadilha: o site responder 200 nao prova que a versao subiu

Um script de deploy bem escrito compila **antes** de derrubar o que esta no ar.
Quando o build falha, a versao anterior continua servindo — tudo responde 200 e
o sistema parece intacto. Ele esta: e a versao velha.

Confirme o que esta publicado por evidencia, nao por aparencia:

```sh
readlink -f /caminho/da/app/current      # para onde o link aponta
docker images --format '{{.Repository}} {{.CreatedAt}}'   # data da imagem
```

E, do lado do cliente, procure no bundle publicado uma string que **so exista
na versao nova**. Se ela nao esta la, a versao nao subiu — independente do que
o health check diga.

## Causas comuns, por frequencia

**1. O build local nao e o build do deploy.** Monorepo resolve dependencia pela
raiz; `Dockerfile` que instala so o proprio app, nao. Sintoma classico:
`Cannot find module 'X'` para algo que existe na sua maquina.

Caso real: um arquivo de teste em `src/` entrou no `tsc` do build de producao e
pediu `vitest`, que so existia na raiz. Correcao: excluir `*.test.*` do
tsconfig do build — **em todos os apps com o mesmo padrao**, nao so no que
quebrou.

**2. Variavel de ambiente que so existe em dev.**

**3. Migracao pendente ou incompativel** com o dado que ja esta em producao.

**4. Passo de infraestrutura** (certificado, DNS, proxy) que falha por motivo
externo ao codigo.

## Ao corrigir

Corrija **a causa e os irmaos dela**. Se a quebra veio de um padrao que se
repete — mesmo `tsconfig`, mesmo `Dockerfile`, mesma configuracao em varios
apps —, o proximo a esbarrar nele derruba o deploy de novo.

Trave com teste onde couber, e confirme que o teste falha se o defeito voltar.

## Ao terminar

Verifique que a versao nova esta **de fato** no ar, pela evidencia da secao
acima — nao pelo status verde do job.

Registre no `CLAUDE.md` o que quebrou e por que passou despercebido. Falha de
deploy quase sempre revela um ponto cego da verificacao, e esse e o aprendizado
que evita a proxima.
