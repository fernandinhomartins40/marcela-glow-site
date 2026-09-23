# Registro de proveniência e aprovação dos assets

Estado conferido em 22/09/2026. Aprovação do layout não equivale a comprovação de fidelidade de uma fotografia recomposta.

| Asset | Estado | Dimensões | SHA-256 (16 primeiros) | Uso atual |
| --- | --- | --- | --- | --- |
| `apps/web/src/assets/generated/hero-regeneracao-desktop-v1.png` | Fundo abstrato aprovado pela usuária | 1672×941 | `40E17697C7FD0437` | Hero desktop; cópia no login do CRM |
| `apps/web/src/assets/generated/hero-regeneracao-mobile-v1.png` | Fundo abstrato aprovado pela usuária | 1122×1402 | `5FDDD4C3AAA14840` | Hero mobile; cópia de baixa opacidade no portal |
| `Dra_Marcela_Duch_Brand_Assets/webp/md-monogram-brown-1024.webp` e versão branca | Identidade oficial fornecida | 1024×1024 | Marrom `C207823577AC92D1`; branco `4A307D44E3C3DC3E` | Cabeçalhos, rodapés e acessos dos três apps |
| `apps/web/src/assets/dra-marcela-editorial.jpg` | Fonte fotográfica real do Instagram, com textos/ícones sobrepostos | 1080×1382 | `F7E96AAE403F18AF` | Preservada como origem, não usada como foto limpa |
| `apps/web/src/assets/dra-marcela-portrait.jpg` | Fonte fotográfica real do Instagram, com textos/ícones sobrepostos | 1080×1383 | `3F9A7A3922CD687E` | Preservada como origem, não usada como foto limpa |
| `apps/web/src/assets/generated/patient-botanical-mobile-v1.png` (cópia idêntica em `apps/patient/src/assets/`) | Fundo botânico do portal | 939×1672 | `260B225089A8294D` | Saudação do portal da paciente (redesign) |
| `apps/web/src/assets/candidatas/dra-marcela-editorial-limpa-v1.png` | **Aprovada pela usuária em 23/09/2026** para uso no redesign | 1109×1419 | `FCA487F35C65D000` | Fallback atual do hero e da prévia do CMS |
| `apps/web/src/assets/candidatas/dra-marcela-portrait-limpa-v1.png` | **Aprovada pela usuária em 23/09/2026** para uso no redesign | 1108×1419 | `866A510B3D8EE06E` | Fallback atual da seção Sobre e do CRM |

O kit de marca contém monogramas, favicons e ícones, mas não contém arquivos fotográficos originais sem arte. A comparação visual mostra que os retratos candidatos removem overlays, porém não demonstra preservação pixel a pixel do rosto. Não chamar esses retratos de definitivos até obter os arquivos fotográficos originais ou uma aprovação específica das versões limpas. Não substituir silenciosamente fundos ou logos aprovados.

Próxima ação: caso a usuária forneça as fotos originais, derivar variantes responsivas dessas fontes sem alterar fisionomia, registrar hash/dimensões e conferir visualmente cada aplicação. Se só existirem os arquivos do Instagram, apresentar claramente o limite de reconstrução e pedir aprovação específica para qualquer tratamento facial generativo.

## Aprovação de 23/09/2026

A usuária aprovou os dois retratos limpos (`dra-marcela-editorial-limpa-v1.png` e `dra-marcela-portrait-limpa-v1.png`) para o redesign da landing, do CRM e do portal. Eles continuam na pasta `candidatas/` para não quebrar importações; o estado de referência é esta tabela. Se chegarem fotos originais sem arte, elas substituem estas versões e o hash é registrado aqui.

## Derivados WebP para o site (23/09/2026)

Os PNGs aprovados somavam cerca de 23 MB na landing. O site passou a importar derivados `.webp` (qualidade 82) gerados ao lado de cada original em `approved/` e `candidatas/`; os PNGs continuam como fonte e são a referência dos hashes acima. Os quatro cartões de tratamento foram reduzidos para 960 px de largura (exibidos a ~350 px); fundos e retratos mantêm a resolução original. Total dos derivados: ~560 KB. Conferidos visualmente a textura de pele e o retrato editorial, sem perda perceptível. Ao trocar um PNG aprovado, regenerar o `.webp` correspondente.
