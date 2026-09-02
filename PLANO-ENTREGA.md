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
| Painel do medico | Completo, complexo demais em 3 telas |
| Painel do paciente | Completo, mais raso que a API permite |
| **Envio de e-mail** | **Ausente - bloqueador** |
| Testes automatizados | Zero |

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

### 1. Nao existe envio de e-mail (critico)

Busca por nodemailer/smtp/sendMail na API: zero resultados. Em
`apps/api/src/routes/auth.ts:181` e `patient.ts:185`, "esqueci minha senha" gera
o token, grava o hash e **em producao devolve `undefined`** - ninguem recebe
nada. Mesmo caso no convite de equipe (`admin.ts:1180`).

Efeito na venda: paciente que esquece a senha fica travado, e a clinica precisa
mexer no banco. Nao da para entregar assim.

### 2. Zero testes automatizados

Nenhum arquivo `.test.ts` no repositorio. Com 118 rotas e RBAC granular,
qualquer ajuste antes da entrega e feito no escuro. Nao precisa de cobertura
ampla - precisa cobrir os fluxos que, se quebrarem, o cliente ve.

### 3. Fluxo de storage nunca validado ponta a ponta

O codigo esta correto, mas nao ha evidencia de um upload real ter atravessado
navegador -> presigned URL -> MinIO -> leitura via `/files/`. Erro de CORS ou de
`S3_PUBLIC_BASE_URL` so aparece em runtime.

## Complexidade: onde de fato esta

Voce sentiu certo, mas a complexidade esta concentrada, nao espalhada:

| Arquivo | Linhas |
|---|---|
| `apps/admin/src/components/Encounter.tsx` | 1396 |
| `apps/api/src/routes/admin.ts` | 1389 |
| `apps/admin/src/components/Landing.tsx` | 1178 |
| `apps/admin/src/components/Patients.tsx` | 1034 |
| `apps/api/src/routes/clinical.ts` | 842 |

Quatro arquivos de frontend concentram 4600 linhas. **O resto do projeto e
saudavel** - ja existe um design system proprio em `apps/admin/src/lib/ui.tsx`
(759 linhas: `Modal`, `Field`, `DataRow`, `ConfirmDialog`, `EmptyState`,
`FileUploadButton`, `PatientSearchSelect`, mascaras de CPF/telefone/dinheiro).

A conclusao importante: **nao falta componente reutilizavel, falta usar o que ja
existe**. As telas grandes cresceram porque montam formulario inline em vez de
compor com `ui.tsx`.

## Plano de entrega

Ordenado por bloqueio de venda. Cada passo entrega algo demonstravel.

### Passo 1 - Destravar o acesso (bloqueador)

Sem isto nao se entrega a cliente.

1. Adicionar `nodemailer` e um `lib/mailer.ts` com uma funcao
   `sendMail({ to, subject, html })`, lendo `SMTP_*` do ambiente.
2. Ligar nos tres pontos que ja geram token: reset de staff (`auth.ts:181`),
   reset de paciente (`patient.ts:185`) e convite de equipe (`admin.ts:1180`).
3. Manter o retorno do token em dev (ja e o comportamento) e, quando SMTP nao
   estiver configurado, logar o link no servidor em vez de falhar em silencio.

Criterio de aceite: pedir "esqueci a senha" em producao chega e-mail com link
que abre a tela de nova senha e conclui o login.

### Passo 2 - Provar a persistencia de imagem ponta a ponta

1. Subir `docker compose up` e fazer upload real de foto pelo painel.
2. Conferir os tres pontos: objeto no bucket MinIO, `storageKey` gravado no
   Postgres e imagem abrindo por `/files/`.
3. Ajustar CORS do bucket e `S3_PUBLIC_BASE_URL` conforme o resultado.

Criterio de aceite: imagem enviada pelo painel aparece na landing apos atualizar
a pagina, e anexo clinico abre por link que expira.

### Passo 3 - Simplificar as 3 telas que a cliente usa todo dia

Nao reescrever: **extrair**. O alvo e reduzir cada arquivo grande compondo com
`ui.tsx`, sem mudar contrato de API.

- `Encounter.tsx` (1396): separar por etapa do atendimento (anamnese,
  procedimento, prescricao, anexos), cada uma um componente que ja usa
  `Field`/`FormRow`/`SubmitButton`.
- `Patients.tsx` (1034): separar lista, filtro e ficha em tres componentes.
- `Landing.tsx` (1178): uma secao editavel por componente, todas iguais.

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

### Passo 5 - Rede de seguranca minima

Cinco testes de API cobrindo o que quebra a venda: login de staff, login de
paciente, criar agendamento publico, upload presigned e permissao negada para
papel sem acesso.

Criterio de aceite: `npm test` roda no CI e falha se algum desses quebrar.

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
