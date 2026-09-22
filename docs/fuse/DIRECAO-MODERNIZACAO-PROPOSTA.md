# Direção proposta — modernização de produto e experiência

Estado: `DIREÇÃO VISUAL APROVADA; IMPLEMENTAÇÃO PARCIAL EM VALIDAÇÃO` · 22/09/2026

Os layouts da landing, CRM e portal foram aprovados pelo usuário. A aprovação não cobre automaticamente a fidelidade facial dos retratos tratados; consultar `REGISTRO-ASSETS-APROVADOS-2026-09.md`. A implementação ainda não foi comparada visualmente em todos os viewports e estados.

## Decisão proposta

Evoluir a plataforma como um único serviço com três superfícies de trabalho:

1. **Landing:** transformar interesse em avaliação com clareza e credibilidade.
2. **CRM:** orientar a equipe pelo próximo evento clínico/operacional, não por uma coleção de módulos.
3. **Portal da paciente:** confirmar a próxima etapa, dar acesso a documentos e reduzir dependência de WhatsApp.

Preservar: marca, paleta quente, logo oficial, retratos reais, dados clínicos, RBAC, trilha de auditoria, agendamento, prontuário e integrações existentes.

## Identidade oficial confirmada

Fonte: `Dra_Marcela_Duch_Brand_Assets/README.md`.

- Monograma: MD oficial, sem redesenho, distorção ou inclinação.
- Marrom institucional: `#5B3828`; marrom profundo: `#3E281F`.
- Nude: `#C7A98D`; nude claro: `#E9D8C9`; off-white: `#F8F3EE`; grafite: `#272321`.
- Monograma marrom em fundos claros; branco em fundos escuros ou fotográficos; área livre mínima equivalente à haste do M.
- Ícones de aplicativo: usar os arquivos oficiais 1024px do kit, não versões desenhadas pela interface.

## Direção visual recomendada — "precisão que acolhe"

Uma estética editorial clínica: a paleta oficial de nude e marrom substitui os valores aproximados anteriores; bordas finas e tipografia expressiva entram só em hierarquia editorial. A imagem não substitui conteúdo: a foto real da médica sustenta confiança; a textura abstrata de regeneração cria atmosfera em fundos e transições.

Não usar: rosa clichê, dourado brilhante, vidro, excesso de cards, imagens médicas genéricas, texto embutido em imagem ou recursos decorativos que reduzam contraste.

## Cobertura de superfícies

| Superfície | Proposta | Regra responsiva |
|---|---|---|
| Landing: hero | Copy e CTA à esquerda; retrato real à direita; textura abstrata decorativa ao fundo | Mobile muda para texto primeiro, retrato abaixo e arte em `<picture>` sem cobrir CTA |
| Landing: confiança e filosofia | Credenciais, consulta e princípios em sequência editorial | Grid vira lista, sem perder contexto |
| Landing: procedimentos | Navegação por intenção e área tratada; conteúdo educativo antes de conversão | Cards viram rolagem/empilhamento com uma ação por item |
| Landing: prova, conteúdo e contato | Depoimentos, educação, avaliação em 3 etapas, localização e contato | Uma coluna; mapa e canais acessíveis sem depender de hover |
| CRM | "O dia" como centro: chegada → consulta → saída → cobrança, exceções e fila | Sidebar vira drawer/barra inferior, listas preservam ações essenciais |
| Portal | Próxima consulta, jornada, mensagens, prescrições e ajuda no mesmo ponto de partida | Navegação inferior com alvo mínimo de 44px |

## Oportunidades de produto

| ID | Oportunidade | Problema resolvido | Decisão proposta |
|---|---|---|---|
| OP-01 | Central de próximos passos | Equipe procura o que fazer entre agenda, recepção e caixa | Implementar no dashboard CRM; leitura das regras existentes, sem alterar permissões |
| OP-02 | Handoff explícito por paciente | Troca entre recepção, consultório e financeiro depende de memória | Planejar: responsável, status e prazo auditáveis; fallback manual |
| OP-03 | Convite de avaliação com continuidade | Lead abandona ao mudar de canal | Planejar: link seguro, dados mínimos pré-preenchidos e confirmação no portal |
| OP-04 | Jornada explicada no portal | Paciente consulta informações dispersas ou pergunta por WhatsApp | Implementar na evolução do portal usando planos, sessões e notificações existentes |
| OP-05 | Alertas acionáveis | Notificação sem próxima ação gera espera e retrabalho | Implementar: cada alerta deve abrir sua tarefa e permitir dispensar/adiar com auditoria |
| OP-06 | Biblioteca de orientações pós-procedimento | Mesmas dúvidas repetem por canal informal | Experimento: conteúdo clínico aprovado, vinculado a procedimento, com alternativa humana |

## Assets candidatos

| Arquivo | Papel | Uso planejado |
|---|---|---|
| `apps/web/src/assets/candidatas/dra-marcela-editorial-limpa-v1.png` | Foto real tratada | Hero/editorial; remove overlays sociais sem inserir nova marca |
| `apps/web/src/assets/candidatas/dra-marcela-portrait-limpa-v1.png` | Foto real tratada | Sobre a médica e blocos de confiança |
| `apps/web/src/assets/generated/hero-regeneracao-desktop-v1.png` | Fundo abstrato desktop | Hero/intervalos editoriais, decorativo (`alt=""`) |
| `apps/web/src/assets/generated/hero-regeneracao-mobile-v1.png` | Fundo abstrato mobile | Art direction do hero abaixo de 768px |

As imagens de interface apresentadas no chat são referências; não entram no produto como bitmap.

## Aprovação solicitada

Para iniciar implementação, aprovar ou ajustar:

1. direção visual "precisão que acolhe";
2. uso das fotos limpas candidatas após sua checagem de identidade;
3. prioridades de produto: `OP-01`, `OP-04` e `OP-05` primeiro.

Com a aprovação, a execução será dividida em fatias: fundação de tokens + landing, dashboard do dia, portal de continuidade e oportunidades verticais completas, cada uma com testes, permissões e validação responsiva.
