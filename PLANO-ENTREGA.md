# Auditoria e plano de entrega

Auditoria feita em 2026-09-02 sobre o commit `d407ffa`, lendo o grafo do codigo,
as 118 rotas da API, o schema Prisma, a config de storage e os 4 frontends.

## Resumo executivo

O sistema **nao esta incompleto - esta completo e subutilizado**. A percepcao de
"falta persistir" nao se confirma: 29 modelos no Postgres, 118 rotas, storage S3
com URLs pre-assinadas, RBAC granular, auditoria e sessoes revogaveis, tudo
implementado e com build passando nos 4 apps.

O que impede vender hoje sao **tres bloqueadores concretos**, nenhum deles
arquitetural, e um excesso de superficie em poucas telas.

| Camada | Estado |
|---|---|
| Banco (29 modelos, 8 migracoes) | Completo |
| API (118 rotas, RBAC, auditoria) | Completo |
| Storage S3/MinIO + Nginx `/files/` | Completo, falta validar end-to-end |
| Landing (CMS editavel + fallback) | Completo |
| Painel do medico | Completo; 3 telas grandes ja quebradas |
| Painel do paciente | Completo, mais raso que a API permite |
| Envio de e-mail | Implementado, falta validar com SMTP real |
| Testes automatizados | 17 testes de regra; falta teste de rota |

## Como tudo se conecta

```
apps/web (landing)       \
apps/admin (medico)       >--- HTTP /api ---> apps/api ---> Prisma ---> PostgreSQL
apps/patient (paciente)  /                       |
                                                 +---> S3/MinIO (Nginx /files/)
```

Os 4 apps sao **silos independentes** (medido: zero arestas cruzando entre eles
no grafo). Nao compartilham codigo, so falam por HTTP. Consequencia pratica:
mexer na UI de um nunca quebra outro; mudar uma rota da API pode quebrar tres.

Nginx (`nginx/conf.d/default.conf`) publica tudo sob um dominio:
`/` para web, `/admin/` para admin, `/paciente/` para patient, `/api/` para a
API e `/files/` para o MinIO.

### Persistencia

- **Dados**: PostgreSQL via Prisma. 8 migracoes versionadas, multi-tenant por
  `tenantId`.
- **Imagens e anexos**: nunca vao para o banco. O fluxo e presigned URL - a API
  assina (`presignUpload`), o navegador envia direto ao S3, e so a chave volta
  para o banco (`Attachment.storageKey`, `LandingImage`). Leitura usa
  `presignDownload` (15 min) para arquivo clinico e URL publica via `/files/`
  para imagem de site. Este e o desenho correto; nao mude.
- **Degradacao**: `storageConfigured` desliga o upload com 503 explicito se as
  variaveis `S3_*` faltarem. Nada quebra em silencio.

### Landing: CMS com rede de seguranca

`useSection()` em `apps/web/src/hooks/useLanding.ts` devolve o conteudo do banco
quando existe e o texto do proprio componente quando nao existe. **Isso e uma
decisao boa, nao uma pendencia**: o site nunca abre em branco. O que falta e a
medica saber que pode editar (ver Passo 3).

## Os tres bloqueadores

### 1. Envio de e-mail (resolvido no codigo)

Era o unico item que sozinho travava a entrega: os tres fluxos que geram token
(reset de equipe, reset de paciente, convite) gravavam o hash e descartavam o
valor, entao quem esquecia a senha dependia de alguem mexer no banco.

Resolvido com `lib/mailer.ts` e ligado tambem ao ciclo do agendamento. **Falta
validar com um SMTP real** - ate la, o envio esta escrito mas nao exercitado.

### 2. Testes automatizados (parcialmente resolvido)

O projeto nao tinha nenhum. Agora ha 17 cobrindo permissao e fuso - as regras
onde o erro nao aparece. Falta cobertura de rota com banco.

### 3. Fluxo de storage nunca validado ponta a ponta

O codigo esta correto, mas nao ha evidencia de um upload real ter atravessado
navegador -> presigned URL -> MinIO -> leitura via `/files/`. Erro de CORS ou de
`S3_PUBLIC_BASE_URL` so aparece em runtime.

## Complexidade: onde de fato esta

Voce sentiu certo, mas a complexidade esta concentrada, nao espalhada:

| Arquivo | Na auditoria | Agora |
|---|---|---|
| `apps/api/src/routes/admin.ts` | 1389 | 1389 |
| `apps/admin/src/components/Landing.tsx` | 1178 | 595 |
| `apps/api/src/routes/clinical.ts` | 842 | 842 |
| `apps/admin/src/components/Encounter.tsx` | 1396 | 318 |
| `apps/admin/src/components/Patients.tsx` | 1034 | 206 |

As tres telas do painel foram quebradas (Passo 3). O maior arquivo agora e
`admin.ts`, no backend: 50 rotas num arquivo so. Nao entrou nos passos porque
rota grande incomoda quem edita, mas nao afeta quem usa - fica como divida.

**O resto do projeto e saudavel** - ja existe um design system proprio em
`apps/admin/src/lib/ui.tsx`
(759 linhas: `Modal`, `Field`, `DataRow`, `ConfirmDialog`, `EmptyState`,
`FileUploadButton`, `PatientSearchSelect`, mascaras de CPF/telefone/dinheiro).

A conclusao importante: **nao falta componente reutilizavel, falta usar o que ja
existe**. As telas grandes cresceram porque montam formulario inline em vez de
compor com `ui.tsx`.

## Revisao da regra de negocio

A regra esta bem escrita onde existe: horario opcional no agendamento (a pessoa
pode so pedir contato), vinculo automatico com paciente ja cadastrada pelo
e-mail, conflito de agenda checado com `checkSlotAvailable`, equipe podendo
confirmar fora do expediente mas nunca sobrepor atendimento.

O que faltava nao era regra a mais - era **fechar o ciclo com quem esta do outro
lado**. O sistema sabia tudo e nao contava nada:

- Quem agendava pela landing sem cadastro **nao recebia nada**. `notifyPatient`
  so alcanca quem tem `patientId` (notificacao no portal e push), e o WhatsApp
  depende de alguem da equipe clicar num link. A pessoa mandava o pedido e
  ficava no escuro.
- Quem esquecia a senha ficava preso na porta: o token era gerado e descartado.

O principio adotado: **todo evento que muda o estado de um compromisso avisa a
pessoa pelo canal que ela tem** - e-mail sempre, portal e push quando ha
cadastro, WhatsApp como acao da equipe. Isso e o que faz o sistema parecer vivo
sem acrescentar tela nenhuma.

O que **nao** virou regra nova, de proposito: cobranca, confirmacao automatica
sem revisao humana e lembrete agendado. Os dois primeiros tiram da clinica o
controle sobre a agenda; o terceiro precisa de um agendador em producao, que e
infraestrutura, nao regra. Ficam registrados como divida.

## Plano de entrega

Ordenado por bloqueio de venda. Cada passo entrega algo demonstravel.

### Passo 1 - Fechar o ciclo de comunicacao (CONCLUIDO)

1. `lib/mailer.ts` com `sendMail`, layout unico e degradacao: sem SMTP o link
   vai para o log em vez de sumir, e falha de envio nunca derruba a requisicao
   que ja concluiu.
2. Ligado nos tres pontos que geravam token orfao: reset de equipe, reset de
   paciente e convite de integrante.
3. Ligado tambem no ciclo do agendamento: aviso de recebimento na hora do pedido
   e, via `notifyPatient`, confirmacao, remarcacao e cancelamento - alcancando
   inclusive quem agendou sem cadastro.

Criterio de aceite: pedir "esqueci a senha" chega e-mail com link que conclui o
login. **Falta validar com SMTP real** (ver Passo 2).

### Passo 2 - Provar a persistencia de imagem ponta a ponta

1. Subir `docker compose up` e fazer upload real de foto pelo painel.
2. Conferir os tres pontos: objeto no bucket MinIO, `storageKey` gravado no
   Postgres e imagem abrindo por `/files/`.
3. Ajustar CORS do bucket e `S3_PUBLIC_BASE_URL` conforme o resultado.

Criterio de aceite: imagem enviada pelo painel aparece na landing apos atualizar
a pagina, e anexo clinico abre por link que expira.

### Passo 3 - Simplificar as 3 telas que a cliente usa todo dia (QUASE)

Nao reescrever: **extrair**. Movimento mecanico, sem tocar em comportamento,
texto, validacao ou chamada de API; contrato publico intacto nos tres casos.

| Arquivo | Antes | Depois | Corte |
|---|---|---|---|
| `Encounter.tsx` | 1396 | 318 | por etapa do consultorio |
| `Patients.tsx` | 1034 | 206 | lista / formulario / ficha |
| `Landing.tsx` | 1178 | 595 | editor / campos / preview |

Falta: `Landing.tsx` ainda tem 595 linhas contra a meta de ~400. O que sobra e
`SectionFields`, um switch com um ramo por secao - so encolhe separando uma
secao por arquivo.

Regra da experiencia: **toda tarefa da medica em ate 3 cliques a partir do
painel**. Agendar, atender, prescrever, editar o site.

Criterio de aceite: nenhum arquivo de tela acima de ~400 linhas, e nenhum
formulario novo escrito sem usar `ui.tsx`.

### Passo 4 - Fechar o painel do paciente

A API ja oferece mais do que a tela mostra (14 rotas, incluindo mensagens,
prescricoes e download de arquivo). Completar as secoes existentes (`Home`,
`Appointments`, `Prescriptions`, `Messages`) para consumir o que ja existe, sem
criar rota nova.

Criterio de aceite: paciente entra, ve a proxima consulta, abre a prescricao e
baixa o anexo, sem passar pela clinica.

### Passo 5 - Rede de seguranca minima (PARCIAL)

Feito: vitest instalado, `npm test` na raiz, e 17 testes cobrindo os dois pontos
onde erro nao aparece - permissao (papel ganhar acesso a mais expoe prontuario
sem quebrar nada visivel) e fuso (consulta so aparece na hora errada).
Verificado que pegam regressao: conceder `RECORD_READ` a `RECEPTION` falha.

Falta: teste de rota com banco (login, agendamento, upload presigned), que exige
subir Postgres de teste. Criterio de aceite: `npm test` no CI.

## O que NAO fazer

- **Nao reescrever a arquitetura.** Ela esta correta: silos independentes, API
  unica, storage fora do banco. O problema nunca foi o desenho.
- **Nao remover os fallbacks da landing.** Sao o que mantem o site no ar se a
  API cair.
- **Nao trocar o fluxo de presigned URL** por upload passando pela API. O atual
  e mais barato e mais escalavel.
- **Nao adiar o e-mail.** E o unico item que sozinho impede a entrega.

## Divida menor, registrada

- `packages/shared` e codigo morto: ninguem importa `@marcela/shared`, e o slug
  da clinica esta hardcoded em 5 arquivos. Unificar ou remover o pacote.
- WhatsApp e por link `wa.me` (nao envia sozinho). E uma decisao consciente e
  documentada no codigo; vale confirmar com a cliente que atende a expectativa.
- **Lembrete de consulta** (vespera do atendimento) precisa de agendador em
  producao - cron ou fila. A mensagem ja existe (`MessageKind` tem `reminder`);
  falta so quem dispare.
- **Confirmacao automatica sem revisao** e **cobranca** ficaram de fora de
  proposito: tiram da clinica o controle da agenda. Decisao da dona do negocio,
  nao tecnica.
