# Imagens para as lojas

Geradas em 15/11/2026 com **dados fictícios** (banco descartável e seed de
demonstração): nenhuma tela mostra paciente real.

| Pasta | Tamanho | Origem | Onde enviar |
|---|---|---|---|
| `google-play/paciente/`, `google-play/medica/` | 1080 × 1920 (9:16) | APK do GitHub Actions rodando no emulador Android | Play Console → Página principal da loja → Capturas de tela do telefone |
| `google-play/*/icone-512.png` | 512 × 512 | `apps/*/resources/icon-only.png` | Play Console → Ícone do app |
| `google-play/*/destaque-1024x500.png` | 1024 × 500 | Arte com a paleta e o monograma da marca | Play Console → Recurso gráfico |
| `app-store/paciente/`, `app-store/medica/` | 1320 × 2868 (iPhone 6,9") | Mesmo app web em modo aplicativo, no tamanho do iPhone | App Store Connect → Capturas do iPhone 6,9" |

Os prints da App Store não saíram de um iPhone: o app iOS desenha o mesmo
conteúdo web, então foram capturados do portal e do painel em modo aplicativo,
sem barra de status. Para prints do iPad (exigidos se o app for oferecido em
iPad), falta gerar no tamanho 2064 × 2752.

Ordem sugerida: a numeração dos arquivos.
