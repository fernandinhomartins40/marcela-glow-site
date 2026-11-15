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
