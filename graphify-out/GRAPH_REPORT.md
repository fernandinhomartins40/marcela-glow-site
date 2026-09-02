# Graph Report - marcela-glow-site  (2026-09-02)

## Corpus Check
- 203 files · ~348,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1784 nodes · 3156 edges · 169 communities (81 shown, 68 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `712f10cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sections.tsx
- cn
- devDependencies
- Landing.tsx
- lib/ui.tsx
- hooks/use-toast.ts
- sidebar.tsx
- Schedule.tsx
- utils.ts
- middleware/auth.ts
- scheduling.ts
- admin.ts
- drawer.tsx
- routes/clinical.ts
- tasks
- database/package.json
- routes/landing.ts
- ficha.tsx
- compilerOptions
- patient.ts
- compilerOptions
- compilerOptions
- scripts
- useSection
- pagination.tsx
- web/src/lib/api.ts
- routes/auth.ts
- appointments.ts
- context-menu.tsx
- fetch_instagram_professional_assets.py
- dependencies
- AdminApp.tsx
- devDependencies
- compilerOptions
- graph-map.js
- compilerOptions
- command.tsx
- compilerOptions
- admin/components.json
- devDependencies
- errorMessage
- dependencies
- patient/components.json
- dependencies
- devDependencies
- web/components.json
- compilerOptions
- form.tsx
- carousel.tsx
- compilerOptions
- dependencies
- cloudSignature.ts
- Index.tsx
- compilerOptions
- compilerOptions
- chart.tsx
- compilerOptions
- admin/package.json
- input-otp.tsx
- patient/package.json
- button.tsx
- api/package.json
- source
- sheet.tsx
- api/src/index.ts
- check-encoding.js
- Appointment.tsx
- breadcrumb.tsx
- tabs.tsx
- navigation-menu.tsx
- agenda.tsx
- Footer.tsx
- Dra. Marcela Duch — Site e Plataforma
- seed-demo-users.js
- Encounter.tsx
- cors
- remote-deploy.sh
- remote-health-check.sh
- seed.ts
- eslint-plugin-react-hooks
- postcss
- tailwindcss-animate
- @types/node
- @types/react-dom
- vite
- admin/public/sw.js
- docker-entrypoint.sh
- dotenv
- nodemailer
- @aws-sdk/s3-request-presigner
- @types/cors
- qrcode
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- tailwindcss
- @types/react-dom
- typescript
- typescript-eslint
- patient/public/sw.js
- axios
- class-variance-authority
- clsx
- cmdk
- date-fns
- embla-carousel-react
- @hookform/resolvers
- input-otp
- lucide-react
- next-themes
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react
- react-dom
- react-hook-form
- react-resizable-panels
- react-router-dom
- recharts
- sonner
- tailwind-merge
- tailwindcss-animate
- @tanstack/react-query
- vaul
- zod
- "Tenant"
- 20260804000000_scheduling/migration.sql
- 20260805000000_clinical_records/migration.sql
- marcela-glow-site
- Auditoria e plano de entrega
- alert.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `errorMessage()` - 46 edges
3. `"Tenant"` - 24 edges
4. `formatDateBR()` - 19 edges
5. `api` - 19 edges
6. `AppError` - 18 edges
7. `useSection()` - 18 edges
8. `compilerOptions` - 18 edges
9. `compilerOptions` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `AlertDescription` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert.tsx → apps/web/src/lib/utils.ts
- `AlertTitle` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert.tsx → apps/web/src/lib/utils.ts
- `AlertDialogContent` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts
- `AlertDialogDescription` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (169 total, 68 thin omitted)

### Community 0 - "sections.tsx"
Cohesion: 0.05
Nodes (77): AppShell(), SectionId, SECTIONS, NextAppointment(), SummaryStat(), Intent, RequestCare(), AppointmentsList() (+69 more)

### Community 1 - "cn"
Cohesion: 0.06
Nodes (52): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Card, CardContent (+44 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (43): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+35 more)

### Community 3 - "Landing.tsx"
Cohesion: 0.10
Nodes (29): ImageCropper(), onPointerMove(), pick(), scaleFactor(), submit(), zoom(), Fold(), HeadingFields() (+21 more)

### Community 4 - "lib/ui.tsx"
Cohesion: 0.11
Nodes (29): CATALOG_META, CatalogForm(), CatalogItem, CatalogKind, ClinicalDocument, Compliance, Control, CONTROL_META (+21 more)

### Community 5 - "hooks/use-toast.ts"
Cohesion: 0.09
Nodes (29): App(), queryClient, Toaster(), ToasterProps, Toast, ToastAction, ToastActionElement, ToastClose (+21 more)

### Community 6 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 7 - "Schedule.tsx"
Cohesion: 0.15
Nodes (29): TodayAgenda(), EncounterDetail(), AppointmentDrawer(), DayList(), Schedule(), WeekGrid(), Blocks(), Appointment (+21 more)

### Community 8 - "utils.ts"
Cohesion: 0.08
Nodes (18): Badge(), BadgeProps, badgeVariants, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+10 more)

### Community 9 - "middleware/auth.ts"
Cohesion: 0.11
Nodes (25): AppError, ForbiddenError, NotFoundError, UnauthorizedError, JwtPayload, verifyToken(), authenticate(), Express (+17 more)

### Community 10 - "scheduling.ts"
Cohesion: 0.16
Nodes (21): addDaysISO(), BLOCKING_STATUSES, BusyInterval, checkSlotAvailable(), CLINIC_TIMEZONE, clinicTimeToUtc(), clinicWeekday(), ConflictCheck (+13 more)

### Community 11 - "admin.ts"
Cohesion: 0.08
Nodes (21): s3Bucket, acceptInviteSchema, blockSchema, blogPostSchema, businessHoursSchema, cmsPageSchema, fileCompleteSchema, filePresignSchema (+13 more)

### Community 12 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 13 - "routes/clinical.ts"
Cohesion: 0.11
Nodes (26): availableSignatureLevel(), checkCompliance(), ComplianceCheck, CONTROL_LABELS, DOCUMENT_LABELS, DocumentKind, formatItemLine(), highestControl() (+18 more)

### Community 14 - "tasks"
Cohesion: 0.07
Nodes (30): ^build, .env*, ^lint, .next/**, !.next/cache/**, $TURBO_DEFAULT$, dependsOn, inputs (+22 more)

### Community 15 - "database/package.json"
Cohesion: 0.07
Nodes (27): dependencies, bcryptjs, @prisma/client, devDependencies, prisma, tsx, @types/bcryptjs, typescript (+19 more)

### Community 16 - "routes/landing.ts"
Cohesion: 0.09
Nodes (23): aboutSchema, appointmentSchema, footerSchema, heroSchema, heroSlideSchema, IMAGE_TARGETS, imageSlot, isLandingSection() (+15 more)

### Community 17 - "ficha.tsx"
Cohesion: 0.15
Nodes (29): EncounterSessions(), ClinicalAlerts(), DOC_KIND, DOC_STATUS, PatientDetail(), RECORD_TYPE, FORM_TABS, FormTab (+21 more)

### Community 18 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 19 - "patient.ts"
Cohesion: 0.15
Nodes (19): signToken(), addDays(), addHours(), randomToken(), sha256(), signJsonWithPrivateKey(), buildStorageKey(), presignDownload() (+11 more)

### Community 20 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 21 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 22 - "scripts"
Cohesion: 0.08
Nodes (24): devDependencies, turbo, typescript, engines, node, turbo, typescript, name (+16 more)

### Community 23 - "useSection"
Cohesion: 0.12
Nodes (19): FALLBACK, FALLBACK_IMAGES, Hero(), HeroContent, HeroSlide, FALLBACK, TechContent, TechItem (+11 more)

### Community 24 - "pagination.tsx"
Cohesion: 0.10
Nodes (20): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+12 more)

### Community 25 - "web/src/lib/api.ts"
Cohesion: 0.13
Nodes (19): formatDay(), groupByPeriod(), PERIODS, SlotPicker(), api, AppointmentPayload, authApi, availabilityApi (+11 more)

### Community 26 - "routes/auth.ts"
Cohesion: 0.15
Nodes (14): audit(), escapeHtml(), mailerConfigured, MailInput, port, publicBaseUrl(), renderHtml(), sendMail() (+6 more)

### Community 27 - "appointments.ts"
Cohesion: 0.12
Nodes (22): sendPatientPush(), AppointmentMessageInput, buildMessage(), buildWhatsAppLink(), firstName(), formatDateLong(), formatTime(), MessageKind (+14 more)

### Community 28 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 29 - "fetch_instagram_professional_assets.py"
Cohesion: 0.24
Nodes (19): Any, Path, caption_from_node(), collect_posts(), feed_url(), fetch_feed_nodes(), http_download(), http_json() (+11 more)

### Community 30 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, axios, date-fns, lucide-react, react, react-dom, react-router-dom, recharts (+11 more)

### Community 31 - "AdminApp.tsx"
Cohesion: 0.14
Nodes (14): AdminApp(), groupOf(), hintOf(), initials(), labelOf(), NAV_GROUPS, NAV_ITEMS, queryClient (+6 more)

### Community 32 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node, @types/nodemailer, @types/qrcode (+13 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 34 - "graph-map.js"
Cohesion: 0.10
Nodes (19): areaOf(), byArea, byDir, CLAUDE_MD, cross, degree, fileById, fs (+11 more)

### Community 35 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 36 - "command.tsx"
Cohesion: 0.12
Nodes (15): Command, CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+7 more)

### Community 37 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 38 - "admin/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 39 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, eslint-plugin-react-refresh, globals, tailwindcss, @types/react, typescript (+9 more)

### Community 40 - "errorMessage"
Cohesion: 0.06
Nodes (33): Cms(), Content, ContentForm(), Lead, LEAD_COLUMNS, LeadForm(), Leads(), Procedure (+25 more)

### Community 41 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @aws-sdk/client-s3, bcryptjs, express, express-rate-limit, helmet, jsonwebtoken, @marcela/database (+11 more)

### Community 42 - "patient/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 43 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, axios, date-fns, lucide-react, react, react-dom, react-router-dom, @tanstack/react-query (+9 more)

### Community 44 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, globals, postcss, tailwindcss-animate, @types/node, @types/react (+9 more)

### Community 45 - "web/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 46 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck, strict (+6 more)

### Community 47 - "form.tsx"
Cohesion: 0.19
Nodes (12): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+4 more)

### Community 48 - "carousel.tsx"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 49 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, module, moduleResolution, outDir, rootDir, strict, target (+5 more)

### Community 50 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @radix-ui/react-avatar, @radix-ui/react-context-menu, @radix-ui/react-navigation-menu, @radix-ui/react-select, @radix-ui/react-slot, react-day-picker, @radix-ui/react-avatar (+5 more)

### Community 51 - "cloudSignature.ts"
Cohesion: 0.14
Nodes (19): hashContent(), loadConfig(), ProviderId, ProviderProfile, PROVIDERS, PublicSignatureConfig, requestToken(), saveConfig() (+11 more)

### Community 52 - "Index.tsx"
Cohesion: 0.26
Nodes (9): About(), AboutContent, FALLBACK, Marquee(), useImage(), FALLBACK, Index(), SeoContent (+1 more)

### Community 53 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 54 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 55 - "chart.tsx"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 56 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 57 - "admin/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 58 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 59 - "patient/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 60 - "button.tsx"
Cohesion: 0.24
Nodes (7): Header(), FALLBACK, FALLBACK_PROCEDURES, Procedures(), ProceduresContent, Button, proceduresApi

### Community 61 - "api/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, test (+1 more)

### Community 62 - "source"
Cohesion: 0.22
Nodes (8): posts, source, biography, category, followers, fullName, profileUrl, username

### Community 63 - "sheet.tsx"
Cohesion: 0.25
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 64 - "api/src/index.ts"
Cohesion: 0.13
Nodes (16): allowedOrigins, app, limiter, getVapidPublicKey(), pushConfigured, router, router, router (+8 more)

### Community 65 - "check-encoding.js"
Cohesion: 0.22
Nodes (7): extensions, findings, fs, ignoredDirs, mojibakePatterns, path, roots

### Community 66 - "Appointment.tsx"
Cohesion: 0.32
Nodes (7): Appointment(), AppointmentContent, contactBlocks, FALLBACK, formatChosenSlot(), appointmentsApi, getErrorMessage()

### Community 67 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 68 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

### Community 69 - "navigation-menu.tsx"
Cohesion: 0.29
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 71 - "agenda.tsx"
Cohesion: 0.13
Nodes (13): ClinicalCatalog(), DocumentForm(), LinkPatientModal(), NewEncounterModal(), AgendaEntry, NewAppointment(), Procedure, Team() (+5 more)

### Community 72 - "Footer.tsx"
Cohesion: 0.33
Nodes (6): FALLBACK, Footer(), FooterContent, formatPhone(), quickLinks, newsletterApi

### Community 73 - "Dra. Marcela Duch — Site e Plataforma"
Cohesion: 0.29
Nodes (6): Ambiente local, Deploy, Dra. Marcela Duch — Site e Plataforma, Mapa do codigo (Graphify), Marcela Glow platform, Stack

### Community 74 - "seed-demo-users.js"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient, Permission, UserRole }

### Community 75 - "Encounter.tsx"
Cohesion: 0.42
Nodes (8): RecordForm(), RecordTimeline(), EncounterData, MedicalRecord, RECORD_TYPES, recordTypeLabel(), ConfirmDialog(), FormRow()

### Community 77 - "remote-deploy.sh"
Cohesion: 1.00
Nodes (3): compose(), rollback(), remote-deploy.sh script

### Community 78 - "remote-health-check.sh"
Cohesion: 0.83
Nodes (3): check_page(), dump_diagnostics(), remote-health-check.sh script

### Community 161 - ""Tenant""
Cohesion: 0.18
Nodes (25): "Appointment", "NewsletterSubscriber", "Procedure", "Tenant", "Testimonial", "User", "Attachment", "BlogPost" (+17 more)

### Community 166 - "marcela-glow-site"
Cohesion: 0.25
Nodes (7): Como investigar este codigo, Convencoes, Divida conhecida, Manter este arquivo vivo, Mapa da arquitetura, marcela-glow-site, Onde o grafo NAO ajuda

### Community 169 - "Auditoria e plano de entrega"
Cohesion: 0.10
Nodes (19): 1. Envio de e-mail (resolvido no codigo), 2. Testes automatizados (parcialmente resolvido), 3. Fluxo de storage nunca validado ponta a ponta, Auditoria e plano de entrega, Como tudo se conecta, Complexidade: onde de fato esta, Divida menor, registrada, Landing: CMS com rede de seguranca (+11 more)

### Community 170 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

## Knowledge Gaps
- **702 isolated node(s):** `staffOnly`, `catalogSchema`, `itemSchema`, `documentSchema`, `DOCUMENT_INCLUDE` (+697 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 779 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `breadcrumb.tsx`, `command.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `tabs.tsx`, `utils.ts`, `hooks/use-toast.ts`, `alert.tsx`, `drawer.tsx`, `context-menu.tsx`, `form.tsx`, `carousel.tsx`, `chart.tsx`, `pagination.tsx`, `web/src/lib/api.ts`, `input-otp.tsx`, `button.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `devDependencies`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react`, `react-dom`, `react-hook-form`, `react-resizable-panels`, `react-router-dom`, `recharts`, `sonner`, `tailwind-merge`, `tailwindcss-animate`, `@tanstack/react-query`, `vaul`, `zod`, `axios`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `@hookform/resolvers`, `input-otp`, `lucide-react`, `next-themes`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `errorMessage()` connect `errorMessage` to `Landing.tsx`, `lib/ui.tsx`, `Schedule.tsx`, `agenda.tsx`, `Encounter.tsx`, `ficha.tsx`, `AdminApp.tsx`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `staffOnly`, `catalogSchema`, `itemSchema` to the rest of the system?**
  _702 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05133599831685252 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.060655737704918035 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._