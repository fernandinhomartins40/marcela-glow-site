# Imagens para as lojas

Geradas em 15/11/2026 com **dados fictícios** (banco descartável e seed de
demonstração): nenhuma tela mostra paciente real.

| Pasta | Tamanho | Origem | Onde enviar |
|---|---|---|---|
| `google-play/paciente/`, `google-play/medica/` | 1080 × 1920 (9:16) | APK do GitHub Actions rodando no emulador Android | Play Console → Página principal da loja → Capturas de tela do telefone |
| `google-play/*/icone-512.png` | 512 × 512 | `apps/*/resources/icon-only.png` | Play Console → Ícone do app |
| `google-play/*/destaque-1024x500.png` | 1024 × 500 | Arte com a paleta e o monograma da marca | Play Console → Recurso gráfico |
| `app-store/paciente/`, `app-store/medica/` | 1320 × 2868 (iPhone 6,9") | Simulador do iPhone 16 Pro Max no GitHub Actions (`app-ios-video.yml`), API de produção | App Store Connect → Capturas do iPhone 6,9" |
| `app-store/*/video-revisao.mp4` | 720 × 1564 | Mesmo percurso, gravado no simulador | Link nas notas da revisão (App Store Connect → Informações da revisão) |

Os prints e os vídeos da App Store saem do simulador de iPhone do GitHub
Actions: Actions → "iOS — vídeo e prints da App Store". O vídeo da paciente
vai até excluir a conta (diretriz 5.1.1(v)); o da médica termina saindo, porque
esse app não cria conta. A conta da paciente é a de revisão
(REVIEW_PATIENT_EMAIL/PASSWORD): volta a entrar depois de excluída; a da médica,
REVIEW_STAFF_* (perfil DOCTOR). Os dados que aparecem são de demonstração, da
"Paciente VIP Demo". Os dois vídeos também estão publicados para as notas da
revisão: `https://dramarceladuch.com.br/revisao/minha-jornada.mp4` e
`.../revisao/marcela-crm.mp4` (`apps/web/public/revisao/`, fora da busca). O vídeo foi
cortado no início (instalação do Maestro) e reduzido para 720 px; o original em
1320 × 2868 fica no artefato da execução. Para iPad (2064 × 2752) ainda não há prints.

Ordem sugerida: a numeração dos arquivos.
