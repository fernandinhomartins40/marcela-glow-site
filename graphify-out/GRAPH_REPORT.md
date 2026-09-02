# Graph Report - marcela-glow-site  (2026-09-01)

## Corpus Check
- 186 files · ~342,597 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1720 nodes · 2907 edges · 166 communities (80 shown, 67 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7efd28eb`
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
- api/src/index.ts
- scheduling.ts
- admin.ts
- errorMessage
- routes/clinical.ts
- tasks
- database/package.json
- routes/landing.ts
- Patients.tsx
- compilerOptions
- patient.ts
- compilerOptions
- compilerOptions
- scripts
- useSection
- pagination.tsx
- web/src/lib/api.ts
- Encounter.tsx
- appointments.ts
- cloudSignature.ts
- fetch_instagram_professional_assets.py
- dependencies
- AdminApp.tsx
- devDependencies
- compilerOptions
- middleware/auth.ts
- compilerOptions
- command.tsx
- compilerOptions
- admin/components.json
- devDependencies
- NewAppointment.tsx
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
- shared/src/index.ts
- Index.tsx
- compilerOptions
- compilerOptions
- chart.tsx
- compilerOptions
- admin/package.json
- ScheduleSettings.tsx
- patient/package.json
- button.tsx
- api/package.json
- source
- sheet.tsx
- shared/package.json
- check-encoding.js
- Appointment.tsx
- breadcrumb.tsx
- drawer.tsx
- navigation-menu.tsx
- select.tsx
- Footer.tsx
- card.tsx
- Dra. Marcela Duch — Site e Plataforma
- seed-demo-users.js
- alert.tsx
- input-otp.tsx
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
- cors
- helmet
- jsonwebtoken
- @marcela/database
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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `errorMessage()` - 41 edges
3. `"Tenant"` - 24 edges
4. `compilerOptions` - 18 edges
5. `AppError` - 18 edges
6. `compilerOptions` - 18 edges
7. `useSection()` - 18 edges
8. `compilerOptions` - 18 edges
9. `prisma` - 16 edges
10. `formatDateBR()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `SectionEditor()` --calls--> `errorMessage()`  [EXTRACTED]
  apps/admin/src/components/Landing.tsx → apps/admin/src/lib/ui.tsx
- `submit()` --calls--> `errorMessage()`  [EXTRACTED]
  apps/admin/src/pages/Login.tsx → apps/admin/src/lib/ui.tsx
- `AlertDialogOverlay` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts
- `AlertDialogContent` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/ui/alert-dialog.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (166 total, 67 thin omitted)

### Community 0 - "sections.tsx"
Cohesion: 0.05
Nodes (75): AppShell(), SectionId, SECTIONS, NextAppointment(), SummaryStat(), Intent, RequestCare(), AppointmentsList() (+67 more)

### Community 1 - "cn"
Cohesion: 0.07
Nodes (49): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, ContextMenuCheckboxItem, ContextMenuContent (+41 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (43): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+35 more)

### Community 3 - "Landing.tsx"
Cohesion: 0.09
Nodes (23): ImageCropper(), onPointerMove(), pick(), scaleFactor(), submit(), zoom(), formatPhone(), LandingData (+15 more)

### Community 4 - "lib/ui.tsx"
Cohesion: 0.10
Nodes (28): CATALOG_META, CatalogItem, CatalogKind, ClinicalDocument, Compliance, Control, CONTROL_META, DOC_META (+20 more)

### Community 5 - "hooks/use-toast.ts"
Cohesion: 0.09
Nodes (29): App(), queryClient, Toaster(), ToasterProps, Toast, ToastAction, ToastActionElement, ToastClose (+21 more)

### Community 6 - "sidebar.tsx"
Cohesion: 0.07
Nodes (31): Input, Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+23 more)

### Community 7 - "Schedule.tsx"
Cohesion: 0.15
Nodes (31): EncounterDetail(), TodayAgenda(), NewAppointment(), AppointmentDrawer(), DayList(), Schedule(), WeekGrid(), Blocks() (+23 more)

### Community 8 - "utils.ts"
Cohesion: 0.07
Nodes (20): Badge(), BadgeProps, badgeVariants, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+12 more)

### Community 9 - "api/src/index.ts"
Cohesion: 0.09
Nodes (25): allowedOrigins, app, limiter, AppError, NotFoundError, requireAdmin(), assertTenantKeepsAdmin(), router (+17 more)

### Community 10 - "scheduling.ts"
Cohesion: 0.11
Nodes (29): addDaysISO(), BLOCKING_STATUSES, BusyInterval, checkSlotAvailable(), CLINIC_TIMEZONE, clinicTimeToUtc(), clinicWeekday(), ConflictCheck (+21 more)

### Community 11 - "admin.ts"
Cohesion: 0.08
Nodes (26): randomToken(), buildStorageKey(), presignDownload(), presignUpload(), s3Bucket, storageConfigured, acceptInviteSchema, blockSchema (+18 more)

### Community 12 - "errorMessage"
Cohesion: 0.10
Nodes (20): Cms(), Content, ContentForm(), Lead, LEAD_COLUMNS, LeadForm(), Leads(), Procedure (+12 more)

### Community 13 - "routes/clinical.ts"
Cohesion: 0.11
Nodes (26): availableSignatureLevel(), checkCompliance(), ComplianceCheck, CONTROL_LABELS, DOCUMENT_LABELS, DocumentKind, formatItemLine(), highestControl() (+18 more)

### Community 14 - "tasks"
Cohesion: 0.07
Nodes (28): ^build, .env*, ^lint, .next/**, !.next/cache/**, $TURBO_DEFAULT$, dependsOn, inputs (+20 more)

### Community 15 - "database/package.json"
Cohesion: 0.07
Nodes (27): dependencies, bcryptjs, @prisma/client, devDependencies, prisma, tsx, @types/bcryptjs, typescript (+19 more)

### Community 16 - "routes/landing.ts"
Cohesion: 0.10
Nodes (23): aboutSchema, appointmentSchema, footerSchema, heroSchema, heroSlideSchema, IMAGE_TARGETS, imageSlot, isLandingSection() (+15 more)

### Community 17 - "Patients.tsx"
Cohesion: 0.12
Nodes (24): LinkPatientModal(), NewEncounterModal(), BLOOD_TYPES, ClinicalAlerts(), DOC_KIND, DOC_STATUS, EMPTY_FORM, FORM_TABS (+16 more)

### Community 18 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 19 - "patient.ts"
Cohesion: 0.13
Nodes (21): signToken(), getVapidPublicKey(), resolveEndsAt(), addDays(), addHours(), sha256(), signJsonWithPrivateKey(), createStaffSession() (+13 more)

### Community 20 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 21 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+15 more)

### Community 22 - "scripts"
Cohesion: 0.08
Nodes (23): devDependencies, turbo, typescript, engines, node, turbo, typescript, name (+15 more)

### Community 23 - "useSection"
Cohesion: 0.12
Nodes (19): FALLBACK, FALLBACK_IMAGES, Hero(), HeroContent, HeroSlide, FALLBACK, TechContent, TechItem (+11 more)

### Community 24 - "pagination.tsx"
Cohesion: 0.10
Nodes (20): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+12 more)

### Community 25 - "web/src/lib/api.ts"
Cohesion: 0.13
Nodes (19): formatDay(), groupByPeriod(), PERIODS, SlotPicker(), api, AppointmentPayload, authApi, availabilityApi (+11 more)

### Community 26 - "Encounter.tsx"
Cohesion: 0.11
Nodes (15): DocumentForm(), AgendaEntry, Encounter, EncounterSessions(), MedicalRecord, RECORD_TYPES, RecordTimeline(), recordTypeLabel() (+7 more)

### Community 27 - "appointments.ts"
Cohesion: 0.14
Nodes (17): audit(), pushConfigured, sendPatientPush(), stripWhatsAppMarkup(), APPOINTMENT_INCLUDE, availabilityQuerySchema, cancelSchema, confirmSchema (+9 more)

### Community 28 - "cloudSignature.ts"
Cohesion: 0.14
Nodes (19): hashContent(), loadConfig(), ProviderId, ProviderProfile, PROVIDERS, PublicSignatureConfig, requestToken(), saveConfig() (+11 more)

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
Cohesion: 0.11
Nodes (19): devDependencies, tsx, @types/bcryptjs, @types/cors, @types/express, @types/jsonwebtoken, @types/node, @types/qrcode (+11 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 34 - "middleware/auth.ts"
Cohesion: 0.21
Nodes (13): ForbiddenError, UnauthorizedError, JwtPayload, verifyToken(), effectivePermissions(), rolePermissions, authenticate(), Express (+5 more)

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

### Community 40 - "NewAppointment.tsx"
Cohesion: 0.15
Nodes (14): Certificate(), Config, Provider, ProviderId, Procedure, api, Field(), FormRow() (+6 more)

### Community 41 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, dotenv, express, express-rate-limit, web-push (+9 more)

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

### Community 51 - "shared/src/index.ts"
Cohesion: 0.15
Nodes (12): ApiError, Appointment, AppointmentStatus, AuthResponse, NewsletterSubscriber, PaginatedResponse, Procedure, Tenant (+4 more)

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

### Community 58 - "ScheduleSettings.tsx"
Cohesion: 0.22
Nodes (8): BusinessHour, BusinessHours(), Durations(), update(), Procedure, ScheduleBlock, ScheduleSettings(), WEEKDAYS

### Community 59 - "patient/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 60 - "button.tsx"
Cohesion: 0.24
Nodes (7): Header(), FALLBACK, FALLBACK_PROCEDURES, Procedures(), ProceduresContent, Button, proceduresApi

### Community 61 - "api/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 62 - "source"
Cohesion: 0.22
Nodes (8): posts, source, biography, category, followers, fullName, profileUrl, username

### Community 63 - "sheet.tsx"
Cohesion: 0.25
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 64 - "shared/package.json"
Cohesion: 0.22
Nodes (8): devDependencies, typescript, exports, typescript, main, name, private, version

### Community 65 - "check-encoding.js"
Cohesion: 0.22
Nodes (7): extensions, findings, fs, ignoredDirs, mojibakePatterns, path, roots

### Community 66 - "Appointment.tsx"
Cohesion: 0.32
Nodes (7): Appointment(), AppointmentContent, contactBlocks, FALLBACK, formatChosenSlot(), appointmentsApi, getErrorMessage()

### Community 67 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 68 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 69 - "navigation-menu.tsx"
Cohesion: 0.29
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 70 - "select.tsx"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 71 - "Footer.tsx"
Cohesion: 0.33
Nodes (6): FALLBACK, Footer(), FooterContent, formatPhone(), quickLinks, newsletterApi

### Community 72 - "card.tsx"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 73 - "Dra. Marcela Duch — Site e Plataforma"
Cohesion: 0.33
Nodes (5): Ambiente local, Deploy, Dra. Marcela Duch — Site e Plataforma, Marcela Glow platform, Stack

### Community 74 - "seed-demo-users.js"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient, Permission, UserRole }

### Community 75 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 76 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 77 - "remote-deploy.sh"
Cohesion: 1.00
Nodes (3): compose(), rollback(), remote-deploy.sh script

### Community 78 - "remote-health-check.sh"
Cohesion: 0.83
Nodes (3): check_page(), dump_diagnostics(), remote-health-check.sh script

### Community 161 - ""Tenant""
Cohesion: 0.18
Nodes (25): "Appointment", "NewsletterSubscriber", "Procedure", "Tenant", "Testimonial", "User", "Attachment", "BlogPost" (+17 more)

## Knowledge Gaps
- **686 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+681 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 765 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `breadcrumb.tsx`, `command.tsx`, `drawer.tsx`, `sidebar.tsx`, `navigation-menu.tsx`, `utils.ts`, `card.tsx`, `select.tsx`, `alert.tsx`, `input-otp.tsx`, `hooks/use-toast.ts`, `form.tsx`, `carousel.tsx`, `chart.tsx`, `pagination.tsx`, `web/src/lib/api.ts`, `button.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `errorMessage()` connect `errorMessage` to `Landing.tsx`, `lib/ui.tsx`, `ScheduleSettings.tsx`, `Schedule.tsx`, `NewAppointment.tsx`, `Patients.tsx`, `Encounter.tsx`, `AdminApp.tsx`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@radix-ui/react-toast`, `@radix-ui/react-toggle`, `devDependencies`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react`, `react-dom`, `react-hook-form`, `react-resizable-panels`, `react-router-dom`, `recharts`, `sonner`, `tailwind-merge`, `tailwindcss-animate`, `@tanstack/react-query`, `vaul`, `zod`, `axios`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `@hookform/resolvers`, `input-otp`, `lucide-react`, `next-themes`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _686 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._