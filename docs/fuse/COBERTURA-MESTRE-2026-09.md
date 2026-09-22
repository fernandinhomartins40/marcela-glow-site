# Cobertura mestre da modernização — Marcela Glow

Fonte de verdade operacional para o Goal. Conferida contra `apps/web/src/pages/Index.tsx`, `apps/admin/src/AdminApp.tsx` e `pages/AdminPanel.tsx`, `apps/patient/src/main.tsx`, `pages/Dashboard.tsx` e `components/AppShell.tsx` em 22/09/2026. O inventário detalhado de componentes e o diagnóstico histórico permanecem em `UX-UI-INVENTORY.md` e `UX-UI-AUDIT.md`.

**Legenda:** `M` mapeado no código; `D` diagnosticado no inventário/auditoria; `I` direção aprovada implementada na superfície; `V` fluxo e aparência validados em execução. `P` = pendente. Build e teste estático não contam como `V`. A coluna visual exige 320/390, 768, 1024 e 1440 px, além de altura curta, zoom 200%, teclado e dados vazios/longos. Nenhuma superfície recebe `V` sem essa evidência.

## Site público — 11 superfícies

| ID | Superfície/entrada | Evidência | Estado | Visual e interação | Próxima verificação |
| --- | --- | --- | --- | --- | --- |
| W01 | Header, navegação e menu móvel | `components/Header.tsx` | M/D/I | P | Logo, menu, âncoras, foco, scroll |
| W02 | Hero, três slides e CTAs | `components/Hero.tsx`, `index.css` | M/D/I | P | Conferir visualmente foto/fundo aprovados em 320/390/768/1024/1440, crop, legibilidade, CMS e interação; sem navegador ainda não há `V` |
| W03 | Faixa editorial | `components/Marquee.tsx` | M/D | P | Movimento reduzido, corte |
| W04 | Sobre | `components/About.tsx` | M/D/I | P | Retrato, texto, CTA e override CMS |
| W05 | Protocolos | `components/Procedures.tsx` | M/D | P | Cards, links, dados longos |
| W06 | Tecnologia | `components/Technology.tsx` | M/D | P | Conteúdo, ordem responsiva |
| W07 | Depoimentos | `components/Testimonials.tsx` | M/D | P | Estados vazio/longo e privacidade |
| W08 | Solicitar avaliação | `components/Appointment.tsx` | M/D | P | Erro, envio duplo, continuidade no CRM/portal |
| W09 | Rodapé e contatos | `components/Footer.tsx` | M/D/I | P | Logo, links e foco |
| W10 | Temas/SEO/CMS dinâmico | `components/Theme.tsx`, `pages/Index.tsx`, `hooks/useLanding.ts` | M/D | P | Tokens editáveis, falha API, meta tags |
| W11 | Página não encontrada | `pages/NotFound.tsx` | M/D | P | Idioma, caminho de volta |

## CRM — 25 superfícies

O acesso sem token usa `pages/Login.tsx`; as 12 seções autenticadas são valores de `/:section`, não 12 `<Route>` separados. Cada seção mantém os papéis e permissões definidos em `NAV_GROUPS`; operações clínicas e financeiras são protegidas na API.

| ID | Superfície/entrada | Evidência | Estado | Visual e interação | Próxima verificação |
| --- | --- | --- | --- | --- | --- |
| A01 | Acesso da equipe | `pages/Login.tsx` | M/D/I | P | Teclado, erro, demo, marca |
| A02 | Shell, lateral, cabeçalho, barra PWA | `AdminApp.tsx`, `components/AppBar.tsx` | M/D/I | P | Sete papéis, menu, altura curta |
| A03 | Hoje/dashboard | `components/Dashboard.tsx` | M/D/I | P | Pendências, agenda, permissões, dados reais |
| A04 | Agenda | `components/Schedule.tsx` | M/D | P | Dia/semana, modal, filtros, toque |
| A05 | Recepção | `components/Reception.tsx` | M/D | P | Chegada, confirmação, encaixe, status |
| A06 | Atendimento | `components/Encounter.tsx`, `components/encounter/*` | M/D | P | Fluxo chegada → consulta → saída |
| A07 | Financeiro | `components/Finance.tsx`, `Caixa.tsx`, `Receber.tsx` | M/D | P | Operar × supervisionar, erro, recibo |
| A08 | Pacientes | `components/Patients.tsx`, `components/patients/*` | M/D | P | Busca, cadastro, ficha, privacidade |
| A09 | Documentos clínicos | `components/Clinical.tsx` | M/D | P | Rascunho, assinatura, envio, certificado |
| A10 | Leads | `components/Catalog.tsx`, `components/leads/*` | M/D | P | Kanban, arraste, filtros, follow-up |
| A11 | Cadastro: procedimentos | `pages/AdminPanel.tsx` → `Procedures` | M/D | P | CRUD, campos, estados |
| A12 | Cadastro: medicamentos | `pages/AdminPanel.tsx` → `ClinicalCatalog` | M/D | P | CRUD e validação |
| A13 | Cadastro: exames | `pages/AdminPanel.tsx` → `ClinicalCatalog` | M/D | P | CRUD e validação |
| A14 | Cadastro: orientações | `pages/AdminPanel.tsx` → `ClinicalCatalog` | M/D | P | Modelos e uso clínico |
| A15 | Cadastro: modelos de documento | `pages/AdminPanel.tsx` → `DocumentTemplates` | M/D | P | Editor, prévia, salvamento |
| A16 | Site: landing/CMS | `components/Landing.tsx`, `components/landing/*` | M/D/I parcial | P | Todas as seções, upload e prévia real |
| A17 | Site: publicações | `pages/AdminPanel.tsx` → `Cms` | M/D | P | Publicar, editar, erros |
| A18 | Segurança: equipe | `components/Team.tsx` | M/D | P | Convite, perfil, revogação, auditoria |
| A19 | Segurança: auditoria LGPD | `pages/AdminPanel.tsx` → `List` | M/D | P | Busca, volume, acesso |
| A20 | Ajustes: agenda | `components/ScheduleSettings.tsx` | M/D | P | Horários, conflitos, persistência |
| A21 | Ajustes: certificado | `components/Certificate.tsx` | M/D | P | Avisos, validade, retorno |
| A22 | Ajustes: aplicativos | `components/PwaSettings.tsx` | M/D | P | Manifesto, logo, instalação |
| A23 | Modais/gavetas e formulários | `lib/ui.tsx`, `Schedule.tsx`, `patients/*` | M/D | P | Foco, Enter, cancelar, refresh |
| A24 | Erro de render na seção | `components/ErrorBoundary.tsx`, `AdminApp.tsx` | M/D/I | P | Forçar erro, manter navegação, recuperar |
| A25 | Acesso por papel e sem permissão | `AdminApp.tsx`, `lib/ui.tsx`, API | M/D/I parcial | P | Sete papéis e overrides, 403, retorno |

## Portal da paciente — 8 superfícies

| ID | Superfície/entrada | Evidência | Estado | Visual e interação | Próxima verificação |
| --- | --- | --- | --- | --- | --- |
| P01 | Entrar/criar acesso | `pages/Login.tsx` | M/D/I | P | Marca, teclado, erro, cadastro |
| P02 | Shell, lateral e barra inferior | `components/AppShell.tsx` | M/D/I | P | PWA, safe area, tablet, altura curta |
| P03 | Início | `pages/sections/Home.tsx` | M/D/I | P | Consulta, plano, mensagens, documentos reais |
| P04 | Consultas e pedido de cuidado | `pages/sections/Appointments.tsx`, `components/RequestCare.tsx` | M/D | P | Disponibilidade, envio, status |
| P05 | Jornada/lista | `pages/sections/Jornada.tsx` | M/D | P | Ativo, pausado, concluído, vazio |
| P06 | Jornada/detalhe e ações | `pages/sections/JornadaDetalhe.tsx`, `JornadaAcoes.tsx` | M/D | P | Cuidados, foto, sessão, recuperação |
| P07 | Receitas e documentos | `pages/sections/Prescriptions.tsx` | M/D | P | Download, expiração, erro |
| P08 | Mensagens e orientações | `pages/sections/Messages.tsx` | M/D | P | Leitura, envio, espera, erro |

## Componentes e estados transversais

O índice acima contabiliza **44 superfícies** (11 site + 25 CRM + 8 portal). É um índice de páginas e áreas de trabalho, não uma alegação de que 100% dos componentes, variantes, estados ou fluxos foram auditados. A segunda camada deve cruzar cada export de `apps/web/src/components`, `apps/admin/src/components` e `apps/patient/src/components` com as superfícies acima; o inventário antigo lista exports principais, mas ainda falta marcar cada modal, estado e viewport. Os três `ErrorBoundary` globais e o de área do CRM existem; o teste de erro forçado e a observação visual continuam pendentes.

Estados ainda sem evidência integral: carregando, vazio, erro HTTP, erro de render, sucesso, offline, sem permissão, sessão expirada, envio duplo, dados extensos e atualização durante edição. Viewports ainda sem evidência integral: 320/390, 768, 1024, 1440, paisagem, pouca altura, zoom 200% e teclado virtual. Não inferir `V` a partir de screenshot aprovado, CSS, build ou teste estático.

## Conexões ponta a ponta a validar

1. Site → solicitação de avaliação → CRM recepção/agenda → confirmação → portal da paciente.
2. CRM atendimento → sessão/plano/documento → aviso → jornada/documentos no portal.
3. CMS/editor → publicação/fallback → página pública em todos os viewports.
4. Permissão por papel → menu → dashboard → rota → API, incluindo overrides individuais.
5. Recepção → consulta → saída → cobrança/caixa, sem automação clínica implícita.
