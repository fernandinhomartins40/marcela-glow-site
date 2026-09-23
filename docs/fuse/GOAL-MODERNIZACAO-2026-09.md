# Goal — modernização integral Marcela Glow

## Decisão e limites

- **Decisão aprovada:** linguagem editorial clínica em mármore/nude, marrom profundo, tipografia serifada expressiva e componentes de alta legibilidade, conforme as quatro referências aprovadas em 22/09/2026.
- **Identidade preservada:** monograma e ícones do diretório `Dra_Marcela_Duch_Brand_Assets`; não redesenhar, distorcer ou rasterizar logo em UI.
- **Assets aprovados:** `hero-regeneracao-desktop-v1.png` e `hero-regeneracao-mobile-v1.png` são os fundos canônicos, respectivamente, para composições largas e compactas; a área clara à esquerda é reservada para conteúdo HTML.
- **Funcionalidades preservadas:** landing administrável, agendamento, CRM, caixa, recepção, pacientes, prontuários, planos, equipe, CMS, mensagens, documentos, jornada e autenticação.
- **Dados e regras preservados:** API Express, Prisma/PostgreSQL, permissões e fluxos clínicos existentes. Esta fase não cria automações clínicas sem regra, permissão e confirmação humana.

## Fonte de verdade e evidências

- Inventário legado completo: `docs/fuse/UX-UI-INVENTORY.md`.
- Índice mestre de 44 superfícies com estado e validação explícitos: `docs/fuse/COBERTURA-MESTRE-2026-09.md`.
- Auditoria e validações anteriores: `docs/fuse/UX-UI-AUDIT.md` e `docs/fuse/UX-UI-VALIDATION.md`.
- Mapa de dependências atualizado: `graphify-out/GRAPH_REPORT.md`.
- Direção de marca e assets: `docs/fuse/DIRECAO-MODERNIZACAO-PROPOSTA.md` e `apps/web/src/assets/generated/assets.manifest.json`.

## Cobertura de superfícies

| Área | Superfícies e fluxos incluídos | Estado |
| --- | --- | --- |
| Site público | Home, navegação, tratamentos, tecnologia, sobre, depoimentos, contato, solicitação de avaliação, CMS da landing | Fundação visual implementada; validação de todas as seções pendente |
| CRM clínico | Hoje, agenda, recepção, pacientes, prontuários, planos, caixa, avisos, equipe, configurações, site/CMS, leads e templates | Shell e dashboard redesenhados; demais superfícies mapeadas e em modernização |
| Portal da paciente | Login, início, consultas, jornada, ações da jornada, mensagens, prescrições/documentos, pedido de cuidado e PWA | Shell e tokens modernizados; jornadas internas em modernização |
| Plataforma | API, autenticação, permissões, persistência, notificações, uploads, responsividade, acessibilidade, PWA e regressões | Mapeado — validação transversal |

## Oportunidades encontradas

| Oportunidade | Decisão | Salvaguarda |
| --- | --- | --- |
| Central operacional “Seu dia, com clareza” no CRM, com confirmação e próximos passos visíveis | Implementar na fase 2 | Cada ação continua a abrir o fluxo real; nenhum estado clínico é alterado automaticamente |
| Pendências acionáveis por confirmação, chegada, cobrança e retorno | Implementar na fase 2 | Exibir origem, paciente e ação reversível; registrar feedback de sucesso/erro |
| Jornada da paciente com etapa, próximo compromisso e documentos em uma tela | Implementar na fase 3 | Dados são apenas os já autorizados para o paciente autenticado |
| Reaproveitar imagem, marca e tokens entre produtos sem acoplamento de domínios | Implementar agora | Assets duplicados apenas na camada de build de cada app; APIs não mudam |

## Fases verticais

### Fase 1 — landing pública e fundação visual

- **Objetivo:** aplicar a identidade aprovada sem perder o CMS e o agendamento.
- **Escopo:** tokens oficiais, logotipos oficiais, assets responsivos, hero, navegação, seções editoriais e rodapé.
- **Aceite:** conteúdo continua gerenciável; navegação e CTAs funcionam; desktop, tablet e mobile não cortam texto/foto; build e testes passam.
- **Rollback:** manter os fallbacks locais e a configuração remota do CMS; alterações são apenas de apresentação.

### Fase 2 — CRM operacional

- **Objetivo:** transformar o painel em uma central de trabalho clara, priorizando chegada, consulta, saída, cobrança e pendências.
- **Escopo:** shell, dashboard, listas operacionais, estados, ações de confirmação, agenda, recepção e acessibilidade.
- **Aceite:** tarefas atuais são concluíveis com teclado/toque e têm feedback; nenhuma permissão ou rota desaparece.

### Fase 3 — portal da paciente

- **Objetivo:** entregar próxima consulta, jornada, mensagens e documentos em linguagem humana mobile-first.
- **Escopo:** shell, início, navegação inferior, consulta, jornada, mensagens, documentos, ajuda e estados vazios/erro.
- **Aceite:** a pessoa identifica próxima ação e status em até três etapas significativas; PWA e sessão preservadas.

### Fase 4 — validação integral e oportunidades seguras

- **Objetivo:** fechar a cobertura em todas as rotas, estados e breakpoints e implementar somente oportunidades com fluxo ponta a ponta.
- **Escopo:** regressão, acessibilidade WCAG 2.2 AA, desempenho, testes, permissões, baixa conectividade, zoom e documentação de pendências.
- **Aceite:** matriz sem item em escopo sem decisão; evidência de build/testes; desvios explicitamente aceitos.

## Próxima ação segura

Validar visualmente em navegador os breakpoints e estados reais do site, CRM e portal; depois avançar pelas telas operacionais restantes da fase 2 e pelas jornadas internas da fase 3. Não considerar a cobertura 100% concluída antes da matriz de rotas, estados e permissões da fase 4.

## Evidência de execução — 22/09/2026

- Landing: monogramas oficiais no header e footer; fundos aprovados carregam por `<picture>` em desktop/mobile, mantendo fallback CMS.
- CRM: monograma oficial no shell escuro e título operacional do dashboard atualizado sem alterar as chamadas para `/admin/dashboard`.
- Portal: monograma oficial no shell desktop/mobile e fundo aprovado de baixa opacidade; rotas e query `patient-dashboard` preservadas.
- Verificações concluídas: `npm run check:encoding`, typecheck isolado da landing e CRM, `npm run test` com 64 testes de API aprovados, e builds Vite de `apps/web`, `apps/admin` e `apps/patient` aprovados.
- Pendência de otimização não bloqueante: os PNGs de foto/fundo aprovados têm cerca de 1,9–2,0 MB cada. A próxima fase de performance exportará variantes WebP/AVIF responsivas sem substituir os originais aprovados.

## Continuação — 22/09/2026

- Telas de acesso do CRM e do portal usam o monograma oficial. A tela do CRM usa o fundo aprovado e o retrato limpo, enquanto o portal preserva sua composição escura no desktop.
- A prévia do CMS aponta para os mesmos fallbacks de retrato, editorial, fundo e monograma do site; uploads configurados continuam prioritários.
- A seção Sobre do site passou a usar o retrato limpo como fallback; o CMS ainda pode substituí-lo.
- O início do portal passou de contadores genéricos para consulta, plano em andamento, mensagens/orientações e documentos, todos derivados da resposta autenticada existente e com navegação para as telas reais. Estados sem plano, sem mensagem e sem documento têm texto próprio.
- `npm run build` passou nos apps web, admin, patient e API; `npm run check:encoding` passou. O build registrou aviso de chunk JS acima de 500 kB no CRM, a tratar na fase de desempenho. A validação visual e de interações em navegador segue pendente.

## Continuação — permissões da central operacional

- A auditoria encontrou dados financeiros no JSON de `/admin/dashboard` para perfis que possuíam apenas `DASHBOARD_READ`; atalhos também levavam a rotas sem acesso. A resposta agora projeta cada área por permissão efetiva, e o CRM apresenta somente cartões e ações que o perfil pode usar.
- Testes de regressão cobrem papéis padrão e uma concessão isolada de dashboard; os testes de navegação refletem os destinos por perfil. API e CRM compilam, 68 testes da API, 23 testes do CRM e a verificação de encoding passaram.
- A inspeção em navegador foi tentada, mas o navegador integrado não estava disponível. Continua pendente validação visual em larguras e alturas intermediárias e execução ponta a ponta com backend/banco descartável; a cobertura integral do Goal não está concluída.
- Lint ainda não é um gate confiável do monorepo: a API não possui configuração compatível com ESLint 9 e o CRM acusa 24 erros já espalhados por componentes legados (`no-explicit-any`), além de avisos. A correção dessa infraestrutura fica rastreada para a fase transversal; não foi tratada como build/teste aprovado.

## Continuação — contenção de erro e cobertura

- Revalidação corrigiu um achado histórico: os três apps já possuíam `ErrorBoundary` global. No CRM, a área de conteúdo agora tem uma segunda proteção por seção; falha em uma tela preserva a navegação e trocar de aba remonta a seção. Build do CRM e 24 testes de navegação/formulários passaram; teste de erro forçado em navegador ainda pendente.
- O índice mestre contabiliza 44 superfícies nas três frentes e marca explicitamente que nenhuma está visualmente validada em todos os estados/viewports. Isso substitui qualquer leitura de “100%” baseada só no inventário ou no build.

## Continuação — sub-abas e continuidade

- Cadastros, Site, Equipe e Ajustes agora mantêm a sub-aba em `?aba=...`, preservam outros parâmetros e permitem voltar pelo histórico; os conjuntos têm `aria-controls`/`tabpanel` e navegação por setas, Home e End.
- Build do CRM e 25 testes de navegação/formulários passaram. Reload, botão Voltar e teclado ainda requerem validação executada em navegador; nenhum item do índice mestre foi promovido a `V` por teste estático.

## Continuação — hero público aprovado

- O hero deixou de emoldurar e empilhar a foto: usa o fundo desktop/mobile aprovado em cor plena e a foto limpa da Dra. à direita, dissolvendo somente a borda do arquivo por máscara CSS, sem gerar ou modificar fisionomia. O primeiro slide usa “Beleza com / estratégia” da referência; CTAs, slides, watermark e overrides do CMS permanecem.
- Indicadores têm alvo de 44 px e a rotação automática respeita movimento reduzido. Build web, encoding e `git diff --check` passaram. A comparação visual direta com os anexos em todos os breakpoints e o teste de ação em navegador seguem pendentes.

## Continuação — agendamento público e privacidade

- O POST público de agendamento vinculava corretamente uma paciente pelo e-mail, mas respondia com o objeto operacional completo, incluindo dados da conta vinculada e campos internos. Agora devolve somente identificador, status e horário do próprio pedido. O fluxo administrativo permanece com seu objeto completo e o site passou a tipar o comprovante público separadamente.
- Um teste de regressão garante que a projeção não inclua paciente vinculada, telefone, mensagem clínica ou usuário confirmador. Builds da API e do site e o teste focado passaram. Ainda falta teste integrado com banco e verificação do percurso real formulário → recepção → confirmação → portal.

## Continuação — formulário e expectativa da paciente

- A landing não apresenta mais procedimentos fictícios quando a API não devolve a lista; informa a indisponibilidade e mantém a avaliação livre via campo de mensagem. Um segundo envio durante a mutação é ignorado no cliente, sem apresentar isso como garantia de idempotência no servidor.
- O texto padrão do pedido de horário e da confirmação não promete reserva, WhatsApp ou acesso ao portal antes da confirmação/cadastro. O texto-base do CMS para novas configurações também foi ajustado. Conteúdo já persistido no CMS precisa de revisão editorial antes da publicação, pois não é sobrescrito automaticamente.
- Builds da landing e da API, 69 testes da API e encoding passaram. Falta executar o fluxo no navegador e no banco para validar estados de carregamento/erro/sucesso e ausência de duplicatas sob concorrência.

## Continuação — ajuda no portal

- O acesso “Precisa de ajuda?” no início do portal agora abre Mensagens, não Consultas; nessa tela, o formulário já começa em “Enviar mensagem”. Em Consultas, mantém “Solicitar horário” como opção inicial. São os mesmos endpoints autenticados, sem nova ação clínica automática.
- O build do portal passou. A navegação e o envio real ainda aguardam execução em navegador com sessão de paciente e API; a superfície P03/P08 permanece pendente de validação visual.

## Continuação — conversa entre paciente e equipe

- A auditoria revelou que o portal gravava mensagens e a API as incluía na ficha, mas o CRM não exibia a conversa nem permitia responder. A ficha ganhou aba Mensagens; a resposta usa rota autenticada restrita a `PATIENT_WRITE`, verifica tenant/paciente e grava com remetente `STAFF`. O portal já consulta a mesma coleção; o aviso interno/push usa texto neutro, sem expor conteúdo da mensagem.
- Corrigida a ordenação visual da conversa no portal (antiga → recente) e a prévia da mensagem mais recente no início. Builds do CRM e da API, 69 testes da API e encoding passaram. Ainda falta caixa de entrada operacional para descoberta e priorização de mensagens novas, paginação do histórico, teste ponta a ponta com banco/sessão e validação visual; portanto o canal não está fechado como funcionalidade integral.

## Continuação — caixa de entrada da equipe

- A lista de Pacientes mostra até 30 conversas cuja última mensagem é da paciente, em ordem de chegada, e abre a ficha diretamente em Mensagens. O resumo exibe só nome e data, sem prévia de texto clínico; a rota `/admin/message-inbox` exige `PATIENT_READ`, filtra pelo tenant e usa a última mensagem real de cada conversa. A consulta atualiza a cada 30 segundos e ao fechar a ficha.
- Build da API e do CRM, 69 testes da API, 48 testes de navegação/formulários do CRM e encoding passaram. A consulta SQL e a interação precisam de teste integrado em PostgreSQL e navegador; a listagem é limitada às 30 mais recentes e ainda não inclui paginação, atribuição ou SLA. Não marcar a superfície como validada integralmente.

## Continuação — verificação read-only da consulta

- `EXPLAIN` da consulta da caixa de entrada passou no PostgreSQL local da plataforma, sem executar a busca nem retornar nomes/mensagens. Confirmou tabelas, colunas, enum `MessageSender` e sintaxe do `DISTINCT ON` no esquema real. O plano atual faz varredura de `Message` para o tenant; avaliar índice composto (`tenantId`, `patientId`, `createdAt`) antes de escala maior.
- Isto **não** comprova a seleção funcional nem autoriza teste com dados de pacientes. Para essa evidência, criar banco isolado descartável com migrações e registros sintéticos, sem alterar o volume em uso. O teste de UI segue pendente.

## Continuação — teste funcional isolado da caixa de entrada

- Subiu PostgreSQL 16 temporário `marcela_inbox_test_pg`, sem volume persistente (`tmpfs`), em porta local exclusiva. As 17 migrações aplicaram sem erro. Com dois tenants e três pacientes sintéticas, a consulta retornou apenas a conversa cuja última mensagem era da paciente; excluiu uma conversa já respondida e a paciente do outro tenant.
- O teste rodou em transação encerrada com `ROLLBACK`. O container temporário foi verificado, parado e removido pelo `--rm`; nenhuma base da clínica recebeu escrita. Isto valida a regra SQL em PostgreSQL real, mas não valida autenticação HTTP, renderização, atualização automática ou interação de resposta em navegador.

## Continuação — proveniência visual

- `REGISTRO-ASSETS-APROVADOS-2026-09.md` separa fundos abstratos e monograma aprovados das fotografias candidatas atualmente usadas como fallback. O kit oficial não traz fotos originais sem arte; a fidelidade facial exata das versões limpas não está demonstrada. Solicitadas as fontes originais sem bloquear o restante da modernização.

## Continuação — cabeçalho mobile e validação visual

- A inspeção de interface em navegador foi tentada novamente; o ambiente de automação retornou `apps: []` e `browsers: []`. Portanto nenhuma superfície recebeu status de validação visual ou comparação de pixels com os anexos.
- Na revisão estática do cabeçalho da landing, o menu mobile ganhou altura máxima com rolagem interna para janelas baixas, estado expandido/controlado para tecnologia assistiva e fechamento por Esc com retorno do foco ao botão. Build da landing passou. Interação real a 320/390 px, zoom 200% e teclado ainda precisa de navegador disponível.

## Continuação — mensagens e preparação da prévia em produção

- A API compartilha agora a mesma validação entre mensagem da paciente e resposta da equipe: trim, conteúdo obrigatório e máximo de 4.000 caracteres. O portal limita a digitação na intenção de mensagem e envia texto aparado. 71 testes da API e builds da API/portal passaram.
- O usuário pediu commit/push para `main` para ver a diferença deployada. A publicação é uma prévia funcional parcial: os fundos/monogramas aprovados entram, mas retratos tratados seguem candidatos e nenhuma cobertura visual integral foi alegada. O push `b2d27a0` passou pelos builds do CI, porém o deploy parou na verificação de acesso SSH à VPS; não há confirmação de publicação.

## Continuação — histórico completo da conversa

- A paciente e a equipe agora podem carregar páginas anteriores da conversa, sem transferir todo o histórico no dashboard ou na ficha. O cursor é conferido no mesmo tenant e paciente antes da consulta; a rota da equipe preserva a permissão de leitura e registra auditoria sem conteúdo clínico.
- O envio invalida o histórico visível em cada interface. Builds da API, CRM e portal, 73 testes da API e checagem de encoding passaram. Ainda falta teste ponta a ponta autenticado em banco, avaliação de índice composto para volume e validação visual.

## Continuação — inspeção executada do hero publicado

- O workflow do commit `175b798` concluiu com sucesso, incluindo deploy e verificação pública de HTTPS. A landing publicada foi capturada em navegador. O primeiro método headless impôs largura útil maior que 390 px e cortou o menu; a captura posterior com viewport emulado confirmou que o menu existe. Não se trata de defeito do menu.
- A captura fiel em 390 px mostrou o título sobre o rosto. O CSS local separa a área de leitura da foto, preserva o retrato e mantém os CTAs; capturas do build local em 320, 390 e 768 px foram inspecionadas. A API local não estava ligada nessas capturas, portanto o conteúdo veio do fallback do build, não do CMS publicado. O build da landing passou. Esta evidência cobre somente o estado inicial do hero nesses viewports, não os demais slides, o menu aberto, zoom, interação ou a página completa; W02 ainda não recebe `V` integral.
- Após o deploy, a captura pública revelou a quebra legada do título no CMS (“Beleza” / “com estratégia”), diferente do fallback aprovado. O componente recompõe apenas essa variação literal como “Beleza com” / “estratégia”, sem modificar o registro persistido nem outros títulos. É necessária nova captura pública após esse ajuste para confirmar a composição real.

## Continuação — auditoria da landing completa e recursos médicos

- A captura pública integral em 390 e 1440 px confirmou as seções hero, sobre, protocolos, tecnologia, depoimentos, avaliação e rodapé. A seção Tecnologia exibia painéis quase vazios com apenas “TS” e “PE”; o editor do CRM dizia que havia foto, mas o componente nunca usou imagem. Não foi encontrada foto original do T-Sculptor no workspace; não foi inventada uma imagem clínica.
- As duas áreas foram redesenhadas como capas editoriais em CSS, usando nome, categoria, número e iniciais dos recursos já salvos. A prévia do CMS e os rótulos do editor foram alinhados ao comportamento real. Capturas do build local em 390 e 1440 px foram inspecionadas sem overflow horizontal; builds da landing, CRM e API passaram. Faltam validação da prévia autenticada, mais viewports, interação e comparação da página pública depois do deploy. W06 segue parcialmente implementada, não integralmente validada.
