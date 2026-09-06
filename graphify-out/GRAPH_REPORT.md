# Graph Report - marcela-glow-site  (2026-09-06)

## Corpus Check
- 226 files · ~423,362 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1956 nodes · 3504 edges · 181 communities (92 shown, 68 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40b31447`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- format.ts
- cn
- devDependencies
- Landing.tsx
- Encounter.tsx
- hooks/use-toast.ts
- sidebar.tsx
- agenda.tsx
- utils.ts
- middleware/auth.ts
- scheduling.ts
- admin.ts
- appointments.ts
- routes/clinical.ts
- tasks
- database/package.json
- routes/landing.ts
- lib/ui.tsx
- compilerOptions
- seed-demo.ts
- compilerOptions
- compilerOptions
- scripts
- useSection
- button.tsx
- web/src/lib/api.ts
- context-menu.tsx
- components/Dashboard.tsx
- ScheduleSettings.tsx
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
- admin/package.json
- Index.tsx
- compilerOptions
- compilerOptions
- chart.tsx
- compilerOptions
- scripts
- Clinical.tsx
- scripts
- Procedures.tsx
- api/package.json
- source
- sheet.tsx
- patient.ts
- check-encoding.js
- Appointment.tsx
- breadcrumb.tsx
- patient/package.json
- navigation-menu.tsx
- sections.tsx
- seed-demo-data.js
- Dra. Marcela Duch — Site e Plataforma
- seed-demo-users.js
- eslint
- cors
- remote-deploy.sh
- remote-health-check.sh
- seed.ts
- eslint-plugin-react-refresh
- tailwindcss
- @types/react
- @types/node
- typescript-eslint
- @types/react
- admin/public/sw.js
- docker-entrypoint.sh
- dotenv
- nodemailer
- @aws-sdk/s3-request-presigner
- @types/cors
- qrcode
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- vite
- @types/react-dom
- typescript
- @radix-ui/react-avatar
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
- @radix-ui/react-context-menu
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-navigation-menu
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-select
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- react-day-picker
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
- components/ui.tsx
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
- Footer.tsx
- TemplateForm.tsx
- Auditoria e plano de entrega
- toggle-group.tsx
- alert.tsx
- "DocumentTemplate"
- Appointments.tsx
- AppError
- patient/src/pages/Login.tsx
- pages/Dashboard.tsx
- table.tsx
- input-otp.tsx
- Testimonials.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `errorMessage()` - 56 edges
3. `"Tenant"` - 24 edges
4. `api` - 24 edges
5. `AppError` - 19 edges
6. `formatDateBR()` - 19 edges
7. `Field()` - 18 edges
8. `useSection()` - 18 edges
9. `compilerOptions` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `submit()` --calls--> `errorMessage()`  [EXTRACTED]
  apps/admin/src/pages/Login.tsx → apps/admin/src/lib/ui.tsx
- `submit()` --calls--> `getErrorMessage()`  [EXTRACTED]
  apps/patient/src/pages/Login.tsx → apps/patient/src/lib/api.ts
- `ContextMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/context-menu.tsx → apps/web/src/lib/utils.ts
- `ResizableHandle()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/resizable.tsx → apps/web/src/lib/utils.ts
- `ResizablePanelGroup()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/resizable.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (181 total, 68 thin omitted)

### Community 0 - "format.ts"
Cohesion: 0.17
Nodes (19): NextAppointment(), SummaryStat(), AppointmentsList(), SessionsList(), Appointment, AppointmentStatus, PrescriptionStatus, APPOINTMENT_STATUS (+11 more)

### Community 1 - "cn"
Cohesion: 0.06
Nodes (49): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Card, CardContent (+41 more)

### Community 2 - "devDependencies"
Cohesion: 0.04
Nodes (44): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+36 more)

### Community 3 - "Landing.tsx"
Cohesion: 0.07
Nodes (40): ImageCropper(), onPointerMove(), pick(), scaleFactor(), submit(), zoom(), Bloco(), cap() (+32 more)

### Community 4 - "Encounter.tsx"
Cohesion: 0.22
Nodes (16): DocumentKind, SignDocumentPrompt(), EncounterDocuments(), EncounterSessions(), SessionQuickForm(), RecordForm(), RecordTimeline(), EncounterData (+8 more)

### Community 5 - "hooks/use-toast.ts"
Cohesion: 0.09
Nodes (29): App(), queryClient, Toaster(), ToasterProps, Toast, ToastAction, ToastActionElement, ToastClose (+21 more)

### Community 6 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 7 - "agenda.tsx"
Cohesion: 0.11
Nodes (38): LinkPatientModal(), NewEncounterModal(), TodayAgenda(), EncounterDetail(), AgendaEntry, NewAppointment(), Procedure, AppointmentDrawer() (+30 more)

### Community 8 - "utils.ts"
Cohesion: 0.07
Nodes (17): Badge(), BadgeProps, badgeVariants, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+9 more)

### Community 9 - "middleware/auth.ts"
Cohesion: 0.20
Nodes (13): ForbiddenError, UnauthorizedError, JwtPayload, verifyToken(), effectivePermissions(), rolePermissions, authenticate(), Express (+5 more)

### Community 10 - "scheduling.ts"
Cohesion: 0.17
Nodes (20): addDaysISO(), BLOCKING_STATUSES, BusyInterval, checkSlotAvailable(), clinicTimeToUtc(), clinicWeekday(), ConflictCheck, DayAvailability (+12 more)

### Community 11 - "admin.ts"
Cohesion: 0.07
Nodes (22): acceptInviteSchema, blockSchema, blogPostSchema, businessHoursSchema, cmsPageSchema, fileCompleteSchema, filePresignSchema, inviteSchema (+14 more)

### Community 12 - "appointments.ts"
Cohesion: 0.11
Nodes (24): sendPatientPush(), CLINIC_TIMEZONE, AppointmentMessageInput, buildMessage(), buildWhatsAppLink(), firstName(), formatDateLong(), formatTime() (+16 more)

### Community 13 - "routes/clinical.ts"
Cohesion: 0.07
Nodes (48): availableSignatureLevel(), checkCompliance(), ComplianceCheck, CONTROL_LABELS, DOCUMENT_LABELS, DocumentKind, formatItemLine(), highestControl() (+40 more)

### Community 14 - "tasks"
Cohesion: 0.07
Nodes (30): ^build, .env*, ^lint, .next/**, !.next/cache/**, $TURBO_DEFAULT$, dependsOn, inputs (+22 more)

### Community 15 - "database/package.json"
Cohesion: 0.07
Nodes (28): bcryptjs, dependencies, bcryptjs, @prisma/client, devDependencies, prisma, tsx, @types/bcryptjs (+20 more)

### Community 16 - "routes/landing.ts"
Cohesion: 0.06
Nodes (41): aboutSchema, appointmentSchema, footerSchema, heroSchema, heroSlideSchema, hslColor, IMAGE_TARGETS, imageSlot (+33 more)

### Community 17 - "lib/ui.tsx"
Cohesion: 0.12
Nodes (43): KIND_LABEL, ClinicalAlerts(), DOC_KIND, DOC_STATUS, PatientDetail(), RECORD_TYPE, FORM_TABS, FormTab (+35 more)

### Community 18 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 19 - "seed-demo.ts"
Cohesion: 0.17
Nodes (15): anos(), cpf(), DEPOIMENTOS, dia(), email(), EXAMES, LEADS, main() (+7 more)

### Community 20 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 21 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 22 - "scripts"
Cohesion: 0.08
Nodes (25): devDependencies, turbo, typescript, engines, node, typescript, name, packageManager (+17 more)

### Community 23 - "useSection"
Cohesion: 0.19
Nodes (11): About(), AboutContent, FALLBACK, FALLBACK, TechContent, TechItem, Technology(), SectionId (+3 more)

### Community 24 - "button.tsx"
Cohesion: 0.11
Nodes (21): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+13 more)

### Community 25 - "web/src/lib/api.ts"
Cohesion: 0.13
Nodes (19): formatDay(), groupByPeriod(), PERIODS, SlotPicker(), api, AppointmentPayload, authApi, availabilityApi (+11 more)

### Community 26 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 27 - "components/Dashboard.tsx"
Cohesion: 0.29
Nodes (7): Consulta, Dashboard(), DashboardData, diaCurto(), dinheiro(), hora(), Receita()

### Community 28 - "ScheduleSettings.tsx"
Cohesion: 0.22
Nodes (8): BusinessHour, BusinessHours(), Durations(), update(), Procedure, ScheduleBlock, ScheduleSettings(), WEEKDAYS

### Community 29 - "fetch_instagram_professional_assets.py"
Cohesion: 0.24
Nodes (19): Any, Path, caption_from_node(), collect_posts(), feed_url(), fetch_feed_nodes(), http_download(), http_json() (+11 more)

### Community 30 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, axios, date-fns, lucide-react, react, react-dom, react-router-dom, recharts (+11 more)

### Community 31 - "AdminApp.tsx"
Cohesion: 0.10
Nodes (25): AdminApp(), groupOf(), hintOf(), initials(), labelOf(), NAV_GROUPS, NAV_ITEMS, queryClient (+17 more)

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
Nodes (17): devDependencies, autoprefixer, eslint-plugin-react-hooks, globals, postcss, tailwindcss-animate, @types/react-dom, typescript (+9 more)

### Community 40 - "errorMessage"
Cohesion: 0.08
Nodes (35): Cms(), Content, ContentForm(), Lead, LeadForm(), Leads(), Procedure, ProcedureForm() (+27 more)

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
Nodes (17): devDependencies, autoprefixer, eslint, globals, postcss, tailwindcss, tailwindcss-animate, @types/node (+9 more)

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
Nodes (13): dependencies, @radix-ui/react-aspect-ratio, @radix-ui/react-dialog, @radix-ui/react-popover, @radix-ui/react-separator, @radix-ui/react-slot, react-router-dom, react-router-dom (+5 more)

### Community 51 - "admin/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 52 - "Index.tsx"
Cohesion: 0.16
Nodes (15): Header(), FALLBACK, FALLBACK_IMAGES, Hero(), HeroContent, HeroSlide, seguro(), Theme() (+7 more)

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

### Community 57 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, typecheck

### Community 58 - "Clinical.tsx"
Cohesion: 0.12
Nodes (15): CATALOG_META, CatalogForm(), CatalogItem, CatalogKind, ClinicalCatalog(), ClinicalDocument, Compliance, Control (+7 more)

### Community 59 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, typecheck

### Community 60 - "Procedures.tsx"
Cohesion: 0.33
Nodes (5): FALLBACK, FALLBACK_PROCEDURES, Procedures(), ProceduresContent, proceduresApi

### Community 61 - "api/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, test (+1 more)

### Community 62 - "source"
Cohesion: 0.22
Nodes (8): posts, source, biography, category, followers, fullName, profileUrl, username

### Community 63 - "sheet.tsx"
Cohesion: 0.25
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 64 - "patient.ts"
Cohesion: 0.10
Nodes (30): audit(), signToken(), escapeHtml(), mailerConfigured, MailInput, port, publicBaseUrl(), renderHtml() (+22 more)

### Community 65 - "check-encoding.js"
Cohesion: 0.22
Nodes (7): extensions, findings, fs, ignoredDirs, mojibakePatterns, path, roots

### Community 66 - "Appointment.tsx"
Cohesion: 0.32
Nodes (7): Appointment(), AppointmentContent, contactBlocks, FALLBACK, formatChosenSlot(), appointmentsApi, getErrorMessage()

### Community 67 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 68 - "patient/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 69 - "navigation-menu.tsx"
Cohesion: 0.29
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 71 - "sections.tsx"
Cohesion: 0.15
Nodes (19): AttachmentRow(), AttachmentsList(), DOCUMENT_TITLES, NotificationsPanel(), PrescriptionsList(), Attachment, DocumentKind, enablePushNotifications() (+11 more)

### Community 72 - "seed-demo-data.js"
Cohesion: 0.14
Nodes (17): {
  AppointmentStatus, CatalogKind, ContentStatus, DocumentKind, Gender,
  LeadStatus, MaritalStatus, MedicationControl, MessageSender,
  NotificationChannel, PrescriptionStatus, PrismaClient, RecordType, UserRole,
  BloodType,
}, bcrypt, cpf(), DEPOIMENTOS, dia(), email(), EXAMES, LEADS (+9 more)

### Community 73 - "Dra. Marcela Duch — Site e Plataforma"
Cohesion: 0.29
Nodes (6): Ambiente local, Deploy, Dra. Marcela Duch — Site e Plataforma, Mapa do codigo (Graphify), Marcela Glow platform, Stack

### Community 74 - "seed-demo-users.js"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient, Permission, UserRole }

### Community 77 - "remote-deploy.sh"
Cohesion: 1.00
Nodes (3): compose(), rollback(), remote-deploy.sh script

### Community 78 - "remote-health-check.sh"
Cohesion: 0.83
Nodes (3): check_page(), dump_diagnostics(), remote-health-check.sh script

### Community 136 - "components/ui.tsx"
Cohesion: 0.18
Nodes (17): Intent, formatDayLabel(), groupByPeriod(), PERIODS, SlotPicker(), cn(), EmptyState(), Feedback() (+9 more)

### Community 161 - ""Tenant""
Cohesion: 0.18
Nodes (25): "Appointment", "NewsletterSubscriber", "Procedure", "Tenant", "Testimonial", "User", "Attachment", "BlogPost" (+17 more)

### Community 166 - "marcela-glow-site"
Cohesion: 0.25
Nodes (7): Como investigar este codigo, Convencoes, Divida conhecida, Manter este arquivo vivo, Mapa da arquitetura, marcela-glow-site, Onde o grafo NAO ajuda

### Community 167 - "Footer.tsx"
Cohesion: 0.33
Nodes (6): FALLBACK, Footer(), FooterContent, formatPhone(), quickLinks, newsletterApi

### Community 168 - "TemplateForm.tsx"
Cohesion: 0.10
Nodes (38): DocumentKind, DocumentTemplate, Block, BLOCK_GROUP_META, BLOCK_META, BlockGroup, BlockType, blocosPadrao() (+30 more)

### Community 169 - "Auditoria e plano de entrega"
Cohesion: 0.09
Nodes (21): 1. Envio de e-mail (resolvido no codigo), 2. Testes automatizados (parcialmente resolvido), 3. Fluxo de storage nunca validado ponta a ponta, Auditoria e plano de entrega, Campos do banco sem lugar no painel, Como tudo se conecta, Complexidade: onde de fato esta, Divida menor, registrada (+13 more)

### Community 170 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 171 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 172 - ""DocumentTemplate""
Cohesion: 0.50
Nodes (3): "DocumentTemplate", "Tenant", "User"

### Community 173 - "Appointments.tsx"
Cohesion: 0.29
Nodes (5): RequestCare(), MessagesList(), DashboardData, AppointmentsPage(), MessagesPage()

### Community 175 - "AppError"
Cohesion: 0.10
Nodes (21): allowedOrigins, app, limiter, AppError, NotFoundError, requireAdmin(), assertTenantKeepsAdmin(), resolveTenantBySlug() (+13 more)

### Community 176 - "patient/src/pages/Login.tsx"
Cohesion: 0.18
Nodes (11): Splash(), useAbertura(), tenantSlug, TOKEN_KEY, ehAplicativoInstalado(), registrarModoAplicativo(), useAplicativoInstalado(), queryClient (+3 more)

### Community 177 - "pages/Dashboard.tsx"
Cohesion: 0.23
Nodes (11): AppShell(), SectionId, SECTIONS, DashboardSkeleton(), fetchDashboard(), getErrorMessage(), logout(), firstName() (+3 more)

### Community 178 - "table.tsx"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 179 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 180 - "Testimonials.tsx"
Cohesion: 0.33
Nodes (5): FALLBACK, FALLBACK_TESTIMONIALS, Testimonials(), TestimonialsContent, testimonialsApi

## Knowledge Gaps
- **763 isolated node(s):** `demoAdmin`, `demoStaff`, `demoPatient`, `Tone`, `BusyInterval` (+758 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 850 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `breadcrumb.tsx`, `command.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `utils.ts`, `toggle-group.tsx`, `alert.tsx`, `form.tsx`, `carousel.tsx`, `table.tsx`, `input-otp.tsx`, `chart.tsx`, `button.tsx`, `web/src/lib/api.ts`, `context-menu.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `errorMessage()` connect `errorMessage` to `Landing.tsx`, `Encounter.tsx`, `agenda.tsx`, `TemplateForm.tsx`, `lib/ui.tsx`, `Clinical.tsx`, `ScheduleSettings.tsx`, `AdminApp.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `devDependencies`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react`, `react-dom`, `react-hook-form`, `react-resizable-panels`, `recharts`, `sonner`, `tailwind-merge`, `tailwindcss-animate`, `@tanstack/react-query`, `vaul`, `zod`, `@radix-ui/react-avatar`, `axios`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `@hookform/resolvers`, `input-otp`, `lucide-react`, `next-themes`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-context-menu`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-select`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `react-day-picker`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `demoAdmin`, `demoStaff`, `demoPatient` to the rest of the system?**
  _763 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06352087114337568 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Landing.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07077922077922078 - nodes in this community are weakly interconnected._