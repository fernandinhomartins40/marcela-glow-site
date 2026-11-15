# Apps nativos — Execução com agentes (para o Opus 5.5)

Documento 3 de 3. Você é o **orquestrador**. Leia antes, nesta ordem:
`CLAUDE.md` (raiz), `docs/nativo/01-ANALISE.md`,
`docs/nativo/02-PLANO-DE-IMPLEMENTACAO.md`. O plano diz **o quê**; este
documento diz **quem faz, em que ordem, e como se prova**.

## 1. Missão

Transformar `apps/patient` e `apps/admin` em apps nativos iOS/Android com
Capacitor, **sem mudar uma tela** e sem mudar o comportamento da web. Pronto é:
APK de depuração dos dois apps rodando no emulador com paridade visual
comprovada contra o PWA em modo aplicativo, API estendida e testada, CI de
build escrito, guia de publicação escrito. Envio às lojas não é seu — depende
de segredos do usuário.

## 2. Regras que valem para você e para todo agente

1. **Conversa, commits e comentários em pt-BR** (regra do `CLAUDE.md`).
2. **Só o orquestrador roda `npm install` e só o orquestrador faz commit.**
   O `package-lock.json` é um só para o monorepo; dois agentes instalando em
   paralelo o corrompem. Agente que precisar de dependência nova para e avisa.
3. **Cada agente só escreve nas pastas que são dele** (tabela do item 4).
   Precisou tocar fora: para e avisa.
4. **Os apps são silos**: `admin` não importa de `patient` nem o contrário.
   `nativo.ts` é copiado, byte-idêntico.
5. **A web não muda.** Todo comportamento novo fica atrás de `ehNativo`.
6. **Não afrouxar trava de segurança existente**: a origem aceita pela prévia
   (`previa.test.ts`), o recorte de campos sensíveis (`segredos.test.ts`), as
   permissões por papel. Se uma trava atrapalha, o recurso sai do app nativo —
   a trava fica.
7. **Não inventar API de biblioteca.** A versão do Capacitor é a estável do
   dia (`npm view @capacitor/core version`); ler a documentação dessa versão
   antes de usar plugin. Onde este documento cita nome de função de plugin,
   trate como indicação e confirme.
8. **Segredo nunca no git**: `google-services.json`,
   `GoogleService-Info.plist`, keystore, `.p8`, conta de serviço. Entram no
   `.gitignore` antes de existirem.
9. **Relato fiel.** Agente relata o que executou e o que só leu. "Compilou" e
   "rodou no emulador" são afirmações diferentes. O que não deu para verificar
   é dito com essas palavras.
10. **Não use `graphify query` em linguagem natural**; use `explain`,
    `affected`, `path`. Para rota HTTP, busca pela string nos quatro apps.
11. Nada de `git push`, nada de deploy, nada de tocar na VPS.

## 3. Fase 0 — você mesmo, sem agentes

1. `git checkout -b feat/apps-nativos`.
2. Descobrir a versão estável do Capacitor e o JDK exigido. A máquina tem
   JDK 17 e Android SDK em `%LOCALAPPDATA%\Android\Sdk`. Se o JDK não servir,
   **pare e peça ao usuário para instalar** — não é passo contornável.
3. Um único `npm install` com tudo:
   - nos dois apps: `@capacitor/core`, `@capacitor/app`,
     `@capacitor/preferences`, `@capacitor/browser`,
     `@capacitor/splash-screen`, `@capacitor/status-bar`, e os pacotes
     `@fontsource/*` das três famílias usadas no `index.html` (Cormorant
     Garamond, Playfair Display, Inter); dev: `@capacitor/cli`,
     `@capacitor/assets`, `@capacitor/android`, `@capacitor/ios`;
   - só no paciente: o plugin de push que entregue **token FCM nos dois
     sistemas** (hoje: `@capacitor-firebase/messaging` + `firebase`; confirmar);
   - na API: `firebase-admin`.
   Todos os `@capacitor/*` no mesmo major.
4. Escrever `src/lib/nativo.ts` (contrato no item 3.1 do plano) **uma vez**,
   copiar para os dois apps, e criar `apps/patient/src/nativo.test.ts` que
   compara os dois arquivos byte a byte. Rodar o teste.
   Detalhes do arquivo:
   - `restaurarSessao`: se nativo, lê a chave do armazenamento do sistema e
     grava no `localStorage`; na web não faz nada.
   - `iniciarCasca`: botão voltar do Android (`history.length > 1` → volta;
     senão sai do app), cor da barra de status, esconder a abertura nativa.
   - `abrirExterno`: navegador do sistema no nativo; na web,
     `window.open(url, '_blank', 'noopener,noreferrer')`.
5. `.gitignore` e `.dockerignore`: segredos do item 2.8; `android/` e `ios/`
   fora do contexto do Docker (não do git).
6. Gravar `docs/nativo/DECISOES.md` com D1–D5 do plano e o valor em uso.
7. Rodar `npm test` e `npm run build` para ter a linha de base **antes** dos
   agentes. Commit: `chore: prepara dependencias e fronteira nativa dos apps`.

## 4. Agentes

Cinco agentes, no máximo três ao mesmo tempo. Todos `general-purpose`, mesmo
modelo do orquestrador. Sem worktree: as pastas não se sobrepõem.

| Onda | Agente | Escreve em | Não toca |
|---|---|---|---|
| 1 | **A — paciente** | `apps/patient/**` | resto |
| 1 | **B — médica** | `apps/admin/**` | resto |
| 1 | **C — API** | `apps/api/**`, `packages/database/**`, bloco de CORS de `.github/workflows/deploy-production.yml`, `.env.example`, `docker-compose*.yml` (só variáveis novas) | resto |
| 2 | **D — build e lojas** | `.github/workflows/apps-nativos.yml`, `docs/nativo/PUBLICACAO.md`, `apps/*/android/**`, `apps/*/ios/**` (só assinatura/versão) | `src/` dos apps |
| 3 | **E — verificador** | `docs/nativo/VERIFICACAO.md`, pasta de rascunho | todo o código (só leitura) |

`apps/*/src/lib/nativo.ts` é do orquestrador. Agente que precisar mudar o
contrato pede; você altera e recopia para os dois.

Depois de cada onda: você lê os relatos, roda `npm test`, `npm run build`,
`npm run check:encoding`, olha o `git diff --stat` procurando escrita fora da
pasta do agente, e faz o commit da onda. Onda reprovada volta para o mesmo
agente (continuar a conversa com ele, não criar outro).

### 4.1 Texto comum (cole no início de todo briefing)

> Você trabalha no monorepo `marcela-glow-site`. Leia `CLAUDE.md`,
> `docs/nativo/01-ANALISE.md` e `docs/nativo/02-PLANO-DE-IMPLEMENTACAO.md`
> antes de qualquer edição. Regras: tudo em pt-BR; você **não** roda
> `npm install` nem faz commit; só escreve nas pastas listadas abaixo; não
> altera `src/lib/nativo.ts` (peça a mudança no relato); a web não pode mudar
> de comportamento — o que for novo fica atrás de `ehNativo`; não afrouxe
> nenhuma trava de segurança existente; confirme na documentação a API de
> qualquer plugin antes de usar. Ao terminar, relate: arquivos alterados; o
> que você **executou** e com que resultado; o que só leu; o que não conseguiu
> verificar; pendências. Não diga que algo funciona se você não o rodou.

### 4.2 Agente A — paciente

Pasta: `apps/patient/**`.

Tarefas:
1. `standalone.ts`: `ehAplicativoInstalado()` devolve verdadeiro quando
   `ehNativo`. Conferir que isso aciona a barra inferior e a classe
   `modo-aplicativo`.
2. `main.tsx`: `await restaurarSessao(TOKEN_KEY)` antes do
   `ReactDOM.createRoot`; não registrar service worker nem chamar
   `usarManifestoDaClinica` quando `ehNativo`; chamar `iniciarCasca()`.
3. `lib/api.ts` e `pages/Login.tsx`: todo `localStorage.setItem/removeItem`
   do token vira `guardarSessao`/`esquecerSessao`. A leitura síncrona fica.
4. `sections.tsx:235`: `window.open` → `abrirExterno`.
5. `Splash.tsx:70`: o `fetch('/api/…')` cru passa a usar a base da API.
   Conferir se o `src` dos ícones que voltam do manifesto é relativo; se for,
   resolver contra a origem da API.
6. Procurar outras URLs relativas vindas da API usadas em `<img>`/`<a>`.
7. Fontes: importar os `@fontsource` em `main.tsx` com exatamente os pesos e
   itálicos do `<link>` atual; remover o `<link>` e os `preconnect` do
   `index.html`. Conferir na web que a tipografia não mudou.
8. `Login.tsx`: o botão "Paciente demo" não aparece quando `ehNativo`.
9. Push nativo em `lib/api.ts`: `enablePushNotifications` ganha o ramo
   nativo — pedir permissão, obter o token FCM,
   `POST /patient/push/subscriptions` com
   `{ provider: 'FCM', token, platform }`. No logout,
   `DELETE /patient/push/subscriptions` com o token. Ao tocar na notificação,
   ler `url`, tirar o prefixo `/paciente` e navegar pelo roteador. Sem os
   arquivos do Firebase o app tem de abrir e funcionar normalmente — o push
   falha com a mensagem que já existe ("Lembretes ainda não estão
   disponíveis").
10. Exclusão de conta: item em "Mais" → tela/folha que explica, com as
    palavras do plano (o acesso é removido; o registro clínico é mantido por
    obrigação legal), pede a senha e chama `DELETE /patient/me`. Depois,
    `logout()`. Vale também na web. Usar os componentes de `components/ui.tsx`
    e o padrão visual do `RequestCare`/folha do "Mais" — sem estilo novo.
11. Versão mínima: na abertura, se `ehNativo`, comparar `versaoDoApp()` com
    `GET /app/versao`; menor → tela "Atualize o aplicativo" com botão para a
    loja. Falha de rede não bloqueia.
12. `package.json`: scripts `build:nativo` e `cap:sync`.
    `capacitor.config.ts` com o identificador de `DECISOES.md`, `webDir: 'dist'`.
    `npx cap add android`; `npx cap add ios` (se falhar no Windows, relate o
    erro exato e siga). Ícone e abertura com `@capacitor/assets` a partir de
    `src/assets/brand/app-icon-medica-nude.png`, fundo `#fff8f1`.
13. Android: permissões (câmera, notificações), cor da barra de status
    `#6f4f45`. iOS: textos de permissão em pt-BR no `Info.plist`.
14. Travas em `apps/patient/src/nativo-uso.test.ts` (teste de código-fonte):
    nenhum `window.open(` fora de `lib/nativo.ts`; nenhum `fetch('/api`;
    nenhum `localStorage.setItem(TOKEN_KEY`/`removeItem(TOKEN_KEY` fora de
    `lib/nativo.ts`. **Verificar que cada um falha** revertendo uma correção.
15. Provar: `npm run build -w @marcela/patient` (web, base `/paciente/`) e
    `build:nativo`; `cap sync android`; `gradlew assembleDebug`.

### 4.3 Agente B — médica

Pasta: `apps/admin/**`. **Sem Tailwind e sem classe utilitária** (regra do
`CLAUDE.md`); contraste se mede, usar os tokens de texto.

Tarefas 1–3, 7, 12–15 do agente A, adaptadas (`TOKEN_KEY` em `lib/ui.tsx`;
login em `pages/Login.tsx`; saídas em `AdminApp.tsx:265` e `:327`; ícone
`app-icon-medica-brown.png`, fundo `#f6f2ec`, barra `#17201b`). Sem push e
sem exclusão de conta. Mais:

4. `vite.config.ts`: `base: process.env.VITE_BASE_PATH || '/admin/'`. O
   comentário de lá explica por que o padrão não pode cair para `/` — manter.
5. `window.open` em `NewAppointment.tsx:93`, `Reception.tsx:248`,
   `Schedule.tsx:409`, `lib/ui.tsx:778` → `abrirExterno`.
6. `Splash.tsx:70`: como no paciente.
7. `Team.tsx:427`: `URL_DO_SITE` no lugar de `window.location.origin`.
8. `ErrorBoundary.tsx:73`: `import.meta.env.BASE_URL` no lugar de `'/admin/'`.
9. `Landing.tsx:286`: `abrirExterno(URL_DO_SITE)`.
10. `landing/PreviaAoVivo.tsx`: quando `ehNativo`, não montar o iframe;
    mostrar um aviso curto ("A prévia ao vivo fica no computador") e o botão
    de abrir o site. **Não** mexer na checagem de origem nem no `apps/web`.
11. `Login.tsx`: botões "Admin demo"/"Equipe demo" fora quando `ehNativo`.
12. Versão mínima, como no paciente.
13. Conferir `ImageCropper`, `LogoField` e `FileUploadButton` (`input
    type="file"`): só as permissões nativas; o código não muda.
14. Os testes `navegacao.test.ts`, `responsivo.test.ts` e
    `formularios.test.ts` continuam passando sem edição.

### 4.4 Agente C — API

Pastas: `apps/api/**`, `packages/database/**` e os pontos de configuração da
tabela. Ler antes: registros de 22/09 (hash de senha) e 08/09 (sincronia) no
`CLAUDE.md`, `lib/push.ts`, `routes/patient.ts`, `lib/segredos.test.ts`.

Tarefas:
1. Migração: enum `PushProvider` (`WEBPUSH`, `FCM`) e colunas `provider`
   (padrão `WEBPUSH`) e `platform` (opcional) em `PushSubscription`.
2. `routes/patient.ts`: `pushSubscriptionSchema` vira união — o formato web
   atual **ou** `{ provider: 'FCM', token, platform }`. Novo
   `DELETE /push/subscriptions`. A paciente só mexe nas próprias inscrições.
3. `lib/push.ts`: `sendPatientPush` despacha por `provider`. FCM via
   `firebase-admin`, ligado só com `FIREBASE_SERVICE_ACCOUNT`; sem ela, pula.
   Token inválido → `revokedAt`. O `url` vai nos dados da mensagem.
   `avisarPaciente` não muda de assinatura; `sincronia.test.ts` segue verde.
4. `DELETE /patient/me`: exige senha atual (hash lido com `prismaAuth` — é um
   quarto ponto legítimo; atualizar `segredos.test.ts` conscientemente, não
   afrouxar). Zera `passwordHash`, revoga sessões, apaga inscrições de push,
   grava auditoria. Não apaga paciente, prontuário, consultas nem documentos.
   **Antes de escrever, leia o trecho de ativação de conta** que decide por
   `existing?.passwordHash` e confirme, com teste, que depois da exclusão a
   conta fica no mesmo estado de "cadastrada pela clínica, sem acesso".
5. `GET /api/app/versao`, pública, pelo contrato do plano.
6. CORS: acrescentar `capacitor://localhost` e `https://localhost` onde o
   workflow de deploy monta `CORS_ORIGIN`; `.env.example` e compose idem.
7. `helmet`: verificar se alguma imagem é servida por rota da API e usada em
   `<img>` pelos apps (ícones do manifesto em `lib/pwa.ts`/`routes/landing.ts`).
   Se for, liberar `Cross-Origin-Resource-Policy` **só** nessas rotas. Se não
   for, relate que conferiu e não mexa.
8. `apps/api/Dockerfile`: o wrapper CommonJS precisa resolver `firebase-admin`.
9. Testes novos, **verificados falhando**: exclusão exige senha; depois dela
   o login falha; o prontuário permanece; despacho por provedor; inscrição FCM
   de uma paciente não é apagável por outra.
10. Provar: testes da API; **build do container da API**; subir a API com
    banco descartável e exercitar as rotas novas por HTTP;
    `node scripts/auditar-sincronia.mjs`.

### 4.5 Agente D — build e lojas (onda 2)

1. `.github/workflows/apps-nativos.yml`: disparo manual (escolhe app e
   plataforma) e por tag `paciente-v*` / `medica-v*`. Job Android em ubuntu
   (AAB assinado se houver keystore nos segredos; senão APK de depuração como
   artefato e um aviso claro). Job iOS em macOS (build web → sync → arquivo →
   TestFlight com a chave da API do App Store Connect; sem segredos, compila
   para simulador e avisa). Versão do app derivada da tag. Se o `ios/` não
   pôde ser gerado no Windows, o job o gera e o publica como artefato para ser
   versionado.
2. Versão e número de build centralizados (um lugar por app).
3. `docs/nativo/PUBLICACAO.md`, **para o usuário, não para engenheiro**: lista
   de segredos e onde cadastrar cada um; passo a passo Firebase; textos de loja
   em pt-BR para os dois apps; respostas dos formulários de privacidade da
   Apple e do Google (dados de saúde, contato, identificadores; sem anúncios,
   sem rastreamento); nota ao revisor explicando o uso clínico e as contas de
   revisão; lista de capturas exigidas por tamanho; como pedir a distribuição
   não listada do app da médica; o que fazer se a Apple citar a diretriz 4.2.
4. Não inventar exigência de loja: o que não tiver certeza, marcar "conferir
   na data do envio" (nível de API alvo do Play, tamanhos de captura).

### 4.6 Agente E — verificador (onda 3)

Contexto limpo, de propósito: não escreveu nada, não confia em relato.
Não corrige código — reprova e descreve.

1. `npm test`, `npm run build`, `npm run check:encoding`.
2. Build dos quatro containers (`web`, `admin`, `patient`, `api`).
3. API com banco descartável + seed de demonstração, `RATE_LIMIT_MAX` alto.
4. Emulador Android: instalar os dois APKs apontando para a API local
   (`10.0.2.2`; pode exigir build de teste com tráfego em claro liberado —
   **só no build de teste**, conferir que o de produção não leva essa
   permissão).
5. **Paridade visual**: para cada tela, captura do emulador (`adb exec-out
   screencap`) × captura do PWA com `?app=1` no Playwright com o Chrome da
   máquina, mesma largura lógica e mesmos dados. Paciente: todas as seções e o
   detalhe da jornada. Médica: Hoje, Agenda, Atender, Pacientes e cada item do
   "Mais", nos papéis ADMIN, STAFF e recepção. Diferença aceitável: barra de
   status do sistema e arredondamento de subpixel. Medir transbordo pelos
   elementos (`getBoundingClientRect`), não por `scrollWidth`. Tela que veio
   sem dados é reprovada, não aprovada.
6. Funcional no emulador: login; matar o app e reabrir (continua logado);
   sair; voltar físico em cada nível e na raiz; abrir anexo; enviar anexo;
   link de WhatsApp; teclado sobre campo do rodapé; girar; exclusão de conta
   ponta a ponta; tela de versão mínima (subir `MIN_APP_VERSION_*`).
7. Regressão web: os dois PWAs no navegador com e sem `?app=1`; a prévia ao
   vivo do editor "Site" continua funcionando na web.
8. Segredos: `git ls-files` sem keystore, `.p8`, `google-services.json`,
   `GoogleService-Info.plist`; nenhuma senha de demonstração no bundle nativo.
9. Entregar `docs/nativo/VERIFICACAO.md`: um caso por linha, OK ou FALHA
   (formato do `CLAUDE.md`), e a lista do que **não** foi possível verificar —
   no mínimo: tudo de iOS, push real, upload contra o bucket de produção.

Reprovações voltam ao agente dono da pasta; o verificador roda de novo só os
casos reprovados e os vizinhos.

## 5. Fechamento — você

1. Atualizar o `CLAUDE.md`: registro datado na seção "Auditoria" (o que foi
   feito, o que foi encontrado, o que ficou pendente) e as regras do item 6 do
   plano em "Convenções". `node scripts/graph-map.js --write`.
2. Commit final. Sem push.
3. Relato ao usuário, curto: o que está provado no emulador; o que está
   escrito e **não** provado (iOS, push real); a lista U1–U10 do plano com o
   estado de cada item; o próximo passo dele.

## 6. Quando parar e perguntar

- JDK/SDK insuficiente para o Capacitor atual.
- Um plugin exigido não existe para o major atual do Capacitor.
- Qualquer correção que só feche afrouxando uma trava de segurança.
- A exclusão de conta abrir caminho para alguém reativar a conta de outra
  pessoa sabendo só o e-mail.
- Contas de demonstração encontradas em produção (avisar; não agir).
- Qualquer passo que peça credencial do usuário.

Fora disso: decida, registre em `DECISOES.md` e siga.

## 7. O que não fazer

- Reescrever tela, trocar biblioteca de UI, "aproveitar para melhorar" layout.
- Criar pacote compartilhado entre os apps.
- Apontar a casca para o site (`server.url`) em build de produção.
- Push para a equipe, biometria, OTA, renovação de token — são O1–O5, fora.
- Corrigir o push web dos `sw.js` (O3) sem o usuário pedir.
- Publicar, enviar a loja, fazer deploy.
