# Apps nativos — Decisões

Registro das decisões tomadas na implementação. As D1–D5 vêm do item 7 do
plano (`02-PLANO-DE-IMPLEMENTACAO.md`); o usuário não alterou nenhum padrão.

| | Decisão | Valor em uso | Origem |
|---|---|---|---|
| D1 | Identificadores e nomes | `br.com.dramarceladuch.paciente` — "Minha Jornada"; `br.com.dramarceladuch.medica` — "Marcela CRM" | Padrão do plano. **Irreversível depois de publicar** — confirmar antes do primeiro envio (U1) |
| D2 | App da médica público ou não listado | Não listado (Apple) / restrito (Google) | Padrão |
| D3 | Push por Firebase nos dois sistemas | Sim — `@capacitor-firebase/messaging` no app, `firebase-admin` na API | Padrão |
| D4 | Editor "Site" sem prévia ao vivo no app | Sim | Padrão |
| D5 | Biometria na médica na primeira versão | Não (fica O1) | Padrão |

## Decisões da execução

- **Capacitor 8.6.2** (estável em 14/11/2026). Exige **JDK 21**: o padrão da
  máquina é o 17, mas há um JDK 21 em `%USERPROFILE%\.jdks\jdk-21.0.13.0.2+1`;
  os builds Android usam `JAVA_HOME` apontado para ele. Não foi preciso instalar nada.
- **`firebase` fixado em `^12.6.0`**, não no 13 (o mais novo): é o que o
  `@capacitor-firebase/messaging@8.6.0` declara como par.
- **`patient` e `admin` ganharam script `test`** (`vitest run`). Os testes
  deles existiam, mas não entravam no `npm test` da raiz — o portão de cada
  onda não os veria.
- **`iniciarCasca()` lê a cor da barra de status da `<meta name="theme-color">`**
  de cada app. Assim `nativo.ts` continua sem parâmetro e byte-idêntico.
  No Android 15+ o Capacitor 8 é sempre edge-to-edge e `setBackgroundColor`
  não tem efeito: a página desenha sob a barra, como no PWA do iOS.
- **Voltar do Android usa `canGoBack` do evento `backButton`** (histórico da
  WebView) em vez de `history.length > 1`: é o mesmo critério, dado pela casca.
- **npm 11 não roda scripts de instalação sem aprovação** (`allowScripts`).
  Afeta o `prisma generate` local: rodar `npm run db:generate -w @marcela/database`
  depois do install. O container não é afetado (Node 20 / npm 10).

## Decisões tomadas com o usuário

- **14/11/2026 — Ativação do portal passa a exigir prova do e-mail (opção a).**
  O agente C provou por HTTP, em banco descartável, que `POST /patient/auth/register`
  dava sessão a quem soubesse só o e-mail de uma paciente cadastrada pela
  clínica e sem senha — e com ela o painel (consultas, sessões, planos). Já
  acontecia em produção, e a exclusão de conta (exigência das lojas) devolveria
  contas a esse estado. Escolhido pelo usuário entre: (a) ativar por link no
  e-mail; (b) só marcar contas excluídas; (c) só por convite da clínica.
  Estendido pelo orquestrador ao **e-mail novo**: sem a prova, quem criasse
  acesso com o e-mail de outra pessoa receberia os pedidos de horário pendentes
  dela e o que a clínica cadastrasse depois. Contrato: register → 202 sem token
  + e-mail com `/paciente/?ativar=<token>`; `POST /patient/auth/activate`
  conclui e loga. **É a única mudança de comportamento da web nesta implementação.**
  Depende de SMTP configurado em produção: sem ele, o cadastro responde 503.

## Decisões dos agentes, aceitas pelo orquestrador

- **Imagem da API em Node 22** (era 20): `firebase-admin@14` declara
  `engines: node >=22`. Os fronts seguem em Node 20.
- **Token de aparelho reinscrito por outra paciente passa a ela**, e `DELETE`
  de token alheio responde 204 sem apagar (não revela a dona). O token
  identifica o aparelho; manter a dona antiga mandaria avisos de saúde dela ao
  celular de outra pessoa.
- **Canal de notificação Android: `avisos`.**
- `FIREBASE_SERVICE_ACCOUNT` recebe o conteúdo do JSON da conta de serviço em
  uma linha. Malformada, só o push nativo desliga; a API sobe.
- **`abrirExterno` na web usa `noopener,noreferrer`** (antes, só `noopener` em
  alguns pontos). Links de WhatsApp e anexo (URL assinada) saem sem referrer —
  nada que o destino precisasse; aceito em vez de duplicar a função.
- **Senhas das contas demo fora do bundle nativo**: o ramo some no build com
  `--mode nativo`; na web continuam como antes (U8 / item 17 da análise).
- **Gerar ícones sempre com `--android --ios`**: sem as plataformas, o
  `@capacitor/assets` apaga `public/icon.svg` e reescreve o manifesto do PWA.
- **Barra de status em WebView < 140**: o Capacitor 8 não desenha de borda a
  borda e deixa faixas com a cor da janela; com ícones claros (`Style.Dark`) o
  relógio some. Tratado na fase das cascas (ver abaixo).
- **Testes falham quando o shell está em `c:` minúsculo** (caminho que o VS Code
  passa ao Git Bash): o Vitest carrega o executor duas vezes, uma por grafia do
  drive, e o `describe` quebra com "reading 'config'". Não é defeito de código:
  pelo `npm test` da raiz (turbo) e pelo PowerShell (`C:`) passam. Rodar de `C:\`.
- **Paciente sem permissão de câmera no Android**: o portal não tem
  `input type=file`; declarar faria a loja anunciar acesso à câmera.
- **O link de ativação abre no navegador, não no app** (sem deep link): a
  paciente ativa pela web e entra no app com a senha. Deep link fica para depois.
- **`vite.config.ts` decide a base nativa por argumento** (`--base /` no admin,
  `--mode nativo` no paciente): a forma `defineConfig(({ mode }) => …)` quebrava
  o Vitest 4. Os dois apps chegaram a soluções diferentes para o mesmo
  problema; ambas mantêm o padrão web (`/admin/`, `VITE_BASE_PATH` no paciente).

## Onda 2 (agente D) — build pelo GitHub Actions

- **Build só no GitHub Actions** (pedido da usuária, para não travar o computador): `.github/workflows/apps-nativos.yml` gera, por app, AAB, APK, APK de teste local e IPA (ou `.xcarchive` sem assinatura quando faltam os segredos da Apple), guardados 30 dias para baixar. Envio às lojas só com a opção ligada no disparo manual e o segredo presente.
- **Versão:** `-PversaoApp` (da tag ou do disparo) e `-PbuildApp` = `run_number`.
- **Assinatura iOS só automática**, pela chave da API do App Store Connect (`-allowProvisioningUpdates`): é o caminho sem Mac e sem `.p12`. Não provado até o primeiro envio.
- **Barra de status no WebView < 140:** fundo da janela em `MainActivity` (`ColorDrawable`) pinta o recuo com a cor do tema. Provado no emulador (API 35, WebView 124) antes da mudança de rumo.
- **Versão de teste (`build:nativo:teste`, `CAP_TESTE_LOCAL=1`):** `allowMixedContent` e HTTP só para `10.0.2.2`, este só no APK de depuração; o `build.gradle` recusa release com config de teste sincronizado. Provado por inspeção do APK de release (sem `networkSecurityConfig`); a recusa não foi exercitada.
- **Política de privacidade não existe** (link do rodapé é `#`): bloqueia as duas lojas. Pendência da usuária (U7).
