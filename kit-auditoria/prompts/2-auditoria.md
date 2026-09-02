# Prompt: auditoria do estado real

> Para o Claude. Execute na raiz do projeto, depois de `1-instalar-mapa-de-codigo.md`.

## Tarefa

Levante o estado real desta aplicacao e escreva `AUDITORIA.md` na raiz.

O dono do projeto acha que ele esta incompleto e complexo demais. **Trate isso
como hipotese, nao como fato.** Sua tarefa e descobrir o que e verdade.

## Regra que decide a qualidade do resultado

**Nao conclua nada que voce nao mediu.** Toda afirmacao da auditoria precisa de
um numero ou de um arquivo com linha. Frases como "a API parece incompleta" ou
"o codigo esta bem estruturado" sao inuteis - substitua por contagens.

O erro mais caro aqui e o oposto do esperado: presumir que falta o que ja
existe, e recomendar reescrever o que ja funciona.

## Roteiro

Prefira o grafo (`graphify affected/explain/path`, `node scripts/graph-map.js`)
e comandos de contagem. Abra arquivo so quando a contagem levantar uma duvida
que so o codigo responde.

### 1. Forma do projeto
Areas, tamanho de cada uma, acoplamento entre elas. Se ha varias superficies
(site, painel, app, API), diga como conversam - mesma origem, HTTP, fila.

### 2. Backend / contrato
Quantas rotas, agrupadas por recurso. Como autenticacao e autorizacao sao
aplicadas. Se ha rota sem protecao que deveria ter.

### 3. Persistencia
Quantos modelos/tabelas, se ha migracoes versionadas, e como arquivos e imagens
sao guardados (banco, disco, S3). **Verifique especificamente**: o upload chega
a um storage real e a chave e gravada? Ou o caminho existe so no codigo?

### 4. Frontend
Para cada superficie: quantas telas, quais consomem a API de verdade e quais
usam dado fixo. **Cuidado com falso positivo**: um valor local pode ser fallback
deliberado (a tela busca do servidor e cai para o valor local se falhar), o que
e bom design, nao pendencia. Leia o codigo antes de classificar como hardcode.

### 5. Onde a complexidade esta
Liste os arquivos por numero de linhas. A complexidade quase sempre esta
concentrada em poucos arquivos, nao espalhada. Verifique tambem se ja existe
uma camada de componentes reutilizaveis subutilizada - e comum a tela ter
crescido por nao usar o que ja estava pronto.

### 6. O que impede entregar
Procure ativamente pelo que costuma faltar em projeto inacabado:

- **Envio de e-mail** (reset de senha que gera token e nao entrega a ninguem)
- Pagamento, notificacao, integracao externa declarada e nao ligada
- Variavel de ambiente obrigatoria sem valor em producao
- Testes automatizados (conte: quantos arquivos de teste existem?)
- Fluxo que so funciona em dev (token devolvido na resposta, mock, seed)

Para cada um: e bloqueador de entrega ou incomodo? Justifique pelo efeito no
usuario final.

### 7. Estado verificavel
Rode o build (e os testes, se houver) e relate o resultado real. Se falhar,
mostre o erro.

## Formato do AUDITORIA.md

1. **Resumo executivo** - o veredito em 3 linhas, com os numeros que o sustentam
2. **Tabela de estado por camada** - completo / incompleto / ausente
3. **Como tudo se conecta** - diagrama simples e o caminho de um dado
4. **Bloqueadores** - o que impede entregar, com arquivo e linha
5. **Onde a complexidade esta** - tabela de arquivos por tamanho
6. **O que ja funciona** - explicito, para ninguem reescrever por engano

## Ao terminar

Diga em uma frase se a hipotese do dono se confirmou. Se o projeto estiver mais
completo do que ele pensa, **diga isso claramente** - e a informacao mais valiosa
da auditoria e a que evita semanas de trabalho desnecessario.

Seja honesto sobre o limite: se voce leu o codigo mas nao executou o sistema,
"completo" significa implementado e com build passando, nao verificado em uso.
