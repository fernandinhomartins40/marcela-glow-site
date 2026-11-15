# Apps nativos (iOS e Android) — Plano de implementação

Documento 2 de 3. Parte da análise em `01-ANALISE.md`; a divisão do trabalho
entre agentes está em `03-EXECUCAO-AGENTES-OPUS.md`.

## 1. Alvo

Dois apps publicados na App Store e no Google Play:

| | Paciente | Médica |
|---|---|---|
| Nome | Minha Jornada | Marcela CRM |
| Identificador (confirmar — D1) | `br.com.dramarceladuch.paciente` | `br.com.dramarceladuch.medica` |
| Código | `apps/patient` | `apps/admin` |
| Ícone-fonte | `src/assets/brand/app-icon-medica-nude.png` | `src/assets/brand/app-icon-medica-brown.png` |
| Cor de fundo da abertura | `#fff8f1` | `#f6f2ec` |
| Distribuição (D2) | Pública | Não listada (Apple) / restrita (Google) |

Critério de pronto: cada tela do app, no aparelho, é indistinguível da mesma
tela do PWA aberto em modo aplicativo (`?app=1`) na mesma largura; login,
sessão, anexos, WhatsApp, push e exclusão de conta funcionam; a web continua
funcionando exatamente como antes.

## 2. Princípios

1. **Um código, três destinos** (web, iOS, Android). Nada de tela duplicada.
   Diferença de comportamento passa por **um** arquivo: `src/lib/nativo.ts`.
2. **A web não pode mudar de comportamento.** Toda alteração é condicionada a
   "estou na casca nativa". Os testes e os builds de container atuais continuam
   passando.
3. **Silos mantidos.** Os apps não importam um do outro (regra do `CLAUDE.md`).
   `nativo.ts` é byte-idêntico em `admin` e `patient`, como já é o
   `manifesto.ts`, e um teste guarda a igualdade.
4. **Push pelo ponto único.** Só `sendPatientPush` muda; `avisarPaciente` e as
   rotas não.
5. **Segredo não entra no repositório.** Chaves de assinatura, `.p8`,
   `google-services.json`, `GoogleService-Info.plist` ficam fora do git
   (segredos do GitHub Actions).

## 3. Estrutura

```
apps/patient/
  capacitor.config.ts        novo
  android/                   novo (gerado, versionado)
  ios/                       novo (gerado, versionado)
  resources/                 novo (ícone e abertura-fonte)
  src/lib/nativo.ts          novo — a única fronteira com o nativo
apps/admin/                  a mesma coisa
docs/nativo/                 estes documentos + guia de publicação
.github/workflows/apps-nativos.yml   novo
```

Scripts novos em cada app: `build:nativo` (build do Vite com
`VITE_BASE_PATH=/`, `VITE_API_URL` absoluta e `VITE_SITE_URL`) e
`cap:sync`. O `Dockerfile` e o deploy web não mudam; `android/` e `ios/`
entram no `.dockerignore`.

### 3.1 Contrato de `src/lib/nativo.ts`

```ts
export const ehNativo: boolean                       // estou na casca?
export const plataforma: 'ios' | 'android' | 'web'
export const URL_DO_SITE: string                     // VITE_SITE_URL ou window.location.origin
export function restaurarSessao(chave: string): Promise<void>  // sistema -> localStorage, antes do React
export function guardarSessao(chave: string, token: string): void   // localStorage + sistema
export function esquecerSessao(chave: string): void                 // idem, removendo
export function abrirExterno(url: string): void      // navegador do sistema no nativo; window.open na web
export function iniciarCasca(): void                 // voltar do Android, barra de status, esconder abertura
export function versaoDoApp(): Promise<string | null>
```

Na web todas as funções têm o comportamento de hoje (`guardarSessao` é só
`localStorage.setItem`). O código das telas continua lendo
`localStorage.getItem(TOKEN_KEY)` de forma síncrona — por isso a restauração
acontece **antes** de o React montar, e nenhuma tela precisa virar assíncrona.

### 3.2 Contrato da API

| Rota | Mudança |
|---|---|
| `POST /api/patient/push/subscriptions` | Aceita também `{ provider: 'FCM', token, platform: 'ios' \| 'android' }`. O formato web atual continua valendo |
| `DELETE /api/patient/push/subscriptions` (nova) | Corpo `{ token }`; chamada no logout para o aparelho parar de receber |
| `DELETE /api/patient/me` (nova) | Exige a senha atual. Remove acesso: zera `passwordHash`, revoga sessões, apaga inscrições de push. Mantém o registro clínico. Grava auditoria |
| `GET /api/app/versao` (nova, pública) | `{ patient: { minima }, admin: { minima } }`, lidas de `MIN_APP_VERSION_PATIENT` / `MIN_APP_VERSION_ADMIN` (padrão `0.0.0`) |
| CORS | `capacitor://localhost` e `https://localhost` somados a `CORS_ORIGIN` no deploy |

Banco: migração acrescentando `provider` (enum `PushProvider`: `WEBPUSH`,
`FCM`; padrão `WEBPUSH`) e `platform` (texto, opcional) a `PushSubscription`.
Para `FCM`, o token vai em `endpoint` (já único) e `keys` fica `{}`.

Envio: `firebase-admin`, inicializado só se `FIREBASE_SERVICE_ACCOUNT`
existir (mesmo padrão do `pushConfigured` atual: sem credencial, pula sem
erro). Token recusado como inválido é revogado, como já se faz no web push.
O wrapper CommonJS do `apps/api/Dockerfile` precisa enxergar a dependência
nova — lição do registro de 08/09: **o teste que vale é o build do container.**

## 4. Fases

### Fase 0 — Preparo (sem código de produto)

- Conferir a versão estável do Capacitor e o JDK que ela exige; instalar o JDK.
- Instalar **de uma vez** as dependências dos dois apps e da API (um único
  `npm install`, para o `package-lock.json` ter um só dono).
- Criar a branch `feat/apps-nativos`.
- Registrar as decisões D1–D5 (item 7) com os padrões, se você não tiver
  respondido.

### Fase 1 — Código web pronto para a casca (os dois apps, em paralelo)

Os 17 itens da tabela da análise (seção 4), por app. Em resumo:

- `nativo.ts` + teste de igualdade entre os dois apps.
- `standalone.ts`: `ehAplicativoInstalado()` verdadeiro na casca.
- `main.tsx`/`AdminApp.tsx`: restaurar sessão antes de montar; não registrar
  service worker nem trocar manifesto na casca; `iniciarCasca()`.
- Login/logout/401: `guardarSessao`/`esquecerSessao`.
- `window.open` → `abrirExterno`; URLs relativas → base da API / do site.
- Fontes hospedadas no bundle; sai o `<link>` do Google Fonts.
- Botões de conta demo fora do build nativo.
- Tela "Atualize o aplicativo" quando a versão for menor que a mínima.
- **Paciente:** push nativo (pedir permissão no mesmo ponto em que hoje se
  ativa o lembrete, registrar token, navegar ao tocar) e "Excluir minha conta"
  dentro de "Mais".
- **Médica:** `base` do Vite por variável; convite com URL pública; editor
  "Site" sem prévia ao vivo na casca.

Travas (testes de código-fonte, no padrão do repositório): nenhum
`window.open` fora de `nativo.ts`; nenhum `fetch('/api` cru; nenhum
`localStorage.setItem/removeItem(TOKEN_KEY` fora de `nativo.ts`.

### Fase 1b — API (em paralelo com a Fase 1)

Contrato do item 3.2: migração, push FCM, exclusão de conta, versão mínima,
CORS no workflow de deploy, checagem do `Cross-Origin-Resource-Policy`.
Testes: os de `segredos.test.ts` e `sincronia.test.ts` continuam passando;
novos para exclusão de conta (não apaga prontuário; exige senha; depois dela o
login falha) e para o despacho por provedor.

Atenção registrada no `CLAUDE.md`: a ativação de conta decide por
`existing?.passwordHash`. A exclusão zera esse campo de propósito — ler aquele
trecho antes, e usar `prismaAuth` onde o hash for lido.

### Fase 2 — Cascas nativas

- `capacitor.config.ts`, `cap add android`, `cap add ios` em cada app.
- Ícones e telas de abertura gerados a partir do ícone-fonte. A abertura
  nativa é só a cor de fundo + ícone; ela some e a abertura animada que já
  existe (`Splash.tsx`) assume — sem "duas aberturas".
- Android: voltar físico (volta no histórico; na raiz, sai), barra de status
  na cor do tema, permissões de câmera/arquivos, canal de notificação,
  versão mínima do Android.
- iOS: textos de permissão (câmera, fotos), capacidade de Push, orientação.
- Compilar o APK de depuração dos dois e **rodar no emulador**.
- iOS: gerar o projeto. Se não gerar no Windows, fica para o job macOS da
  Fase 3 — registrar, não contornar.

### Fase 3 — Build, assinatura e CI

`.github/workflows/apps-nativos.yml`, disparo manual e por tag
(`paciente-v*`, `medica-v*`):

- Job Android (ubuntu): build web → sync → AAB assinado → artefato; envio à
  faixa interna do Play quando houver credencial.
- Job iOS (macOS): build web → sync → arquivo assinado → TestFlight, com a
  chave da API do App Store Connect.
- Sem os segredos, os jobs compilam sem assinar e dizem o que falta — não
  falham em silêncio nem fingem sucesso.

### Fase 4 — Verificação (por quem não escreveu o código)

1. `npm test`, `npm run build`, `npm run check:encoding`.
2. Build dos **containers** de `web`, `admin`, `patient` e `api`.
3. `node scripts/auditar-sincronia.mjs` com banco descartável (a API mudou).
4. **Paridade visual:** emulador Android × PWA em modo app, mesma largura,
   tela a tela (paciente: todas; médica: papel a papel nas telas da barra e do
   "Mais"). Medir transbordo pelos elementos, não por `scrollWidth`. Subir a
   API de teste com `RATE_LIMIT_MAX` alto e reprovar tela que veio vazia.
5. Funcional no emulador: login, fechar e reabrir (sessão fica), sair, 401,
   abrir anexo, enviar anexo, WhatsApp, voltar físico em cada nível, girar a
   tela, teclado sobre campo, exclusão de conta.
6. Regressão web: os dois PWAs no navegador, com e sem `?app=1`.

### Fase 5 — Lojas (com você)

Guia em `docs/nativo/PUBLICACAO.md`, escrito na Fase 3: textos de loja,
respostas dos formulários de privacidade, nota ao revisor, lista de capturas,
passo a passo de TestFlight → revisão e teste interno → produção.

### Opcional, depois da paridade

- O1 — Desbloqueio por biometria no app da médica (prontuário no bolso).
- O2 — Push para a equipe (pedido novo de horário, mensagem de paciente).
- O3 — Corrigir o push web (listener `push`/`notificationclick` nos `sw.js`).
- O4 — Sessão longa com renovação de token.
- O5 — Atualização de telas sem passar pela loja (OTA).

## 5. O que só você pode fazer

| # | Item | Trava o quê |
|---|---|---|
| U1 | Confirmar identificadores e nomes (D1) | Fase 2 (usa-se o padrão; trocar depois de publicar é impossível) |
| U2 | Projeto Firebase + `google-services.json` + `GoogleService-Info.plist` + conta de serviço | Push (o app funciona sem; só não notifica) |
| U3 | Chave APNs `.p8` cadastrada no Firebase | Push no iOS |
| U4 | Chave da API do App Store Connect; certificado/perfil de distribuição | Envio ao TestFlight |
| U5 | Keystore de upload do Android + conta de serviço do Play | Envio ao Play |
| U6 | CORS do bucket S3 para `capacitor://localhost` e `https://localhost` | Envio de anexo pelo app |
| U7 | Política de privacidade publicada | Envio às lojas |
| U8 | Contas de revisão em produção (paciente fictícia; equipe fictícia) | Revisão |
| U9 | Um iPhone e um Android reais para o teste final | Aprovação do critério de pronto |
| U10 | Dizer se há um Mac disponível | Só simplifica a Fase 3 |

## 6. Regra nova para o `CLAUDE.md` (entra ao fim da implementação)

- A API passa a ter clientes que não se atualizam junto com o deploy:
  **mudança de rota precisa ser compatível com a versão anterior do app**, ou
  vir acompanhada de aumento da versão mínima.
- `nativo.ts` é par byte-idêntico em `admin` e `patient`, como `manifesto.ts`.
- Mudança de tela chega à web no deploy e aos apps só na próxima versão de loja.
- Como compilar, como publicar, onde ler o log do CI dos apps.

## 7. Decisões pendentes (com o padrão que será usado se você não responder)

| | Decisão | Padrão |
|---|---|---|
| D1 | Identificadores e nomes | Os da tabela do item 1 |
| D2 | App da médica público ou não listado | Não listado |
| D3 | Push por Firebase nos dois sistemas | Sim |
| D4 | Editor "Site" sem prévia ao vivo no app | Sim |
| D5 | Biometria na médica já na primeira versão | Não (O1) |

## 8. Ordem e dependências

```
Fase 0 ─┬─ Fase 1 paciente ─┐
        ├─ Fase 1 médica  ──┼─ Fase 2 ─ Fase 3 ─ Fase 4 ─ Fase 5 (você)
        └─ Fase 1b API ─────┘
```

Fases 1, 1 e 1b não se tocam (pastas diferentes) e rodam juntas. A partir da
Fase 2 é sequencial. Nada depende dos itens U2–U8 para ficar pronto e provado
no emulador; eles só travam push real e envio às lojas.
