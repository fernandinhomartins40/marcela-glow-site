# Apps nativos (iOS e Android) — Análise

Data: 14/11/2026 · Base: commit `6d6516b` · Documento 1 de 3
(seguem `02-PLANO-DE-IMPLEMENTACAO.md` e `03-EXECUCAO-AGENTES-OPUS.md`).

## 1. Resumo

- **Recomendação: Capacitor.** Os dois PWAs viram dois apps nativos
  (projeto Xcode + projeto Android Studio, publicados nas lojas) que carregam
  **o mesmo código React de hoje** dentro de uma casca nativa. É a única rota
  em que "mesmo design, mesmo layout, tudo igual" é verdade **por construção**,
  e não por esforço de cópia.
- **Os PWAs já têm um "modo aplicativo" pronto**: barra inferior, abertura
  animada, respeito ao entalhe, zoom desligado. Ele é ligado por
  `ehAplicativoInstalado()`. Fazer essa função responder "sim" dentro da casca
  nativa acende tudo isso sem redesenhar uma tela.
- **O trabalho real não é visual.** É: (a) desfazer as suposições de "estou
  servido pelo mesmo domínio da API"; (b) trocar o push web pelo push nativo;
  (c) cumprir as exigências das lojas (exclusão de conta, privacidade, contas
  de revisão); (d) montar o build e a publicação, sendo que **iOS não compila
  no Windows**.
- **Achado fora do pedido:** o push do PWA hoje não chega a aparecer para a
  paciente (item 5.1). No app nativo isso se resolve de qualquer forma.

## 2. O que existe hoje (medido)

| | Portal da paciente (`apps/patient`) | Painel da médica (`apps/admin`) |
|---|---|---|
| Endereço | `/paciente/` | `/admin/` |
| Stack | Vite + React 18 + Tailwind (tokens HSL) | Vite + React 18 + CSS próprio (`styles.css`, 3.197 linhas, tokens hex) |
| Tamanho | ~4,5 mil linhas | ~20 mil linhas |
| Telas | Login/cadastro, Início, Consultas, Jornada (+ detalhe), Documentos, Mensagens | Login, Hoje, Agenda, Recepção, Atender, Pacientes, Financeiro/Caixa, Documentos, Cadastros, Leads, Site (CMS), Equipe, Ajustes |
| Navegação "modo app" | Barra inferior: Início, Consultas, **Jornada**, Documentos, Mais | Barra inferior: Hoje, Agenda, **Atender**, Pacientes, Mais |
| Sessão | JWT de 7 dias em `localStorage` (`patient_token`) | JWT de 7 dias em `localStorage` (`admin_token`) |
| Push | Web Push/VAPID (só inscrição; ver 5.1) | Não tem |
| Offline | Service worker guarda a casca; API nunca é cacheada | Idem |
| Dependências de UI | lucide-react, date-fns, react-query, axios | as mesmas + recharts |

Total nos dois apps: 25.187 linhas de TS/TSX/CSS (testes incluídos).
Os dois têm responsivo validado de 375 a 1280px (registro de 23/09 no
`CLAUDE.md`), o que cobre celular e tablet.

Identidade já disponível no repositório: ícones `app-icon-medica-nude.png`
(paciente) e `app-icon-medica-brown.png` (médica), monogramas, cores de tema
`#6f4f45`/`#fff8f1` (paciente) e `#17201b`/`#f6f2ec` (médica), nomes
"Minha Jornada" e "Marcela CRM" nos manifestos.

## 3. Decisão de arquitetura

| Caminho | Visual idêntico? | Custo | Veredito |
|---|---|---|---|
| **Capacitor** (casca nativa + o React atual, empacotado dentro do app) | Sim, por construção: é o mesmo HTML/CSS | Baixo: ~1 arquivo novo por app, ajustes pontuais, projetos nativos gerados | **Recomendado** |
| React Native / Expo | Não. Reescrever 25 mil linhas; o CSS de 3.197 linhas, o editor de texto rico, o kanban de arrastar e os gráficos não têm equivalente direto. Ficaria "parecido" depois de meses, e passaria a existir em dobro | Muito alto, permanente (dois códigos para manter) | Rejeitado |
| Swift + Kotlin puros | Não, pelo mesmo motivo, vezes dois | Altíssimo | Rejeitado |
| TWA (Android) / atalho de Safari | Android apenas; no iOS não é app de loja | — | Não atende |
| Capacitor apontando para o site (`server.url`) | Sim | Mínimo | Rejeitado: é "site embrulhado", o caso clássico de recusa da Apple (diretriz 4.2), e não abre sem rede |

"Nativo" aqui significa: binário próprio assinado, publicado na App Store e no
Google Play, com push nativo (APNs/FCM), ícone, tela de abertura, botão voltar
do Android, armazenamento do sistema. A interface é desenhada pelo motor web
do sistema — é isso que garante o visual idêntico.

**Risco conhecido dessa escolha — diretriz 4.2 da Apple (funcionalidade
mínima).** A Apple recusa app que é só um site. Mitigações, todas no plano:
código empacotado no app (não carregado de URL), push nativo, navegação de
app (já existe), botão voltar/gestos, exclusão de conta dentro do app. Para o
app da médica há ainda a saída de **distribuição não listada** (item 7).

**Consequência a aceitar:** como o código vai dentro do binário, mudança de
tela passa a exigir nova versão na loja (revisão de 1–3 dias na Apple). A API
continua sendo publicada como hoje — por isso ela **não pode mais quebrar
contrato** com versões antigas do app, e o plano inclui um aviso de "atualize
o aplicativo".

**Os PWAs não morrem.** O mesmo código continua servindo `/paciente/` e
`/admin/` na web. A médica segue usando o painel no computador; a paciente que
não instalar o app segue entrando pelo navegador. Aposentar a instalação PWA é
decisão posterior, sem custo técnico.

## 4. O que impede o código atual de rodar dentro da casca

Dentro do app a página é servida de `capacitor://localhost` (iOS) ou
`https://localhost` (Android), não de `www.dramarceladuch.com.br`. Tudo que
supõe "mesma origem" quebra. Lista completa, levantada por busca nos dois apps:

| # | Onde | Problema | Correção |
|---|---|---|---|
| 1 | `apps/patient/src/lib/api.ts:3`, `apps/admin/src/lib/ui.tsx:31` | `baseURL` cai em `/api` relativo | Build nativo com `VITE_API_URL=https://www.dramarceladuch.com.br/api` (a variável já existe) |
| 2 | `Splash.tsx:70` e `lib/manifesto.ts:22` (nos dois apps) | `fetch('/api/landing/manifest/…')` cru, relativo | Splash usa a base da API; `usarManifestoDaClinica` não roda no nativo (não há manifesto a trocar) |
| 3 | `apps/api/src/index.ts` (CORS) | Em produção só aceita as origens de `CORS_ORIGIN` | Acrescentar `capacitor://localhost` e `https://localhost`. Não enfraquece nada: a API autentica por token Bearer, não por cookie |
| 4 | `apps/api/src/index.ts` (`helmet()`) | O padrão do helmet manda `Cross-Origin-Resource-Policy: same-origin`; imagem servida **pela API** e usada em `<img>` seria bloqueada na casca | Verificar se alguma imagem vem de rota da API (ícones do manifesto, logos); se vier, liberar nessas rotas |
| 5 | Bucket S3 | Upload por URL assinada (`axios.put` em `ui.tsx:349`) é requisição entre origens | Regra de CORS do bucket precisa aceitar as duas origens novas — **ação de infraestrutura** |
| 6 | `apps/admin/vite.config.ts` | `base: '/admin/'` fixo | Ler `VITE_BASE_PATH` com padrão `/admin/`; build nativo usa `/` |
| 7 | `main.tsx` / `AdminApp.tsx` | Registram service worker | Não registrar no nativo (os arquivos já são locais) |
| 8 | `lib/standalone.ts` (dois apps) | Detecta "instalado" por `display-mode`, `navigator.standalone`, `?app=1` — nenhum vale na casca | Acrescentar a detecção nativa. **É a mudança que acende o layout de app inteiro** |
| 9 | `localStorage` com o token (7 pontos de escrita/remoção) | No iOS o sistema pode limpar o armazenamento web sob pressão de espaço → logout "sozinho" | Espelhar o token no armazenamento do sistema e restaurar antes do React montar |
| 10 | `window.open(url, '_blank')` — `sections.tsx:235`, `NewAppointment.tsx:93`, `Reception.tsx:248`, `Schedule.tsx:409`, `ui.tsx:778` | Download de anexo, link de WhatsApp: comportamento de `window.open` na casca varia por plataforma | Um `abrirExterno(url)` único, que usa o navegador do sistema no nativo |
| 11 | `Team.tsx:427` | Link de convite montado com `window.location.origin` → viraria `capacitor://localhost/convite/…` | Usar a URL pública do site |
| 12 | `ErrorBoundary.tsx:73` (admin) | `window.location.href = '/admin/'` | Usar a base do build |
| 13 | `Landing.tsx:286` | `href="/"` ("ver o site") | URL pública do site, por `abrirExterno` |
| 14 | `landing/PreviaAoVivo.tsx` | Embute `/previa` em iframe e conversa por `postMessage`; o site **só aceita mensagem do próprio domínio** (trava de segurança em `previa.test.ts`) | **Não afrouxar a trava.** No nativo o editor "Site" fica sem a prévia ao vivo, com botão "abrir o site". Editar a landing é tarefa de computador |
| 15 | `index.html` (dois apps) | Fontes pelo Google Fonts; no PWA o service worker as guarda, na casca não | Hospedar as fontes no próprio bundle (vale também para a web) |
| 16 | `api.ts:185-195` | `enablePushNotifications` usa `PushManager` | Push nativo (item 5) |
| 17 | `Login.tsx` dos dois apps | Botões "Paciente demo", "Admin demo", "Equipe demo" com senha escrita no código | Fora do build nativo. E **conferir se essas contas existem em produção** — se existirem, é problema hoje, não só no app |

O que **não** precisa mudar (conferido): roteamento por `BrowserRouter` (a
casca devolve o `index.html` para rotas internas), `input type="file"`
(galeria/câmera funcionam; pede só as declarações de permissão), editor de
texto rico, arraste do kanban (eventos de ponteiro), gráficos, `safe-area`
(o `viewport-fit=cover` já está posto), o `reload()` do 401.

## 5. Push

### 5.1 Estado atual (achado)

A API envia Web Push (`apps/api/src/lib/push.ts`, biblioteca `web-push`) e o
portal inscreve o navegador. Mas **nenhum dos dois `sw.js` tem listener de
`push` nem de `notificationclick`** (verificado por busca nos dois arquivos).
Sem esse listener o navegador recebe a mensagem e não tem o que mostrar. Ou
seja: pelo código, o lembrete no celular da paciente não aparece hoje; o que
ela vê é só o aviso dentro do portal. Não testei em aparelho — é leitura do
código, vale confirmar. Se o push web ainda importar depois dos apps, a
correção é pequena e está no plano como item opcional.

### 5.2 No nativo

- Android usa FCM; iOS usa APNs. Proposta: **Firebase Cloud Messaging nos
  dois** (o Firebase repassa ao APNs), para a API ter um único caminho de
  envio (`firebase-admin`).
- A tabela `PushSubscription` já tem `subjectType` e `endpoint` único. Basta
  uma coluna `provider` (`WEBPUSH` | `FCM`, padrão `WEBPUSH`) e guardar o token
  do aparelho em `endpoint`. `sendPatientPush` passa a despachar por provedor;
  `avisarPaciente` — o ponto único criado na auditoria de 08/09 — não muda, e
  é por isso que nenhuma rota precisa ser tocada.
- Toque na notificação: a API já manda `url: '/paciente/…'`; o app tira o
  prefixo e navega.
- **Push para a equipe não existe hoje** e fica fora da primeira versão
  (paridade primeiro). A modelagem acima já comporta.

Exige de você: projeto Firebase, chave APNs (`.p8`) da conta Apple cadastrada
no Firebase, e os arquivos `google-services.json` / `GoogleService-Info.plist`.

## 6. Exigências das lojas que o sistema ainda não cumpre

| Exigência | Situação | O que falta |
|---|---|---|
| **Exclusão de conta dentro do app** (Apple 5.1.1(v); o Google exige também uma página web para isso) | O portal permite criar conta (`/patient/auth/register`) e **não tem** exclusão | Rota + tela. Prontuário tem guarda legal obrigatória (CFM): a exclusão remove o **acesso** (senha, sessões, tokens de push) e informa claramente que o registro clínico é mantido por obrigação legal. O estado resultante é o que já existe para "paciente cadastrada pela clínica, sem acesso ao portal" |
| Política de privacidade em URL pública | Não localizei no levantamento | Confirmar/criar página no site |
| Conta de demonstração para o revisor | Existem contas demo no seed | Criar contas de revisão **em produção**, com dados fictícios, e informá-las às lojas — nunca no código |
| Formulários de dados (Apple "Privacy Nutrition Labels", Google "Data safety" e declaração de app de saúde) | — | Preencher: dados de saúde, contato, identificadores; sem rastreamento, sem anúncios |
| Declarações de permissão (câmera, fotos, notificações) | — | Textos em português nos projetos nativos |
| Nível de API alvo do Android | — | O exigido pelo Play na data do envio |

## 7. Distribuição

- **Paciente:** público nas duas lojas.
- **Médica:** é ferramenta interna de uma clínica. Recomendo **app não listado
  na Apple** (link direto, não aparece na busca; pede-se à Apple depois de
  aprovado) e **teste fechado ou faixa de produção restrita no Google**. Menos
  exposição, e o revisor entende que é ferramenta de trabalho. Decisão sua.
- Identificadores sugeridos (irreversíveis depois de publicar — confirme):
  `br.com.dramarceladuch.paciente` e `br.com.dramarceladuch.medica`.

## 8. Ambiente de build

Medido nesta máquina (Windows 11):

- Android SDK instalado (`%LOCALAPPDATA%\Android\Sdk`, com emulador e imagens).
- **JDK 17.** O Capacitor atual (8.6.2 no npm hoje) pede versão mais nova —
  conferir a exigida e instalar antes de compilar o Android.
- Node 24.
- **iOS não compila no Windows.** Precisa de um Mac ou de CI com máquina
  macOS (GitHub Actions `macos-latest`, que o repositório já tem como
  plataforma de deploy). O plano assume CI; se você tiver um Mac, simplifica.
  Consequência honesta: **nesta máquina dá para provar o Android no emulador;
  o iOS só se prova no CI e em aparelho/TestFlight.**

## 9. Riscos

| Risco | Chance | Efeito | Resposta |
|---|---|---|---|
| Apple recusar por 4.2 | Média | Atraso | Mitigações do item 3; nota ao revisor explicando o uso clínico; médica como não listado |
| Projeto iOS não gerar/sincronizar no Windows | Média | Bloqueia iOS local | Gerar no job macOS do CI |
| Diferença de renderização entre o motor web do aparelho e o Chrome | Baixa | Detalhe visual | Comparação de capturas emulador × PWA em modo app (no plano) |
| WebView antigo em Android velho | Baixa | CSS moderno falha | Fixar versão mínima do Android/WebView |
| API mudar e app antigo quebrar | Média, permanente | Paciente com tela de erro | Aviso de versão mínima + regra de compatibilidade no `CLAUDE.md` |
| CORS do bucket não ajustado | Alta se esquecido | Upload de anexo falha só no app | Item de verificação obrigatório, em aparelho |
| Sessão de 7 dias | Certa | Login semanal incomoda em app | Fora do escopo (pediria refresh token); registrar como evolução |

## 10. O que esta análise não cobriu

- Não executei nada em aparelho nem no emulador; tudo acima vem de leitura e
  busca no código, mais a medição do ambiente.
- Não conferi se as contas demo existem em produção, nem a configuração de
  CORS do bucket, nem se há política de privacidade publicada.
- Não li tela a tela do painel procurando gesto que conflite com os do
  sistema (ex.: voltar por arrasto da borda no iOS × gaveta/kanban) — está
  como item de verificação em aparelho.
