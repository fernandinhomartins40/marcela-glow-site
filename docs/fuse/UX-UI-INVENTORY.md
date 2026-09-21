<!-- Inventario factual levantado por varredura do codigo em 2026-09-21. Cada
     afirmacao carrega arquivo:linha. Documento de referencia da auditoria. -->

# INVENTARIO UX/UI — marcela-glow-site (apps/web, apps/admin, apps/patient)

Monorepo npm workspaces (`package.json:5-8` na raiz: `"workspaces": ["apps/*","packages/*"]`), orquestrado por Turbo (`turbo.json`). Quatro apps em `apps/`: `web`, `admin`, `patient`, `api`. Um unico pacote compartilhado: `packages/database` (`packages/database/package.json:2` — `@marcela/database`), que e Prisma, nao UI.

---

## 1. apps/web — landing publica

### 1.1 Rotas

Entrada: `apps/web/src/main.tsx:1-5` (`createRoot` → `<App/>`). Roteador em `apps/web/src/App.tsx:16-22` — `<BrowserRouter>` + `<Routes>` (nao usa `createBrowserRouter`).

| Caminho | Componente | Arquivo:linha | Acesso |
|---|---|---|---|
| `/` | `Index` | `apps/web/src/App.tsx:18` | Publica |
| `*` (catch-all) | `NotFound` | `apps/web/src/App.tsx:20` | Publica |

Duas rotas apenas. Toda a landing e uma pagina unica com navegacao por ancora (`#id`), nao por rota.

### 1.2 Telas e secoes

`apps/web/src/pages/Index.tsx:56-72` monta a pagina inteira. Secoes, todas com `id` de ancora:

| Secao | Componente | Ancora (arquivo:linha) |
|---|---|---|
| Hero (carrossel) | `Hero` | `apps/web/src/components/Hero.tsx:89` — `id="home"` |
| Marquee | `Marquee` | `apps/web/src/components/Marquee.tsx` (32 linhas, sem `id`) |
| Sobre | `About` | `apps/web/src/components/About.tsx:41` — `id="sobre"` |
| Procedimentos | `Procedures` | `apps/web/src/components/Procedures.tsx:83` — `id="procedimentos"` |
| Tecnologias | `Technology` | `apps/web/src/components/Technology.tsx:66` — `id="tecnologias"` |
| Depoimentos | `Testimonials` | `apps/web/src/components/Testimonials.tsx:57` — `id="depoimentos"` |
| Agendamento | `Appointment` | `apps/web/src/components/Appointment.tsx:129` — `id="agendamento"` |
| Rodape / contato | `Footer` | `apps/web/src/components/Footer.tsx:80` — `id="contato"` |
| Header fixo | `Header` | `apps/web/src/components/Header.tsx` (176 linhas) |
| Injetor de tokens | `Theme` | `apps/web/src/pages/Index.tsx:59`; `apps/web/src/components/Theme.tsx` (103 linhas) |
| Seletor de horarios | `SlotPicker` | `apps/web/src/components/SlotPicker.tsx` (243 linhas) |
| 404 | `NotFound` | `apps/web/src/pages/NotFound.tsx:11-21` |

`apps/web/src/components/ui/` — 47 arquivos `.tsx` + `use-toast.ts` = kit shadcn/ui completo (accordion, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip, aspect-ratio, alert).

Conteudo da landing e editavel via API com fallback local: `apps/web/src/hooks/useLanding.ts:24-36` (`useLanding`), `:38+` (`useSection<T>(id, fallback)`). Secoes possiveis: `apps/web/src/hooks/useLanding.ts:13-22` — `THEME|HERO|ABOUT|PROCEDURES|TECHNOLOGY|TESTIMONIALS|APPOINTMENT|FOOTER|SEO`.

### 1.3 Design system / tokens

- `apps/web/tailwind.config.ts` — 113 linhas. Breakpoints custom em `:10-17` (`xs:480px, sm:640, md:768, lg:1024, xl:1280, 2xl:1440`). Fontes em `:33-37` (`sans: Inter`, `serif/display: Cormorant Garamond → Playfair Display → Georgia`). Cores em `:38-78`, todas mapeadas para `hsl(var(--token))`. Radius em `:83-87` (`var(--radius)`). Plugin `tailwindcss-animate` em `:112`.
- `apps/web/src/index.css` — 431 linhas. `@tailwind base/components/utilities` em `:1-3`. `:root` com custom properties em `:11-79`: `--background: 36 30% 94%`, `--foreground: 24 25% 18%`, `--primary: 24 25% 20%`, `--accent: 28 22% 55%`, `--destructive: 0 60% 45%`, `--radius: 0.25rem` (`:44`). Tokens editoriais extras em `:47-52` (`--cream, --cream-deep, --espresso, --bronze, --bronze-light, --marble-vein`). Gradientes compostos em `:64-78`. Tema escuro em `:81-101` (`.dark`).
- `apps/web/components.json` — shadcn: `style: default`, `baseColor: slate`, `cssVariables: true`, `css: src/index.css`, alias `ui: @/components/ui`.
- `apps/web/src/index.css:142` — `@media (prefers-reduced-motion: reduce)`.

### 1.4 Estados de interface

- **Loading**: `isPending` — 4 ocorrencias. `apps/web/src/components/Appointment.tsx:303-305` (`disabled={mutation.isPending}` + texto "Enviando..."); `apps/web/src/components/Footer.tsx:211-213` ("Inscrevendo..."). `isLoading` — 2 ocorrencias.
- **Skeleton**: componente existe (`apps/web/src/components/ui/skeleton.tsx`, 3 ocorrencias) e `animate-pulse` em `apps/web/src/components/ui/sidebar.tsx` (10 ocorrencias), mas **NAO ENCONTRADO** nenhum uso de `Skeleton` nas secoes da landing.
- **Toast/success/error**: `sonner` montado em `apps/web/src/App.tsx:14-15` (`<Toaster/>` + `<Sonner/>`). Uso: `apps/web/src/components/Appointment.tsx:6,90,100,108`; `apps/web/src/components/Footer.tsx:4,56,60`.
- **Empty state**: **NAO ENCONTRADO** — zero ocorrencias de "Nenhum/Nenhuma/vazio" em `apps/web/src/components/*.tsx`; apenas 1 em `apps/web/src/pages/Index.tsx`. A landing nunca renderiza lista vazia porque `useLanding` sempre devolve fallback local (`apps/web/src/hooks/useLanding.ts:38+`).
- **Disabled**: 68 ocorrencias.
- **ErrorBoundary**: **NAO ENCONTRADO** (0 ocorrencias em todo `apps/web/src`).
- **404**: `apps/web/src/pages/NotFound.tsx:12-20` — texto em ingles ("Oops! Page not found", "Return to Home") e classes fora do design system (`bg-gray-100`, `text-blue-500`), nao os tokens do tema.

### 1.5 Acessibilidade — contagem bruta

Contagens em `apps/web/src` (`.tsx/.ts/.css`):
- `aria-*`: **51**
- `role=`: **10**
- `alt=`: **4** — `About.tsx:54` (`alt={portrait.alt}`), `Footer.tsx:90`, `Header.tsx:69`, `Hero.tsx:170` (`alt={image?.alt ?? ...}`). Todas dinamicas, vindas do CMS.
- `label htmlFor`: **1** (unica no app inteiro)
- `focus-visible`: **55** — 53 dentro de `apps/web/src/components/ui/` (11 arquivos) + `Appointment.tsx:123` e `Footer.tsx:204`
- `outline-none`: **44**
- `<div onClick>`: **0**
- Regra global `:focus-visible` em CSS: **NAO ENCONTRADO** em `apps/web/src/index.css` (o foco vem das classes de cada componente shadcn)
- `aria-label` em icones sem texto: `Footer.tsx:113` ("Instagram"), `:122` ("WhatsApp"), `:235` ("Acessar painel medico")

### 1.6 Responsividade

Classes Tailwind em `apps/web/src/**/*.tsx`: `xs:` **1**, `sm:` **82**, `md:` **69**, `lg:` **52**, `xl:` **12**, `2xl:` **3**. Total 219 — o app mais responsivo dos tres por volume de breakpoints.

Media queries em CSS: apenas 1 — `apps/web/src/index.css:142` (`prefers-reduced-motion`).

Larguras/alturas fixas em px (classes arbitrarias):
- `apps/web/src/components/Appointment.tsx:290` — `min-h-[110px]`
- `apps/web/src/components/ui/command.tsx:63` — `h-[300px]`
- `apps/web/src/components/ui/drawer.tsx:39` — `w-[100px]`
- `apps/web/src/components/ui/textarea.tsx:11` — `min-h-[80px]`
- `apps/web/src/components/ui/toast.tsx:17` — `max-w-[420px]`
- `apps/web/src/components/ui/separator.tsx:14`, `sidebar.tsx:257` — 1px/2px (irrelevantes)

Zero `style={{ width: NNNpx }}` inline. Protecao contra scroll horizontal em `apps/web/src/index.css:117-119` (`html, body { max-w-full overflow-x-hidden }`) e `:121-123` (`img, svg, video, canvas { max-w-full }`).

### 1.7 Formularios

Dois `<form>`:

1. **Agendamento** — `apps/web/src/components/Appointment.tsx`, `onSubmit={handleSubmit}`.
   - **NAO usa react-hook-form nem zod** apesar de ambos estarem instalados. Validacao manual: `:108` — `toast.error("Por favor, preencha todos os campos obrigatorios")`.
   - Usa `required` nativo do HTML: `:195, :205, :213`.
   - Mensagem de erro: via toast (`:100, :108`), nao inline junto ao campo.
   - Estado de envio: `:303-305`.
   - `<label>` proprio: **NAO ENCONTRADO** — os campos usam `placeholder` e `focus-visible:border` (`:123`), sem `htmlFor`.
2. **Newsletter** — `apps/web/src/components/Footer.tsx`, `onSubmit={handleNewsletter}`.
   - Sem RHF/zod. Erro/sucesso por toast (`:56, :60`). Estado em `:211-213`.
   - `<label>`: **NAO ENCONTRADO**.

`apps/web/src/components/ui/form.tsx` implementa a ponte shadcn↔react-hook-form (`:4` importa `Controller, FormProvider, useFormContext`; `:75 FormLabel`, `:111 FormMessage`) mas **nenhum componente da landing o usa** — grep de `useForm|zodResolver` fora de `ui/form.tsx` retorna zero resultados em `apps/web/src`.

### 1.8 Stack

De `apps/web/package.json` (versoes resolvidas no `package-lock.json`):
- React `^18.3.1` → **18.3.1**
- `react-router-dom` `^6.30.1` → **6.30.3**
- `tailwindcss` `^3.4.17` → **3.4.19** (devDep)
- `@tanstack/react-query` `^5.83.0` → **5.100.6**
- Biblioteca de componentes: **shadcn/ui sobre Radix UI** — 28 pacotes `@radix-ui/react-*`, `class-variance-authority ^0.7.1`, `tailwind-merge ^2.6.0`, `clsx ^2.1.1`
- Extras: `sonner ^1.7.4` (toasts), `react-hook-form ^7.61.1` → 7.74.0 (instalado, nao usado nas telas), `zod ^3.25.76` (instalado, nao usado no front), `lucide-react ^0.462.0`, `recharts ^2.15.4`, `embla-carousel-react`, `cmdk`, `vaul`, `date-fns ^3.6.0`, `axios ^1.7.9`, `next-themes`
- Build: Vite `^5.4.19` + `@vitejs/plugin-react-swc`

---

## 2. apps/admin — painel da clinica (7 papeis)

### 2.1 Rotas

Entrada: `apps/admin/src/main.tsx:16-20` → `AdminApp` (`apps/admin/src/AdminApp.tsx:303-311`), com `<BrowserRouter basename={routerBase}>` (`:306`, base em `:299-301`).

**Porta de autenticacao**: `apps/admin/src/AdminApp.tsx:288` — `if (!localStorage.getItem(TOKEN_KEY)) return <Login />`. Ou seja, sem token nenhuma rota existe; `<Login/>` nao tem rota propria.

| Caminho | Componente | Arquivo:linha | Acesso |
|---|---|---|---|
| (sem token) | `Login` | `apps/admin/src/AdminApp.tsx:288` | Publica (guarda, nao rota) |
| `/` | `<Navigate to="/dashboard" replace/>` | `apps/admin/src/AdminApp.tsx:292` | Autenticada |
| `/:section` | `Shell` | `apps/admin/src/AdminApp.tsx:293` | Autenticada + por permissao |
| `*` | `<Navigate to="/dashboard" replace/>` | `apps/admin/src/AdminApp.tsx:294` | Autenticada |

A rota real e **uma so** (`/:section`). As 12 "telas" sao valores de `:section` resolvidos por `AdminPanel` (`apps/admin/src/pages/AdminPanel.tsx:32-45`). `AdminTab` declarado em `apps/admin/src/pages/AdminPanel.tsx:18-30`.

**Secoes (`/:section`) e permissao exigida** — declaradas em `apps/admin/src/AdminApp.tsx:42-78` (`NAV_GROUPS`, 5o campo de cada tupla):

| Caminho | Rotulo | Componente | Permissao | Evidencia |
|---|---|---|---|---|
| `/dashboard` | Dashboard | `Dashboard` | `DASHBOARD_READ` | `AdminApp.tsx:48` / `AdminPanel.tsx:33` |
| `/appointments` | Agenda | `Schedule` | `APPOINTMENT_READ` | `AdminApp.tsx:49` / `AdminPanel.tsx:36` |
| `/reception` | Recepcao | `Reception` | `FINANCE_OPERATE` | `AdminApp.tsx:50` / `AdminPanel.tsx:34` |
| `/encounter` | Atendimento | `Encounter` | `RECORD_WRITE` | `AdminApp.tsx:51` / `AdminPanel.tsx:37` |
| `/finance` | Financeiro | `Finance` | `FINANCE_OPERATE\|FINANCE_MANAGE` | `AdminApp.tsx:52` / `AdminPanel.tsx:40` |
| `/patients` | Pacientes | `Patients` | `PATIENT_READ` | `AdminApp.tsx:59` / `AdminPanel.tsx:35` |
| `/documents` | Documentos | `ClinicalDocuments` | `PRESCRIPTION_READ` | `AdminApp.tsx:60` / `AdminPanel.tsx:38` |
| `/leads` | Leads | `Leads` | `LEAD_READ` | `AdminApp.tsx:61` / `AdminPanel.tsx:41` |
| `/registry` | Cadastros | `RegistryPage` | `RECORD_WRITE` | `AdminApp.tsx:69` / `AdminPanel.tsx:39,48-74` |
| `/cms` | Site | `SitePage` | `CMS_READ` | `AdminApp.tsx:70` / `AdminPanel.tsx:42,76-95` |
| `/settings` | Ajustes | `SettingsPage` | `SETTINGS_WRITE` | `AdminApp.tsx:71` / `AdminPanel.tsx:44,120-158` |
| `/security` | Equipe e acessos | `SecurityPage` | `USER_MANAGE` | `AdminApp.tsx:72` / `AdminPanel.tsx:43,97-118` |

Sintaxe `A|B` = "basta uma" (`apps/admin/src/AdminApp.tsx:169-172`, `podeVer`). Menu filtrado em `:173-180` (`gruposVisiveis`). Redirecionamento de aba proibida para a primeira permitida em `:192-197`. Comentario em `:33-41` declara explicitamente que o filtro do menu **e conveniencia, nao seguranca** — a protecao real e o `requirePermission` do backend.

**7 papeis** — `apps/admin/src/lib/ui.tsx:879-887` (`ROLE_LABELS`): `ADMIN` (Administradora), `STAFF` (Equipe), `DOCTOR` (Medica), `RECEPTION` (Recepcao), `ASSISTANT` (Assistente), `CONTENT_EDITOR` (Conteudo), `FINANCE` (Financeiro). Dicas por papel em `:889+` (`ROLE_HINTS`). Grupos de permissao em `:903+` (`PERMISSION_GROUPS`). Hook `usePermissoes` em `:966-981` — note `:979` : `pode: (p) => query.data?.role === 'ADMIN' || permissoes.includes(p)` (ADMIN passa por tudo no cliente).

### 2.2 Navegacao interna (sub-abas por estado, sem rota)

- `/registry` → 5 sub-abas por `React.useState`: `apps/admin/src/pages/AdminPanel.tsx:49` — `procedures | medications | exams | guidance | doctemplates`; renderizadas em `:67-71`. Marcacao `role="tablist"`/`role="tab"`/`aria-selected` em `:60-65`. **Sem `role="tabpanel"`**.
- `/cms` → 2 sub-abas (`landing | publicacoes`): `AdminPanel.tsx:77`, tablist `:80-87`, tabpanels com `id`+`role="tabpanel"`+`aria-controls` `:88-92`.
- `/security` → 2 sub-abas (`equipe | auditoria`): `AdminPanel.tsx:98`, tablist `:101-108`, tabpanels `:109-115`.
- `/settings` → 3 sub-abas (`schedule | certificate | apps`), **unica que persiste na URL** via `useSearchParams` (`AdminPanel.tsx:126-131`, ex.: `/settings?aba=certificate`). Tablist `:134-138`; **sem `role="tabpanel"`**.

### 2.3 Telas e secoes

Shell do painel: `apps/admin/src/AdminApp.tsx:136-281` (`Shell`) — sidebar (`:208-238`), header com titulo/subtitulo/identidade (`:241-259`), conteudo (`:266`), barra inferior no modo app (`:269-278`).

Componentes de tela (`apps/admin/src/components/`, exports principais):

| Arquivo:linha | Export | Papel |
|---|---|---|
| `Dashboard.tsx:84` | `Dashboard` | Visao geral |
| `Schedule.tsx:41` / `:342` | `Schedule` / `AppointmentDrawer` | Agenda + gaveta de consulta |
| `ScheduleSettings.tsx:40` | `ScheduleSettings` | Horarios |
| `NewAppointment.tsx:28` | `NewAppointment` | Nova consulta |
| `Reception.tsx:89` | `Reception` | Recepcao |
| `Caixa.tsx:69` | `Caixa` | Fechamento de caixa |
| `Receber.tsx:55` | `Receber` | Recebimento |
| `Finance.tsx:88` | `Finance` | Financeiro |
| `Patients.tsx:34` | `Patients` | Lista de pacientes |
| `patients/ficha.tsx:109` / `:80` | `PatientDetail` / `ClinicalAlerts` | Ficha + alertas clinicos |
| `patients/form.tsx:68` | `PatientForm` | Cadastro/edicao |
| `patients/planos.tsx:85` | `PlanosPanel` | Planos de tratamento |
| `Encounter.tsx:56` | `Encounter` | Atendimento |
| `encounter/agenda.tsx:39,469,486,570,614` | `TodayAgenda`, `LinkPatientButton`, `LinkPatientModal`, `StartEncounterButton`, `NewEncounterModal` | Fluxo do dia |
| `encounter/prontuario.tsx:22,114` | `RecordTimeline`, `RecordForm` | Prontuario |
| `encounter/anexos.tsx:28,164,231` | `EncounterDocuments`, `EncounterSessions`, `SessionQuickForm` | Documentos/sessoes |
| `encounter/PassoAtual.tsx:38` | `PassoAtual` | Passo do atendimento (+ `etapas.ts`, `types.ts`) |
| `Clinical.tsx:128,416,588,716` | `ClinicalCatalog`, `ClinicalDocuments`, `SignDocumentPrompt`, `DocumentForm` | Catalogo clinico + assinatura |
| `DocumentTemplates.tsx:57` | `DocumentTemplates` | Modelos de documento |
| `templates/TemplateForm.tsx:65`, `Sheet.tsx:22`, `LogoField.tsx:14`, `blocks.ts` | — | Editor de modelos |
| `Catalog.tsx:41,262,593` | `Procedures`, `Leads`, `Cms` | Procedimentos, leads (kanban), publicacoes |
| `leads/BoardSettings.tsx:20` (+ `board.ts`, `arraste.ts`) | `BoardSettings` | Configuracao do funil / drag-and-drop |
| `Landing.tsx:88` | `Landing` | Editor da landing |
| `landing/campos.tsx:23,57,159,354,472` | `Bloco`, `StringList`, `RepeatingList`, `ImageField`, `HeadingFields` | Campos do editor |
| `landing/cores.tsx:101,152` | `ColorField`, `ColorPreview` | Paleta editavel (`hslParaHex` `:18`, `hexParaHsl` `:42`) |
| `landing/preview.tsx:11,42,158` | `SearchPreview`, `Figure`, `SectionPreview` | Previa da landing |
| `Team.tsx:50` | `Team` | Equipe e permissoes |
| `Certificate.tsx:46` | `Certificate` | Certificado digital |
| `PwaSettings.tsx:56` | `PwaSettings` | Manifesto/PWA |
| `ImageCropper.tsx:24` | `ImageCropper` | Recorte de imagem |
| `Avisos.tsx:16,57` | `AvisosBarra`, `EnviarAviso` | Avisos |
| `AppBar.tsx:56` | `AppBar` | Barra inferior (so instalado) |
| `Splash.tsx:22,95` | `useAbertura`, `Splash` | Abertura |
| `pages/Login.tsx` | `Login` | Login |

**Barra inferior (PWA instalado)**: `apps/admin/src/components/AppBar.tsx:38-43` — 4 principais (`dashboard/Hoje`, `appointments/Agenda`, `encounter/Atender` com `destaque`, `patients/Pacientes`) + `:46-54` 7 secundarias atras de "Mais". Condicionada a `useAplicativoInstalado()` (`apps/admin/src/AdminApp.tsx:147, 269`).

Primitivas compartilhadas do admin em `apps/admin/src/lib/ui.tsx`: `Modal:52`, `Field:138`, `FormRow:161`, `SubmitButton:169`, `ConfirmDialog:189`, `EmptyState:230`, `Toolbar:251`, `FileUploadButton:259`, `Chip:401`, `TagInput:445`, `DataRow:566`, `DataList:627`, `RowAction:632`, `SearchBox:664`, `AttachmentsPanel:698`, `PatientSearchSelect:779`, mascaras `maskCPF:321`/`maskCEP:329`/`maskPhone:334`/`isValidCPF:346`, formatadores `formatMoney:364`/`formatDateBR:377`.

Ha teste de navegacao: `apps/admin/src/navegacao.test.ts` (unico arquivo de teste de front nos tres apps).

### 2.4 Design system / tokens

**Divergencia central**: `apps/admin/tailwind.config.ts` e **byte-identico** ao do web e do patient (md5 `70403b20fd8931b5b045f9dd5eebbc36` nos tres), mas **`apps/admin/src/styles.css` nao tem nenhuma diretiva `@tailwind` nem `@apply`** (grep retorna zero). Consequencia verificada: **0 classes Tailwind responsivas** em todo `apps/admin/src/**/*.tsx` (`sm:`/`md:`/`lg:`/`xl:`/`2xl:` = 0 cada). Os `className` do admin sao classes CSS proprias — ex. `apps/admin/src/AdminApp.tsx:206-247`: `app-shell`, `app-nav`, `side-nav`, `nav-group`, `who-avatar`, `page-hint`. Tailwind esta configurado (inclusive `postcss.config.js` identico aos outros) e **nao e usado**.

Tokens do admin: `apps/admin/src/styles.css:2-15` — `:root` em **HEX/RGBA, nao HSL**: `--cream:#f6efe4`, `--cream-soft:#fffaf2`, `--cream-deep:#e5d8c7`, `--marble:#f2eadc`, `--marble-soft:#fbf6ee`, `--espresso:#2f221b`, `--espresso-deep:#1f1713`, `--bronze:#9c8268`, `--bronze-soft:#c6b19c`, `--border:#d8cab8`, `--text-muted:rgba(47,34,27,.66)`, `--shadow-soft`. **Sem `--primary`, `--foreground`, `--background`, `--radius`, `--destructive`** — o vocabulario nao e o mesmo do web/patient.

Excecao: `apps/admin/src/styles.css:618` usa `hsl(var(--primary) / .5)` em `.lp-btn-outline` — tokens HSL do web dentro da previa da landing (`landing/preview.tsx`), unica ponte entre os dois vocabularios.

Tipografia: `apps/admin/src/styles.css:16` (body `Inter`), `:25-27` (login `Playfair Display`/`Cormorant Garamond`), `:94` (marca), `:103` (`header h1` em sans, 24px), `:122` (`.stat strong` em serifada, 30px). Comentario em `:24` declara a intencao: "A tela de login mantem o tom editorial da marca; a area de trabalho, nao."

`apps/admin/components.json` aponta para `"css": "src/index.css"` — **esse arquivo nao existe** em `apps/admin/src/` (o real e `styles.css`). O `components.json` do admin e copia literal do web (alias `@/components/ui` tambem inexistente no admin).

`styles.css` tem **2958 linhas** — o maior arquivo de estilo dos tres (web 431, patient 453).

### 2.5 Estados de interface

Cobertura ampla e consistente, sempre inline (sem toast). Amostras:

- **Loading**: `isLoading` 25 ocorrencias, `isPending` 76 (o maior dos tres). Ex.: `Caixa.tsx:107` ("Carregando o caixa..."), `Encounter.tsx:115` ("Carregando atendimento..."), `Finance.tsx:117`, `Landing.tsx:99`, `Catalog.tsx:76-77`, `Clinical.tsx:195-196`, `Patients.tsx:87-88`, `DocumentTemplates.tsx:111-112`, `AdminApp.tsx:260` ("Carregando dados reais do backend...").
- **Error**: `AdminApp.tsx:261-265` (erro global do painel via `errorMessage`, `apps/admin/src/lib/ui.tsx:41`). Por tela: `Caixa.tsx:108`, `Encounter.tsx:116`, `Finance.tsx:118,132,378`, `Landing.tsx:100,302`, `Catalog.tsx:236,573,775`, `Clinical.tsx:406,542,561,921`, `Certificate.tsx:264`, `DocumentTemplates.tsx:174-175`, `NewAppointment.tsx:195`, `ScheduleSettings.tsx:150`, `PwaSettings.tsx:126`.
- **Empty**: componente dedicado `EmptyState` em `apps/admin/src/lib/ui.tsx:230-249` (props `icon`, `title`, `description`, `action`). Usado em `Catalog.tsx:80,630`, `Clinical.tsx:199,484`, `DocumentTemplates.tsx:116`. Vazios ad-hoc sem o componente: `Dashboard.tsx:156` ("Nenhuma consulta marcada para hoje."), `:311` ("Nenhuma paciente faz aniversario este mes."), `Finance.tsx:193`, `Encounter.tsx:304`, `AdminPanel.tsx:161` ("Nenhum registro." — dentro do `List` da auditoria).
- **Success**: raro. Unico encontrado: `Certificate.tsx:274-276` (`save.isSuccess` → `<CheckCircle2/> Salvo`). Demais mutacoes so trocam o texto do botao (`Finance.tsx:371-372` — "Salvando..."/"Registrar"; `PwaSettings.tsx:224,243-244`). **Sem sistema de toast/notificacao global** — 0 ocorrencias de `toast` em `apps/admin/src`.
- **Disabled**: 115 ocorrencias. Estilo em `apps/admin/src/styles.css:41` (`button:disabled { cursor: not-allowed; opacity: .55 }`). `PwaSettings.tsx:243` combina `disabled={!sujo || salvar.isPending}` (dirty-check).
- **Skeleton**: **NAO ENCONTRADO** — zero `Skeleton`/`animate-pulse`. Loading e sempre texto `<p className="hint">Carregando...</p>`.
- **ErrorBoundary**: **NAO ENCONTRADO**.
- **Confirmacao**: `ConfirmDialog` em `apps/admin/src/lib/ui.tsx:189-228`, com `role="alertdialog"` + `aria-label` em `:209`.

### 2.6 Acessibilidade — contagem bruta

- `aria-*`: **304** (de longe o maior)
- `role=`: **68**
- `alt=`: **13** — `Clinical.tsx:700` ("QR code de verificacao"), `ImageCropper.tsx:206` (`alt={currentAlt ?? ''}`), `:237` (`alt=""`), `landing/campos.tsx:410`, `landing/preview.tsx:29,60,357`, `PwaSettings.tsx:357,423` (`alt=""`), `Splash.tsx:102` (`alt=""`), `templates/LogoField.tsx:53` ("Logo do modelo"), `templates/Sheet.tsx:107` (`alt=""`), `pages/Login.tsx:71` ("Dra. Marcela Duch")
- `label htmlFor`: **3** apenas, contra 115 `disabled` e dezenas de campos. O padrao do admin e **label envolvente sem `htmlFor`**: `apps/admin/src/pages/Login.tsx:92-93` — `<label>E-mail<input .../></label>`. Estilo em `apps/admin/src/styles.css:33` (`label { display: grid; gap: 6px }`).
- `:focus-visible`: **1** ocorrencia em todo o app — `apps/admin/src/styles.css:2826-2828` (`.passo-etapa:focus-visible { outline: 2px solid var(--bronze) }`). **Nao existe regra global `:focus-visible`.**
- `outline-none` (classe Tailwind): **0** (esperado, admin nao usa Tailwind). Mas `outline: 0` em CSS aparece em **6 lugares** que removem o foco de campos de entrada: `styles.css:36` (todos os `input`/`select`), `:742` (`.field input/select/textarea`), `:744` (`.field .search-box input[type=search]`), `:760` (`.tag-input > input`), `:1592` (`.rich-area`, editor contenteditable). A compensacao e apenas `:hover`/`:focus` com `box-shadow` (`:37`) — nao ha estado de foco por teclado distinto nos campos da area de trabalho.
- `<div onClick>`: **2**, ambas no mesmo dialogo — `apps/admin/src/lib/ui.tsx:208` (`<div className="drawer-backdrop confirm-backdrop" onClick={onCancel}>`, backdrop de fechar) e `:209` (`<div className="confirm-box" onClick={stopPropagation}>`, que **tem** `role="alertdialog"` + `aria-label`). Sao os unicos dos tres apps.
- Positivos: `aria-current="page"` na nav (`AdminApp.tsx:226`), `aria-expanded` no toggle (`:243`), `aria-label` nos botoes de icone (`:207, :212, :243`), `aria-hidden` nos icones (`:210, :213, :244`), fechamento por `Escape` (`:154-159`).

### 2.7 Responsividade

**Zero breakpoints Tailwind.** Toda a responsividade esta em media queries no CSS — **31 media queries** em `apps/admin/src/styles.css`, com breakpoints **nao padronizados**: `max-width` 640, 720 (x9), 760 (x2), 860, 900 (x5), 1024, 1080, 1150, 1180; mais `min-width:861px and max-height:800px` (`:1326`), `(pointer: coarse)` (`:1541`) e 4x `prefers-reduced-motion` (`:1570, :1968, :2060, :2412`).

Layout fluido nos eixos principais: `styles.css:50` (`grid-template-columns: clamp(196px, 17vw, 244px) minmax(0,1fr)`), `:98` (`main { padding: clamp(16px,2.2vw,26px) ... }`), `:146` (kanban com `grid-auto-columns: minmax(200px,1fr)` + `overflow-x: auto` + `scroll-snap-type`).

**52 declaracoes de largura/altura fixa em px (>=100px)** em `styles.css`. As de maior risco em tela pequena:
- `:1121` — `min-width: 676px` (o maior `min-width` do arquivo; forca scroll horizontal abaixo de 676px)
- `:22` — `min-height: 610px` (`.auth-copy`, coluna do login)
- `:1608` — `min-width: 220px` + `height: 300px`
- `:1303` — `height: 260px`; `:1287` — `height: 210px`; `:884` — `height: 250px`; `:481` — `height: 240px`
- `:881` — `width/height: 132px`; `:1658` — `width: 150px`; `:1025` — `width: 116px`
- `:191` — `min-width: 260px`; `:1107` — `min-width: 170px`; `:2088` — `min-width: 150px`; `:760` — `min-width: 120px`; `:1753` — `min-width: 104px`

Alvos de toque: `styles.css:39` (`button { min-height: 42px }`), reduzido a **36px** dentro do painel (`:114` — `main button:not(...) { min-height: 36px }`) e a **30px** nas acoes de linha (`:131` — `.row-actions button { min-height: 30px }`).

### 2.8 Formularios

Tres `<form>` com `onSubmit`:
1. `apps/admin/src/pages/Login.tsx` — `onSubmit={submit}`. Labels envolventes sem `htmlFor` (`:92-93`), erro inline em `:94` (`{error && <p className="error">{error}</p>}`, estado em `:24,53`), atalhos de demo em `:85-88`. **Sem RHF/zod.**
2. `apps/admin/src/components/Avisos.tsx` — `onSubmit={(e) => {...}}`
3. `apps/admin/src/components/Caixa.tsx` — `onSubmit={(e) => {...}}`

Os demais formularios do painel **nao usam `<form>`**: sao `Modal` + `Field` + `SubmitButton` com `onClick` direto (`apps/admin/src/lib/ui.tsx:52, 138, 169`). Consequencia: submissao por Enter nao funciona nesses casos.

**`react-hook-form` e `zod` NAO estao em `apps/admin/package.json`** e `useForm` tem **0 ocorrencias** em `apps/admin/src`. Toda validacao e manual (`isValidCPF` em `apps/admin/src/lib/ui.tsx:346`, mascaras em `:321-344`). Erros aparecem inline em `<p className="error">` (estilo em `styles.css:47`).

### 2.9 Stack

De `apps/admin/package.json`:
- React `^18.3.1` → **18.3.1**
- `react-router-dom` `^6.30.1` → **6.30.3**
- `tailwindcss` `^3.4.17` (devDep) → **3.4.19** — **configurado mas nao usado** (ver 2.4)
- `@tanstack/react-query` `^5.83.0` → **5.100.6**
- `recharts ^2.15.4`, `lucide-react ^0.462.0`, `date-fns ^3.6.0`, `axios ^1.7.9`
- **Biblioteca de componentes: NENHUMA.** Zero `@radix-ui/*`, zero shadcn, zero `class-variance-authority`/`clsx`/`tailwind-merge`. UI escrita a mao em `apps/admin/src/lib/ui.tsx` (~990 linhas) + `styles.css` (2958 linhas).
- Dev na porta 5174 (`apps/admin/package.json`, script `dev`)

---

## 3. apps/patient — portal da paciente (PWA)

### 3.1 Rotas

Entrada e roteador no mesmo arquivo: `apps/patient/src/main.tsx:32-39`, dentro de `<BrowserRouter basename={routerBase}>` (`:57`, base em `:18-20`).

**Porta de autenticacao**: `apps/patient/src/main.tsx:29` — `if (!localStorage.getItem(TOKEN_KEY)) return <Login />`.

| Caminho | Componente | Arquivo:linha | Acesso |
|---|---|---|---|
| (sem token) | `Login` | `apps/patient/src/main.tsx:29` | Publica (guarda) |
| `/` | `<Navigate to="/inicio" replace/>` | `apps/patient/src/main.tsx:33` | Autenticada |
| `/jornada/:planoId` | `Dashboard` | `apps/patient/src/main.tsx:36` | Autenticada |
| `/:section` | `Dashboard` | `apps/patient/src/main.tsx:37` | Autenticada |
| `*` | `<Navigate to="/inicio" replace/>` | `apps/patient/src/main.tsx:38` | Autenticada |

**Sem sistema de permissoes** — a paciente ve sempre as mesmas 5 secoes. Nao ha nada analogo ao `NAV_GROUPS`/`podeVer` do admin.

Secoes validas: `apps/patient/src/pages/Dashboard.tsx:19` — `['inicio','consultas','jornada','prescricoes','mensagens']`. Secao invalida cai em `/inicio` (`:46`). O caso especial de `/jornada/:planoId` e tratado em `:26-30` (comentario em `:24-25` explica que `section` nao existe nessa rota).

| Secao | Componente | Arquivo:linha |
|---|---|---|
| `/inicio` | `HomePage` | `apps/patient/src/pages/Dashboard.tsx:84` |
| `/consultas` | `AppointmentsPage` | `:85` |
| `/jornada` | `Jornada` | `:94` |
| `/jornada/:planoId` | `JornadaDetalhe` | `:88-92` |
| `/prescricoes` | `PrescriptionsPage` | `:96` |
| `/mensagens` | `MessagesPage` | `:97` |

### 3.2 Telas e secoes

**Shell** — `apps/patient/src/components/AppShell.tsx:28-204`. Navegacao declarada em `:20-26` (`SECTIONS`): `inicio` (Home, `badge:true`), `consultas` (CalendarDays), `jornada` (Sparkles, `destaque:true`), `prescricoes` (FileText), `mensagens` (MessageCircle). Tres layouts:
- Sidebar desktop: `:51-117` (`hidden md:flex fixed w-[13.5rem] lg:w-60`)
- Header mobile: `:120-140` (`md:hidden sticky h-16`)
- Bottom nav mobile: `:156-201` (`md:hidden fixed bottom-0`, `grid-cols-5` em `:163`)

Paginas (`apps/patient/src/pages/sections/`):
- `Home.tsx:8` — `HomePage`
- `Appointments.tsx:5` — `AppointmentsPage`
- `Jornada.tsx:57` — `Jornada` (+ helpers `dataCurta:44`, `proximaPrevista:48`)
- `JornadaDetalhe.tsx:18` — `JornadaDetalhe`
- `JornadaAcoes.tsx:24` — `JornadaAcoes`
- `Prescriptions.tsx:4` — `PrescriptionsPage`
- `Messages.tsx:5` — `MessagesPage`

Listas e blocos (`apps/patient/src/components/sections.tsx`): `AppointmentsList:35`, `SessionsList:69`, `DocumentItems:106`, `PrescriptionsList:131`, `AttachmentsList:198`, `AttachmentRow:229`, `MessagesList:258`, `NotificationsPanel:301`, `DashboardSkeleton:354`.

Primitivas (`apps/patient/src/components/ui.tsx`): `cn:5`, `Panel:9`, `StatusChip:38`, `EmptyState:43`, `ItemRow:67`, `Skeleton:131`, `Feedback:135`.

Outros: `NextAppointment.tsx:10` (+ `SummaryStat:82`), `RequestCare.tsx:15`, `SlotPicker.tsx:48`, `Splash.tsx:22,95`, `pages/Login.tsx`.

### 3.3 Design system / tokens

`apps/patient/src/styles.css` — 453 linhas. **Usa Tailwind de fato**: `@tailwind base/components/utilities` em `:1-3`, `@layer components` com `@apply` em `:113+`.

Comentario auto-declarado em `:5-8`: "Mesmos tokens do site publico (apps/web/src/index.css), aplicados a um painel". Verificacao de `:11-55` contra `apps/web/src/index.css:11-79` — **mesmo vocabulario HSL, valores parcialmente divergentes**:

| Token | web (`index.css`) | patient (`styles.css`) |
|---|---|---|
| `--background` | `36 30% 94%` (`:13`) | `36 30% 94%` (`:12`) — igual |
| `--foreground` | `24 25% 18%` (`:14`) | `24 25% 18%` (`:13`) — igual |
| `--primary` | `24 25% 20%` (`:23`) | `24 25% 20%` (`:21`) — igual |
| `--card` | `36 30% 96%` (`:16`) | `36 35% 97%` (`:15`) — **difere** |
| `--secondary` | `32 28% 85%` (`:27`) | `32 28% 88%` (`:24`) — **difere** |
| `--muted` | `33 22% 90%` (`:30`) | `33 22% 91%` (`:27`) — **difere** |
| `--muted-foreground` | `24 15% 40%` (`:31`) | `24 15% 42%` (`:28`) — **difere** |
| `--border` | `32 18% 82%` (`:40`) | `32 18% 84%` (`:36`) — **difere** |
| `--cream-deep` | `34 28% 88%` (`:48`) | `34 28% 90%` (`:43`) — **difere** |
| `--radius` | `0.25rem` (`:44`) | `0.375rem` (`:40`) — **difere** |
| `--accent`, `--destructive`, `--ring`, `--espresso`, `--bronze` | — | iguais |

Exclusivos do patient (`styles.css:48-54`): `--success: 145 30% 34%`, `--success-soft`, `--warning: 32 55% 42%`, `--warning-soft`, `--info: 210 22% 42%`, `--info-soft` — **paleta de estados que nem web nem admin tem**.

Ausente no patient: todo o bloco `.dark` (o web tem em `index.css:81-101`) e os gradientes (`web:64-78`).

Classes de componente proprias em `@layer components`: `.barra-fina:119`, `.label-eyebrow:137`, `.panel:141`, `.panel-pad:145`, `.stat-figure:150`, `.field:154`, `.btn:160`, `.btn-primary:165`, `.btn-outline:169`, `.btn-ghost` (`:186+`).

`apps/patient/components.json` — mesmo problema do admin: aponta `"css": "src/index.css"` (arquivo inexistente; o real e `styles.css`) e alias `@/components/ui` (diretorio inexistente).

### 3.4 Estados de interface

O app mais completo em estados por volume de codigo:

- **Loading**: `DashboardSkeleton` em `apps/patient/src/components/sections.tsx:354-356`, com `aria-busy="true"` e `aria-label="Carregando seus dados"` (`:356`). Acionado em `apps/patient/src/pages/Dashboard.tsx:50` (`{query.isLoading && <DashboardSkeleton/>}`). Primitiva `Skeleton` em `apps/patient/src/components/ui.tsx:131`. Spinners por acao: `sections.tsx:249` (`Loader2 ... animate-spin` no download de anexo), `:321` (`push.isPending`), `pages/Login.tsx:206` (`isSubmitting && <Loader2 className="animate-spin"/>`). `isPending`: 9 ocorrencias.
- **Error**: bloco dedicado em `apps/patient/src/pages/Dashboard.tsx:52-66` — icone em circulo (`:54-56`), titulo "Nao conseguimos carregar seus dados" (`:57`), mensagem via `getErrorMessage` (`:59`) e **botao de retry** `onClick={() => query.refetch()}` (`:61-64`). E o unico dos tres apps com acao de recuperacao explicita. Primitiva `Feedback` (tones `error|success`) em `apps/patient/src/components/ui.tsx:135`, usada em `pages/Login.tsx:203`.
- **Empty**: componente `EmptyState` em `apps/patient/src/components/ui.tsx:43`, usado em 4 listas com texto especifico: `sections.tsx:41` ("Nenhuma consulta ainda"), `:137` ("Nenhum documento no momento"), `:204` ("Nenhum arquivo compartilhado"), `:264` ("Nenhuma mensagem ainda"), `:346` ("Nenhum lembrete por enquanto"). Cobertura total das listas.
- **Success**: `Feedback tone="success"` (`ui.tsx:135`). Sem toast global.
- **Disabled**: 12 ocorrencias; estilo em `styles.css:162` (`disabled:opacity-50 disabled:pointer-events-none` dentro de `.btn`).
- **ErrorBoundary**: **NAO ENCONTRADO**.

### 3.5 Acessibilidade — contagem bruta

- `aria-*`: **64**
- `role=`: **7**
- `alt=`: **3** — `AppShell.tsx:127` (`alt=""`, logo decorativa, com `width`/`height` explicitos), `Splash.tsx:102` (`alt=""`), `JornadaDetalhe.tsx:226` (`alt={legenda}`)
- `label htmlFor`: **7** — o unico app com labels associadas por id de forma consistente: `pages/Login.tsx:131` (`htmlFor="name"`), `:146` (`email`), `:163` (`phone`), `:179` (`password`)
- `:focus-visible`: **7** — inclui **regra global** em `apps/patient/src/styles.css:99-102` (`:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px }`) + `:186, :193` (`focus-visible:ring-2 focus-visible:ring-accent` nos botoes)
- `outline-none`: **3** — `styles.css:157` (`.field { focus:outline-none focus:border-accent focus:ring-1 }` — substituido por ring), `:186`, `:193` (idem, com `focus-visible:ring-2`). Todos compensados.
- `<div onClick>`: **0**
- Outros positivos: `aria-current="page"` (`AppShell.tsx:75, 171`), `aria-label` nos badges de contagem (`:91, :192` — "N avisos nao lidos", com plural correto), `aria-label="Navegacao principal"` em ambas as navs (`:66, :158`), `aria-hidden="true"` em todos os icones (`:83, 113, 138, 183, 186`), `aria-hidden` no espacador (`:151`), `aria-label` no toggle de senha (`pages/Login.tsx:196`).
- `prefers-reduced-motion` global: `apps/patient/src/styles.css:104-110` (`animation-duration: 0.01ms !important` etc.).

### 3.6 Responsividade

Classes Tailwind em `apps/patient/src/**/*.tsx`: `sm:` **20**, `md:` **5**, `lg:` **7**, `xl:` **1**, `xs:` **0**, `2xl:` **0**. Total **33** — mobile-first com poucos pontos de quebra, concentrados no `AppShell`.

Media queries CSS: **5** — `styles.css:410` (`max-width: 767px`, alinhada ao `md` do Tailwind) + 4x `prefers-reduced-motion` (`:104, :238, :353, :416`). E o unico app cujas media queries nao brigam com os breakpoints do Tailwind.

Larguras fixas em px: praticamente nenhuma. Unica classe arbitraria em px: `apps/patient/src/components/RequestCare.tsx:136` — `min-h-[104px]` (textarea). As larguras da sidebar usam `rem`: `AppShell.tsx:51` (`w-[13.5rem] lg:w-60`) e `:143` (`md:pl-[13.5rem] lg:pl-60`).

Suporte a notch/PWA — o unico dos tres com `env(safe-area-inset-*)`: `AppShell.tsx:122` (header, `paddingTop` + `height: calc(4rem + env(safe-area-inset-top))`), `:151` (espacador inferior), `:159` (bottom nav). Condicionados a `useAplicativoInstalado()` (`:46`).

Alvos de toque: `AppShell.tsx:77` (`h-11` = 44px na sidebar), `:173` (`min-h-[3.75rem]` = 60px na bottom nav), `styles.css:155` (`.field { h-11 }`), `:161` (`.btn { h-11 }`). **44px minimo consistente** — contra 36px/30px do admin.

Protecao contra overflow: `styles.css:71-73` (`html, body { max-w-full overflow-x-hidden }`), `:75-77` (`img, svg, video, canvas { max-w-full h-auto }` — note o `h-auto` que o web nao tem).

### 3.7 Formularios

Tres `<form>` com `onSubmit`:

1. **Login** — `apps/patient/src/pages/Login.tsx`, `onSubmit={submit}`, `className="mt-8 space-y-4"`.
   - 4 campos com `<label htmlFor>` correto: `:131` (name), `:146` (email), `:163` (phone), `:179` (password).
   - Erro visivel inline: `:203` — `<Feedback tone="error">{error}</Feedback>` (estado em `:22`).
   - Loading: `:205-206` — `disabled={isSubmitting}` + spinner.
   - Toggle de senha com `aria-label` dinamica: `:196`.
   - Atalho de demo: `:220`.
2. **RequestCare** — `apps/patient/src/components/RequestCare.tsx`, `onSubmit={submit}`, `className="panel-pad space-y-4"`. Textarea com `min-h-[104px]` (`:136`).
3. **JornadaAcoes** — `apps/patient/src/pages/sections/JornadaAcoes.tsx`, `onSubmit={submeter}`, `className="mt-4 space-y-4"`.

**`react-hook-form` e `zod` NAO estao em `apps/patient/package.json`**; `useForm` tem 0 ocorrencias. Validacao e estado sao `React.useState` manuais.

### 3.8 Stack

De `apps/patient/package.json` — **a menor dependencia dos tres**:
- React `^18.3.1` → **18.3.1**
- `react-router-dom` `^6.30.1` → **6.30.3**
- `tailwindcss` `^3.4.17` (devDep) → **3.4.19** — **usado de fato**
- `@tanstack/react-query` `^5.83.0` → **5.100.6** (config em `main.tsx:12-16`: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`)
- `lucide-react ^0.462.0`, `date-fns ^3.6.0`, `axios ^1.7.9`
- **Sem `recharts`** (o admin tem), **sem Radix/shadcn**, **sem `sonner`**. Apenas 7 dependencias de producao.
- **Biblioteca de componentes: propria**, `apps/patient/src/components/ui.tsx` (7 exports, ~150 linhas) + classes `@layer components` no `styles.css`.
- Dev na porta 5175.

---

## 4. Diferencas entre os tres apps

### 4.1 O CLAUDE.md sobre silos — parcialmente refutado

`CLAUDE.md:101-102` afirma: *"Os apps sao silos independentes (nao compartilham codigo), entao so vale unificar quando houver um segundo tenant."*

**Confirmado quanto a imports**: nenhum app importa de outro. O unico workspace compartilhado e `packages/database` (`packages/database/package.json:2`), que e Prisma — nenhum dos tres fronts o importa. Nao existe `packages/ui` nem `packages/tokens`.

**Refutado quanto a duplicacao de fato**. Evidencia por hash:

| Arquivo | Situacao |
|---|---|
| `tailwind.config.ts` | **Byte-identico nos tres** — md5 `70403b20fd8931b5b045f9dd5eebbc36` (web/admin/patient). 113 linhas copiadas, incluindo os mesmos comentarios em portugues (`:8-9`, `:20-21`). |
| `apps/admin/src/lib/manifesto.ts` vs `apps/patient/src/lib/manifesto.ts` | **Byte-identico** — md5 `5d2bce8ad80884e20b13b838224517fa` |
| `apps/admin/src/components/Splash.tsx` vs `apps/patient/src/components/Splash.tsx` | Quase identico (mesmos exports nas mesmas linhas: `useAbertura:22`, `Splash:95`; hashes diferem). `Splash` recebe prop `app: 'admin' \| 'patient'` (`:95`) — o componente foi escrito para servir aos dois e depois copiado. |
| `apps/admin/src/lib/standalone.ts` vs `apps/patient/src/lib/standalone.ts` | Quase identico (mesmos exports `registrarModoAplicativo`, `marcarDocumentoComoAplicativo`, `useAplicativoInstalado`; hashes diferem) |
| `apps/web/src/components/SlotPicker.tsx` (243 linhas) vs `apps/patient/src/components/SlotPicker.tsx` (227 linhas) | Mesma funcao, versoes divergentes |
| `logo-md.png` | **Byte-identico nos tres** — md5 `370fc52c181bc140eea7af8cc9bc674a` |
| `marble-texture.jpg` | **Byte-identico nos tres** — md5 `7891654dd171760639048c55d8baf0e4` |
| `components.json` | **Identico nos tres** — inclusive nos apps onde os caminhos que ele declara nao existem (ver 2.4 e 3.3) |
| `postcss.config.js` | Identico nos tres |
| Comentarios em `apps/admin/src/main.tsx:7-14` vs `apps/patient/src/main.tsx:43-50` | Blocos de comentario copiados palavra por palavra |

**Veredicto**: sao silos por construcao (sem dependencia de codigo), mas nao por conteudo — ha duplicacao literal de configuracao, assets e logica de PWA. O risco e divergencia silenciosa: os tokens do patient ja divergem dos do web em 7 valores (secao 3.3) apesar do comentario em `apps/patient/src/styles.css:5-8` afirmar que sao "os mesmos".

### 4.2 Tokens — dois vocabularios, nao um

| | web | admin | patient |
|---|---|---|---|
| Arquivo | `src/index.css` (431 l.) | `src/styles.css` (2958 l.) | `src/styles.css` (453 l.) |
| Formato | HSL em `:root` (`index.css:11-79`) | **HEX/RGBA** (`styles.css:2-15`) | HSL em `:root` (`styles.css:11-55`) |
| Nomes shadcn (`--primary`, `--foreground`, `--radius`) | Sim | **Nao** | Sim |
| Nomes proprios | `--cream, --espresso, --bronze, --marble-vein` | `--cream, --espresso, --bronze, --marble, --shadow-soft` | `--cream, --espresso, --bronze` |
| Tema escuro | Sim (`index.css:81-101`) | Nao | Nao |
| Tokens de estado (`--success/--warning/--info`) | Nao | Nao | **Sim** (`styles.css:48-54`) |
| Gradientes como token | Sim (`index.css:64-78`) | Nao | Nao |
| `--radius` | `0.25rem` | ausente | `0.375rem` |

Web e patient falam o mesmo dialeto (com 7 valores divergentes). O admin fala outro. Unica ponte: `apps/admin/src/styles.css:618` usa `hsl(var(--primary))` na previa da landing.

### 4.3 Tailwind — configurado em tres, usado em dois

| | web | admin | patient |
|---|---|---|---|
| `tailwind.config.ts` | Identico | Identico | Identico |
| `@tailwind` no CSS | `index.css:1-3` | **NAO ENCONTRADO** | `styles.css:1-3` |
| `@apply` | Sim (`index.css:106,110,118`) | **0 ocorrencias** | Sim (`styles.css:60,64,138,142,146`) |
| Classes `sm:/md:/lg:/xl:/2xl:` em `.tsx` | 219 | **0** | 33 |

O admin carrega Tailwind no `postcss.config.js` e no `package.json` sem consumi-lo.

### 4.4 Roteamento e autorizacao

| | web | admin | patient |
|---|---|---|---|
| Rotas `<Route>` | 2 (`App.tsx:18,20`) | 3 (`AdminApp.tsx:292-294`) | 4 (`main.tsx:33-38`) |
| Telas reais | 1 pagina + 8 ancoras | 12 secoes + 12 sub-abas | 5 secoes + 1 detalhe |
| Guarda de auth | nenhuma | `AdminApp.tsx:288` (localStorage) | `main.tsx:29` (localStorage) |
| Autorizacao por permissao | nao | **sim** — `AdminApp.tsx:42-78, 169-180, 192-197` | nao |
| Papeis | — | **7** (`lib/ui.tsx:879-887`) | 1 |
| Estado de sub-aba na URL | — | so `/settings` (`AdminPanel.tsx:126-131`) | so `/jornada/:planoId` (`main.tsx:36`) |
| Deep link para sub-tela | — | parcial (11 de 12 sub-abas perdem estado no reload) | parcial |
| PWA / service worker | nao | `AdminApp.tsx:284-286` | `main.tsx:23-27` |
| 404 dedicado | `NotFound.tsx` (em **ingles**) | redireciona (`:294`) | redireciona (`:38`) |

### 4.5 Bibliotecas de componentes — tres abordagens distintas

- **web**: shadcn/ui completo — 47 componentes em `src/components/ui/` sobre 28 pacotes `@radix-ui/react-*`
- **admin**: nenhuma lib. UI manual em `src/lib/ui.tsx` (~990 l.) + 2958 linhas de CSS
- **patient**: lib minima propria — `src/components/ui.tsx` (7 exports) + `@layer components` no Tailwind

Consequencia direta: `apps/web/src/components/ui/dialog.tsx` (Radix, com focus trap e `aria-modal` embutidos) vs `apps/admin/src/lib/ui.tsx:52` (`Modal` manual) vs o patient, que nao tem modal.

### 4.6 Estados — matriz

| Estado | web | admin | patient |
|---|---|---|---|
| Loading | texto no botao (`Appointment.tsx:305`) | texto `<p className="hint">Carregando...</p>` (24 telas) | **Skeleton** (`sections.tsx:354`) + spinners |
| Skeleton | componente existe, **nao usado** | **NAO ENCONTRADO** | usado |
| Error | toast (`sonner`) | inline `<p className="error">` (20+ locais) | bloco dedicado **com retry** (`Dashboard.tsx:52-66`) |
| Empty | **NAO ENCONTRADO** | `EmptyState` (`lib/ui.tsx:230`) em 5 locais + 5 ad-hoc | `EmptyState` (`ui.tsx:43`) em todas as 5 listas |
| Success | toast (`Footer.tsx:56`) | 1 unico caso (`Certificate.tsx:274`) | `Feedback tone="success"` (`ui.tsx:135`) |
| Toast global | **sim** (`App.tsx:14-15`) | **nao** (0 ocorrencias) | **nao** (0 ocorrencias) |
| Disabled | 68 | 115 | 12 |
| ErrorBoundary | **NAO ENCONTRADO** | **NAO ENCONTRADO** | **NAO ENCONTRADO** |
| Retry pelo usuario | nao | nao | **sim** (`Dashboard.tsx:61`) |

Nenhum dos tres tem `ErrorBoundary` — uma excecao de render derruba a arvore inteira em qualquer um deles.

### 4.7 Acessibilidade — matriz

| Metrica | web | admin | patient |
|---|---|---|---|
| `aria-*` | 51 | 304 | 64 |
| `role=` | 10 | 68 | 7 |
| `alt=` | 4 (todas dinamicas) | 13 (5 com `alt=""`) | 3 (2 com `alt=""`) |
| `label htmlFor` | **1** | **3** | **7** |
| `:focus-visible` | 55 (53 em `ui/`) | **1** (`styles.css:2826`) | 7 |
| Regra global `:focus-visible` | **nao** | **nao** | **sim** (`styles.css:99-102`) |
| `outline-none` / `outline: 0` | 44 (Tailwind, com ring) | **6 `outline: 0` em inputs** (`styles.css:36,742,744,760,1592`) | 3 (compensados por ring) |
| `<div onClick>` | 0 | **2** (`lib/ui.tsx:208-209`) | 0 |
| `prefers-reduced-motion` | 1 (`index.css:142`) | 4 (`styles.css:1570,1968,2060,2412`) | 4 (`styles.css:104,238,353,416`) |
| Alvo de toque minimo | — | **30px** (`styles.css:131`) | **44px** (`AppShell.tsx:77`) |

Leitura: o admin tem o maior volume bruto de `aria-*`/`role=` (304/68), mas e o unico sem estado de foco por teclado nos campos (`outline: 0` em 5 seletores contra 1 unica regra `:focus-visible`) e com alvos de toque de 30px. O patient tem o menor volume bruto mas a base mais consistente (foco global, labels associadas, 44px, plural correto nos `aria-label`). Os tres tem pouquissimas labels associadas por `htmlFor` (1/3/7).

### 4.8 Responsividade — matriz

| | web | admin | patient |
|---|---|---|---|
| Breakpoints Tailwind em `.tsx` | 219 | **0** | 33 |
| Media queries CSS | 1 | **31** | 5 |
| Breakpoints CSS usados | — | 640, 720(x9), 760(x2), 860, 900(x5), 1024, 1080, 1150, 1180, + `min-width:861px and max-height:800px` | 767 |
| Alinhamento com `tailwind.config` (`xs480/sm640/md768/lg1024/xl1280/2xl1440`) | total | **nenhum**, exceto 640 e 1024 | 767 ≈ `md` |
| Larguras fixas >=100px | 5 (todas em `components/ui/`) | **52 em CSS** (maior: `min-width: 676px` em `:1121`) | 1 (`min-h-[104px]`) |
| `env(safe-area-inset-*)` | nao | **NAO ENCONTRADO** no `AppShell` equivalente | **sim** (`AppShell.tsx:122,151,159`) |
| Protecao contra scroll-x | `index.css:117-119` | nao encontrada equivalente global | `styles.css:71-73` |

O admin e o unico cujos breakpoints nao derivam de um sistema: 10 valores distintos de `max-width`, sendo 720px o mais usado (9x) — valor que nao existe no `tailwind.config.ts` que o proprio app carrega.

### 4.9 Formularios — matriz

| | web | admin | patient |
|---|---|---|---|
| `<form>` com `onSubmit` | 2 | 3 (+ N modais **sem `<form>`**) | 3 |
| `react-hook-form` instalado | **sim** (`^7.61.1`) | nao | nao |
| `zod` instalado (front) | **sim** (`^3.25.76`) | nao | nao |
| RHF/zod **usados nas telas** | **nao** (0 `useForm`) | nao | nao |
| Ponte shadcn↔RHF disponivel | `components/ui/form.tsx:4,75,111` — **nao consumida** | nao existe | nao existe |
| `<label>` associada | **NAO ENCONTRADO** (placeholders) | envolvente sem `htmlFor` (`Login.tsx:92-93`) | **`htmlFor` correto** (`Login.tsx:131,146,163,179`) |
| Validacao | `required` HTML (`Appointment.tsx:195,205,213`) | manual (`isValidCPF` em `lib/ui.tsx:346`) | manual (`useState`) |
| Erro visivel | **toast** (`Appointment.tsx:100,108`) | inline `<p className="error">` (`Login.tsx:94`) | inline `<Feedback>` (`Login.tsx:203`) |
| Estado de envio | `isPending` no botao (`:303-305`) | `isPending` no botao (`Finance.tsx:371-372`) | `isSubmitting` + spinner (`Login.tsx:205-206`) |

Nenhum dos 8 formularios dos tres apps usa uma biblioteca de formulario, apesar de `react-hook-form` + `zod` + `@hookform/resolvers` estarem instalados no web e de `components/ui/form.tsx` estar pronto para uso.

### 4.10 Stack — resumo comparativo

| | web | admin | patient |
|---|---|---|---|
| Pacote | `@marcela/web` | `@marcela/admin` | `@marcela/patient` |
| React | 18.3.1 | 18.3.1 | 18.3.1 |
| react-router-dom | 6.30.3 | 6.30.3 | 6.30.3 |
| Tailwind | 3.4.19 (usado) | 3.4.19 (**config sem uso**) | 3.4.19 (usado) |
| react-query | 5.100.6 | 5.100.6 | 5.100.6 |
| Componentes | **shadcn/ui + 28 Radix** | **nenhuma lib** | **propria minima** |
| Deps de producao | 44 | 9 | 7 |
| Toasts | `sonner` 1.7.4 | — | — |
| Graficos | `recharts` 2.15.4 | `recharts` 2.15.4 | — |
| Porta dev | 5173 (padrao) | 5174 | 5175 |
| Build | Vite 5.4.19 + SWC | Vite 5.4.19 + SWC | Vite 5.4.19 + SWC |

React, router, Tailwind, react-query, Vite, lucide-react, date-fns, axios e TypeScript estao na **mesma versao** nos tres. A divergencia esta inteiramente na camada de apresentacao.

---

## 5. Itens NAO ENCONTRADOS (resumo)

- `createBrowserRouter` — em nenhum dos tres apps (todos usam `<BrowserRouter>` + `<Routes>`)
- `ErrorBoundary` — em nenhum dos tres
- Uso de `Skeleton` no `apps/web` (componente existe em `ui/skeleton.tsx`, nao e consumido)
- Qualquer `Skeleton`/`animate-pulse` no `apps/admin`
- Empty state em `apps/web/src/components/*.tsx`
- `useForm`/`zodResolver` consumido em qualquer tela dos tres apps
- `@tailwind`/`@apply` em `apps/admin/src/styles.css`
- Regra global `:focus-visible` em `apps/web/src/index.css` e em `apps/admin/src/styles.css`
- `apps/admin/src/index.css` e `apps/patient/src/index.css` (declarados nos respectivos `components.json`, inexistentes)
- `apps/admin/src/components/ui/` e `apps/patient/src/components/ui/` (aliases declarados nos `components.json`, inexistentes)
- Tema escuro (`.dark`) em admin e patient
- `env(safe-area-inset-*)` em `apps/admin` (presente so no patient)
- Sistema de toast em admin e patient
- Pacote compartilhado de UI ou tokens em `packages/` (so existe `packages/database`)