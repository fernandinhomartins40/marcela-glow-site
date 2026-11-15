# Publicar os apps nas lojas

Guia para quem vai colocar o **Minha Jornada** (app da paciente) e o
**Marcela CRM** (app da médica) na App Store e no Google Play. Não precisa
saber programar: cada passo diz onde clicar e o que copiar.

> **Antes de tudo, saiba o que já está pronto e o que depende de você.**
> O código dos dois apps está pronto. **Quem compila os apps é o GitHub**
> (aba *Actions*): você não precisa de Mac nem de programa instalado para
> gerar os arquivos das lojas. O que falta é o que só a dona
> das contas pode fazer: criar as contas de desenvolvedor, gerar as chaves,
> cadastrar os segredos no GitHub, escrever a política de privacidade e criar
> as contas de revisão. Este guia cobre tudo isso, na ordem.
>
> Tudo o que está marcado **"conferir na data do envio"** é regra das lojas
> que muda com o tempo. Confira na página oficial antes de enviar.

## Índice

1. [Identificadores (decida antes do primeiro envio)](#1-identificadores)
2. [Contas que você precisa ter](#2-contas)
3. [Firebase (notificações)](#3-firebase-notificações)
4. [Chaves de assinatura](#4-chaves-de-assinatura)
5. [Segredos no GitHub: a lista completa](#5-segredos-no-github)
6. [Como gerar uma versão](#6-como-gerar-uma-versão)
7. [O que precisa estar no ar no servidor](#7-o-que-precisa-estar-no-ar-no-servidor)
8. [Textos das lojas](#8-textos-das-lojas)
9. [Formulários de privacidade](#9-formulários-de-privacidade)
10. [Nota ao revisor e contas de revisão](#10-nota-ao-revisor-e-contas-de-revisão)
11. [Capturas de tela](#11-capturas-de-tela)
12. [App da médica fora da busca (distribuição restrita)](#12-app-da-médica-fora-da-busca)
13. [Se a Apple recusar pela diretriz 4.2](#13-se-a-apple-recusar-pela-diretriz-42)
14. [Build de teste no emulador (para quem verifica)](#14-build-de-teste-no-emulador)

---

## 1. Identificadores

| | App da paciente | App da médica |
|---|---|---|
| Nome na loja | Minha Jornada | Marcela CRM |
| Identificador | `br.com.dramarceladuch.paciente` | `br.com.dramarceladuch.medica` |
| Distribuição | Pública | Restrita (Apple: não listado; Google: teste fechado) |

**O identificador não pode ser trocado depois do primeiro envio.** Se quiser
outro, avise antes de criar os apps nas lojas — ele está no código.

## 2. Contas

| Conta | Custo | Onde |
|---|---|---|
| Apple Developer Program | anual (conferir valor na data) | https://developer.apple.com/programs/ |
| Google Play Console | taxa única (conferir valor na data) | https://play.google.com/console/signup |
| Firebase | gratuito para notificações | https://console.firebase.google.com |

Recomendação: abrir as contas da Apple e do Google **como organização** (com o
CNPJ da clínica), não como pessoa física. Para app de saúde, o Google pode
exigir conta de organização — conferir na data do envio. A conta de
organização na Apple pede um número D-U-N-S (gratuito, pode levar dias).

## 3. Firebase (notificações)

As notificações do app da paciente ("sua consulta foi confirmada", "novo plano
de tratamento") passam pelo Firebase nos dois sistemas. **Sem o Firebase o app
funciona normalmente; só não avisa.** O app da médica não usa notificações
nesta versão.

1. Em https://console.firebase.google.com, **Adicionar projeto**. Nome
   sugerido: `dra-marcela-duch`. Pode desligar o Google Analytics (os apps não
   usam).
2. **App Android**: no projeto, ícone do Android → nome do pacote
   `br.com.dramarceladuch.paciente` → apelido "Minha Jornada" → **Registrar**.
   Baixe o `google-services.json`. Os passos seguintes da tela (SDK, Gradle)
   já estão feitos no código: pule.
3. **App iOS**: ícone da Apple → ID do pacote
   `br.com.dramarceladuch.paciente` → **Registrar**. Baixe o
   `GoogleService-Info.plist`. Pule os passos de SDK.
4. **Chave APNs (para o iPhone receber)**: em https://developer.apple.com →
   *Certificates, Identifiers & Profiles* → *Keys* → **+** → marque *Apple
   Push Notifications service (APNs)* → baixe o arquivo `.p8` (**só dá para
   baixar uma vez — guarde**). Anote o *Key ID* e o *Team ID* (canto superior
   direito da conta). No Firebase: engrenagem → *Configurações do projeto* →
   *Cloud Messaging* → app iOS → *Chave de autenticação de APNs* → envie o
   `.p8` com o Key ID e o Team ID.
5. **Conta de serviço (para o servidor enviar)**: Firebase → engrenagem →
   *Configurações do projeto* → *Contas de serviço* → **Gerar nova chave
   privada**. Baixa um `.json`. É o segredo `FIREBASE_SERVICE_ACCOUNT` (item 5).

**Nenhum desses arquivos vai para o repositório.** Eles entram como segredo
do GitHub (item 5); o repositório já recusa esses nomes de arquivo.

## 4. Chaves de assinatura

### Android — chave de upload

O Google assina o app final; você assina só o envio, com uma "chave de
upload". Gere uma vez, em qualquer computador com Java. No Windows, o
`keytool` vem com o Android Studio (em
`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`) ou com
qualquer JDK. No PowerShell, na pasta onde quer guardar a chave:

```sh
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Ele pede uma senha e alguns dados (nome, cidade). Guarde o arquivo
`upload.jks` e a senha **fora do computador também** (cofre de senhas). Se
perder, o Google permite trocar a chave de upload pelo suporte, mas demora.

No Play Console, ao criar o app, aceite a **Assinatura de apps do Google Play**
(é o padrão).

### iOS — chave da API do App Store Connect

Com ela o GitHub assina e envia ao TestFlight sozinho, sem Mac.

1. https://appstoreconnect.apple.com → *Usuários e acesso* → *Integrações* →
   *App Store Connect API* → **Gerar chave**. Acesso: **Admin** (o envio
   automático cria certificado e perfil sozinho, e isso pede Admin — conferir
   no primeiro envio; se a Apple mudar a regra, "App Manager" pode bastar).
2. Baixe o `.p8` (uma vez só), anote o **Key ID** e o **Issuer ID** (no topo
   da página).
3. Crie os dois apps em *Apps* → **+** → *Novo app*, com os identificadores do
   item 1 (se o identificador não aparecer na lista, registre-o antes em
   developer.apple.com → *Identifiers*, marcando **Push Notifications** no da
   paciente).

## 5. Segredos no GitHub

Onde cadastrar: no GitHub, repositório → **Settings** → **Secrets and
variables** → **Actions** → **New repository secret**. O nome tem de ser
exatamente o da tabela.

"Em base64" quer dizer: o arquivo convertido em texto, para caber num
segredo. **No Windows**, abra o PowerShell na pasta do arquivo e rode (troque
o nome do arquivo):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\upload.jks")) | Set-Clipboard
```

O texto vai para a área de transferência: cole (Ctrl+V) no campo *Secret* do
GitHub e salve. Repita para cada arquivo marcado "em base64" na tabela. (No
Mac: `base64 -i arquivo | tr -d '\n' | pbcopy`.) Os segredos que dizem
"conteúdo" (texto) são colados como estão: abra o `.json` no Bloco de Notas,
Ctrl+A, Ctrl+C.

| Segredo | O que colar | Para quê | Sem ele |
|---|---|---|---|
| `GOOGLE_SERVICES_JSON_BASE64` | `google-services.json` em base64 | Notificações no Android (paciente) | App funciona, sem notificações |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | `GoogleService-Info.plist` em base64 | Notificações no iPhone (paciente) | App funciona, sem notificações |
| `FIREBASE_SERVICE_ACCOUNT` | O **conteúdo** do `.json` da conta de serviço, **como baixado** (texto, não base64 — o deploy converte sozinho) | O servidor enviar as notificações | Nenhuma notificação sai |
| `ANDROID_KEYSTORE_BASE64` | `upload.jks` em base64 | Assinar o app Android | O AAB sai **sem assinatura** (o Play recusa); o APK sai de depuração |
| `ANDROID_KEYSTORE_PASSWORD` | A senha do `upload.jks` | idem | idem |
| `ANDROID_KEY_ALIAS` | `upload` (o `-alias` usado) | idem | idem |
| `ANDROID_KEY_PASSWORD` | A senha da chave (o `keytool` usa a mesma, se você não deu outra) | idem | idem |
| `PLAY_SERVICE_ACCOUNT_JSON` | Conteúdo do `.json` de uma conta de serviço do Google Cloud com acesso ao Play Console (texto) | Enviar sozinho ao teste interno (opcional) | Você baixa o AAB e envia à mão |
| `APP_STORE_CONNECT_KEY_BASE64` | O `.p8` da chave da API em base64 | Assinar o IPA e (se pedido) enviar ao TestFlight | Sai só um arquivo **sem assinatura**, que não vai para a loja |
| `APP_STORE_CONNECT_KEY_ID` | Key ID da chave da API | idem | idem |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID | idem | idem |
| `APPLE_TEAM_ID` | Team ID da conta Apple (10 letras/números) | idem | idem |

Para a `PLAY_SERVICE_ACCOUNT_JSON`: Play Console → *Configurações* → *Acesso à
API* (o nome do menu muda; conferir na data) → vincular a um projeto do Google
Cloud → criar conta de serviço → baixar a chave `.json` → no Play Console,
convidar o e-mail dessa conta em *Usuários e permissões* com permissão de
lançar em faixas de teste. **O primeiro envio de cada app ao Play tem de ser
feito à mão** pelo Play Console (o Google não aceita o primeiro pela API);
depois o GitHub envia sozinho.

Variáveis (não secretas), em **Settings → Secrets and variables → Actions →
Variables**: `MIN_APP_VERSION_PATIENT` e `MIN_APP_VERSION_ADMIN` — a versão
mínima aceita; abaixo dela o app mostra "Atualize o aplicativo". Deixe vazio
até haver motivo para forçar atualização.

## 6. Como gerar uma versão

### Rodar

1. No GitHub, abra o repositório → aba **Actions** → à esquerda, **Apps
   nativos** → botão **Run workflow** (à direita).
2. Escolha:
   - **Qual app**: `paciente` (Minha Jornada) ou `medica` (Marcela CRM);
   - **Qual sistema**: `ambas`, `android` ou `ios`;
   - **Versão**: a que a loja mostra, só números e pontos (ex.: `1.0.0`;
     aumente a cada envio: `1.0.1`, `1.1.0`...);
   - **Enviar às lojas**: deixe desmarcado para só gerar os arquivos.
     Marcado, envia ao teste interno do Play e ao TestFlight — **só se os
     segredos de envio existirem**.
3. **Run workflow**. Leva de 15 a 40 minutos.

Atalho para quem usa git: criar a etiqueta (tag) `paciente-v1.0.0` ou
`medica-v1.0.0` gera os dois sistemas daquele app com a versão `1.0.0`, sem
enviar.

O número interno de build é o número da execução no GitHub, que sempre
cresce (as lojas exigem isso). Fora do GitHub, o padrão é `1.0.0` / build `1`
(Android em `android/app/build.gradle`, iOS em `MARKETING_VERSION` do projeto
Xcode).

### Ler o resultado e baixar

Abra a execução (clique no nome dela). No topo fica o **resumo**, em
português: o que foi gerado, se saiu assinado, se foi enviado e **o que
faltou** (o nome do segredo ausente). Linha com ⚠️ quer dizer que aquele
arquivo **não serve para a loja**.

No fim da página, em **Artifacts**, estão os arquivos para baixar (cada um
vem num `.zip`; ficam guardados 30 dias):

| Artefato | O que é | Para quê |
|---|---|---|
| `paciente-android-aab-1.0.0-42` | AAB | Enviar ao Google Play (só se o resumo disser **assinado**) |
| `paciente-android-apk-1.0.0-42` | APK | Instalar direto num celular Android para testar |
| `paciente-android-apk-teste-local-1.0.0-42` | APK de teste | Só para verificação técnica no emulador (item 14). **Não instale em celular de paciente** |
| `paciente-ios-ipa-1.0.0-42` | IPA assinado | Enviar à App Store (aparece só com a chave da Apple) |
| `paciente-ios-xcarchive-sem-assinatura-1.0.0-42` | Arquivo sem assinatura | Só prova que o iOS compila; **não vai para a loja** |
| `paciente-ios-package-swift-1.0.0-42` | Arquivo técnico | Para quem mantém o código (ver resumo) |

(Com `medica` no lugar de `paciente` para o outro app; `1.0.0` é a versão e
`42` o número da execução.)

### Enviar ao Google Play (sem programa nenhum)

1. Baixe e descompacte o artefato `...-android-aab-...`.
2. Play Console → o app → **Testes** → **Teste interno** → **Criar nova
   versão** → arraste o arquivo `.aab` → dê um nome (ex.: "1.0.0") →
   **Salvar** → **Revisar versão** → **Iniciar lançamento** (os nomes dos
   botões mudam às vezes; conferir na data).
3. Adicione os testadores (e-mails) na aba *Testadores*, abra o link de
   participação no celular e instale pela Play Store.
4. Testou e está bom: na mesma versão, **Promover versão** → *Produção*
   (paciente) ou *Teste fechado* (médica, item 12).

**O primeiro envio de cada app tem de ser à mão, assim.** Depois, se houver
`PLAY_SERVICE_ACCOUNT_JSON`, marcar "Enviar às lojas" faz o passo 2 sozinho.

Para testar sem a loja: baixe o artefato `...-android-apk-...` no celular
Android, abra o `.apk` e permita "instalar apps desconhecidos" quando o
Android pedir.

### Enviar à App Store (sem Mac)

Como você não tem Mac, o caminho é o próprio GitHub enviar:

1. Com os quatro segredos da Apple cadastrados (item 5) e os apps criados no
   App Store Connect (item 4), rode o workflow com **Enviar às lojas**
   marcado.
2. O resumo diz se foi enviado. Em 5 a 60 minutos o build aparece no App
   Store Connect → o app → **TestFlight** (a Apple manda e-mail quando
   terminar de processar).
3. Em TestFlight, responda a pergunta sobre criptografia (os apps só usam o
   HTTPS do sistema; conferir o texto na data), adicione-se como testadora e
   instale pelo app **TestFlight** no iPhone.
4. Testou e está bom: aba **Distribuição** → nova versão (o mesmo número) →
   escolha o build → preencha textos e capturas (itens 8 a 11) → **Enviar
   para revisão**.

O IPA também fica para baixar (artefato `...-ios-ipa-...`). Quem tiver um Mac
pode enviá-lo pelo app **Transporter** (gratuito na Mac App Store: entrar com
a conta Apple, arrastar o `.ipa`, **Entregar**). Sem Mac, use o envio pelo
workflow acima.

## 7. O que precisa estar no ar no servidor

- **E-mail (SMTP) configurado em produção.** A paciente cria o acesso pelo
  app e recebe um **link de ativação por e-mail**. Sem SMTP o cadastro
  responde "indisponível" (erro 503) e ninguém consegue criar acesso. As
  variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e
  `SMTP_FROM` ficam no `.env` do servidor (não estão no GitHub).
- **O link de ativação abre no navegador, não no app.** A paciente ativa pelo
  site e depois entra no app com e-mail e senha. Isso é esperado nesta versão.
- **`FIREBASE_SERVICE_ACCOUNT`** cadastrado (item 5) e um deploy feito depois.
- **CORS do armazenamento de arquivos (bucket S3)** aceitando
  `capacitor://localhost` e `https://localhost`. Sem isso, enviar anexo pelo
  app falha (pelo site continua funcionando). É ajuste no painel do provedor
  de armazenamento.
- **Política de privacidade:** já existe em
  `https://www.dramarceladuch.com.br/privacidade` (é esse o endereço que vai
  nas duas lojas) e é editada no painel, em **Site → Privacidade**. O texto
  padrão segue a LGPD. Antes do envio, preencha ali o CNPJ ou CPF da
  controladora (a clínica), o e-mail do encarregado (DPO) e os dados do
  desenvolvedor; o painel avisa o que falta. Revisão jurídica recomendada:
  são dados de saúde.
- **Página de exclusão de conta na web** (exigência do Google): o portal na web
  já tem "Excluir minha conta" em *Mais*. Informe ao Google o endereço
  `https://www.dramarceladuch.com.br/paciente/` com a instrução "entre na sua
  conta → Mais → Excluir minha conta". Se o Google pedir uma página que
  funcione sem login, publique uma página explicando os passos e o contato da
  clínica.

## 8. Textos das lojas

### Minha Jornada (paciente)

- **Nome:** Minha Jornada
- **Subtítulo (Apple, até 30 caracteres):** Seu cuidado com a Dra. Marcela
- **Descrição curta (Google, até 80 caracteres):** Consultas, planos e
  orientações da clínica Dra. Marcela Duch, no seu celular.
- **Descrição:**

  > O Minha Jornada é o portal das pacientes da clínica Dra. Marcela Duch.
  >
  > Com ele você:
  > • acompanha suas consultas e pede novos horários;
  > • vê sua jornada de tratamento, sessão a sessão;
  > • consulta planos de tratamento, orientações e documentos da clínica;
  > • troca mensagens com a equipe;
  > • recebe avisos quando a clínica confirma um horário ou registra algo novo
  >   para você.
  >
  > O acesso é exclusivo para pacientes da clínica. Para criar o seu, use o
  > e-mail cadastrado na clínica: você recebe um link para ativar a conta.
  >
  > Você pode excluir seu acesso a qualquer momento, dentro do app, em Mais →
  > Excluir minha conta. O prontuário é mantido pela clínica pelo prazo exigido
  > em lei.

- **Palavras-chave (Apple, até 100 caracteres):**
  `clínica,paciente,consulta,agendamento,tratamento,estética,saúde,jornada`
- **Categoria:** Saúde e fitness (Apple) / Saúde e fitness ou Medicina
  (Google — escolher a que o Google aceitar para portal de paciente).
- **Classificação etária:** responder o questionário honestamente (sem
  violência, sem conteúdo adulto); deve resultar em livre/4+.

### Marcela CRM (médica)

- **Nome:** Marcela CRM
- **Subtítulo:** Gestão da clínica Dra. Marcela
- **Descrição curta:** Agenda, atendimento e prontuário da equipe da clínica
  Dra. Marcela Duch.
- **Descrição:**

  > Ferramenta de trabalho interna da equipe da clínica Dra. Marcela Duch.
  >
  > • agenda do dia e recepção;
  > • atendimento e prontuário das pacientes;
  > • planos de tratamento e documentos;
  > • financeiro e caixa, conforme o perfil de cada pessoa da equipe.
  >
  > O acesso é restrito à equipe da clínica, com usuário criado pela
  > administração. Não há cadastro aberto.

- **Categoria:** Medicina (Apple) / Medicina ou Empresa (Google).

## 9. Formulários de privacidade

Respostas para o que os dois apps **realmente fazem hoje**. Se algo mudar
(ex.: entrar analytics), refaça.

Base comum: **sem anúncios, sem rastreamento entre apps e sites, sem venda de
dados, sem SDK de analytics.** Os dados são da clínica, guardados no servidor
da clínica, transmitidos sempre com criptografia (HTTPS).

### Apple — "Privacidade do app" (rótulos)

Pergunta "Você ou seus parceiros coletam dados?": **Sim**.

| Tipo de dado (Apple) | Paciente | Médica | Vinculado à pessoa? | Rastreamento? | Finalidade |
|---|---|---|---|---|---|
| Informações de contato → Nome, E-mail, Telefone | Sim | Sim (da equipe) | Sim | Não | Funcionalidade do app |
| Informações de saúde e condicionamento → Saúde | Sim | Sim (das pacientes que a equipe atende) | Sim | Não | Funcionalidade do app |
| Conteúdo do usuário → Fotos ou vídeos / Outro conteúdo (mensagens, anexos) | Sim (mensagens) | Sim (anexos de prontuário) | Sim | Não | Funcionalidade do app |
| Identificadores → ID do usuário | Sim | Sim | Sim | Não | Funcionalidade do app |
| Identificadores → ID do dispositivo (token de notificação) | Sim | Não | Sim | Não | Funcionalidade do app |

Não marcar: localização, contatos da agenda, histórico de navegação, compras,
dados financeiros da paciente (o caixa da médica registra valores de
atendimento — se a Apple pedir, marcar "Informações financeiras → Outras" no
app da médica), diagnóstico/crash (não há SDK de falhas).

### Google — "Segurança dos dados"

- Coleta ou compartilha dados? **Coleta: sim. Compartilha com terceiros: não**
  (o Firebase só entrega notificações — o Google considera "provedor de
  serviço", que não conta como compartilhamento; conferir o texto na data).
- Dados criptografados em trânsito: **Sim**.
- A pessoa pode pedir exclusão: **Sim** (dentro do app e pela web — item 7).
- Tipos: *Informações pessoais* (nome, e-mail, telefone), *Saúde e fitness*
  (informações de saúde), *Mensagens* (no app da paciente), *Fotos e vídeos /
  Arquivos e documentos* (anexos, no app da médica), *Identificadores do
  dispositivo ou outros* (token de notificação, paciente). Todos:
  **coletados, não compartilhados, obrigatórios, finalidade "Funcionalidade
  do app"**.
- **Declaração de app de saúde** (Play Console → *Conteúdo do app*): declarar
  que o app trata informações de saúde, que é de uma clínica (prestador de
  saúde) e que o acesso é só para pacientes/equipe da clínica. O formulário
  muda com frequência — conferir na data do envio.

## 10. Nota ao revisor e contas de revisão

### Contas de revisão

As lojas exigem login para revisar. **Crie em produção, com dados fictícios,
e nunca as escreva no código nem no repositório** — só no formulário da loja.

- **Paciente fictícia** (para o Minha Jornada): cadastre pela clínica uma
  paciente "Revisão App Store" com e-mail que você controle, ative o acesso
  pelo link do e-mail, e crie para ela uma consulta, uma sessão na jornada e
  um documento de exemplo — senão o revisor vê telas vazias.
- **Usuário da equipe** (para o Marcela CRM): crie em *Equipe* um usuário com
  perfil de **recepção ou equipe (STAFF)** — **nunca ADMIN** —, com acesso às
  pacientes fictícias apenas. Lembre que ele enxerga o que o perfil enxerga:
  se houver pacientes reais, o revisor as verá. Prefira revisar num momento em
  que o perfil escolhido só alcance dados fictícios, ou peça orientação antes.
- **Não use** as contas de demonstração do ambiente de desenvolvimento.
- Depois da aprovação, pode desativar as contas (e reativar a cada nova
  versão).

### Nota ao revisor — Minha Jornada (colar no campo "Notas")

> Minha Jornada is the patient portal of the Dra. Marcela Duch medical
> aesthetics clinic in Brazil (interface in Portuguese). Only patients of the
> clinic have access: the clinic registers the patient and she activates
> access through a link sent to her e-mail.
>
> Demo account: (e-mail) / (senha) — a fictitious patient with sample
> appointments, treatment journey and documents.
>
> Native features: push notifications when the clinic confirms an appointment
> or records a new treatment step; Android back navigation; the session is
> kept in the device's native storage. All app code is bundled in the binary
> (no remote web content).
>
> Account deletion: Mais (bottom bar) → Excluir minha conta. Access is
> removed immediately (password, sessions, notification tokens). The clinical
> record is kept by the clinic as required by Brazilian medical regulations
> (CFM), and the app says so before confirming.

### Nota ao revisor — Marcela CRM

> Marcela CRM is the internal staff tool of the Dra. Marcela Duch clinic in
> Brazil (interface in Portuguese): daily schedule, front desk, patient
> records and treatment plans. There is no public sign-up; staff accounts are
> created by the clinic administrator. We request unlisted distribution.
>
> Demo account (staff profile, fictitious data only): (e-mail) / (senha).
>
> All app code is bundled in the binary (no remote web content).

## 11. Capturas de tela

**Tamanhos: conferir na data do envio** — as duas lojas mudam a lista. Em
novembro de 2026, o que costuma valer:

| Loja | Aparelho | Observação |
|---|---|---|
| Apple | iPhone 6,9" (ex.: 1320 × 2868 ou 1290 × 2796) | Obrigatório; a Apple reduz para os menores |
| Apple | iPad 13" (2064 × 2752 ou 2048 × 2732) | Obrigatório se o app roda em iPad — **os dois rodam** (o projeto declara iPhone e iPad) |
| Google | Celular | Mínimo 2, entre 320 e 3840 px, proporção até 2:1 |
| Google | Tablet 7" e 10" | Recomendado; pode ser exigido para aparecer em tablets |
| Google | Ícone 512 × 512 e imagem de destaque 1024 × 500 | Obrigatórios |

Sugestão de telas — paciente: Início, Consultas, Jornada (com sessões),
Documentos, Mensagens. Médica: Hoje, Agenda, Atender, Pacientes. **Sempre com
as contas fictícias**: nenhuma captura pode mostrar paciente real.

## 12. App da médica fora da busca

- **Apple — distribuição não listada.** Primeiro o app passa pela revisão
  normal. Depois, peça em https://developer.apple.com/contact/request/unlisted-app/
  (formulário "Unlisted App Distribution"; conferir o endereço na data),
  explicando: "Ferramenta interna de uma única clínica; acesso só para a
  equipe, sem cadastro aberto." Aprovado, o app só é encontrado por quem tem o
  link — mande o link para a equipe.
- **Google — teste fechado.** No Play Console, publique o Marcela CRM só na
  faixa **Teste fechado**, com uma lista de e-mails (as contas Google da
  equipe). Quem não está na lista não acha o app. Conferir na data se o Google
  exige um número mínimo de testadores/dias para contas pessoais (para conta
  de organização, em geral não).

## 13. Se a Apple recusar pela diretriz 4.2

A 4.2 ("funcionalidade mínima") é a recusa de app que "é só um site". Os apps
foram feitos para não cair nela: o código vai dentro do app (não é um site
carregado de fora), têm notificações nativas, navegação de app,
voltar do Android, sessão guardada no aparelho e exclusão de conta no app.

Se mesmo assim vier a recusa:

1. **Não reenvie igual.** Responda pela *Central de resoluções* do App Store
   Connect, em inglês, explicando: é o portal exclusivo das pacientes de uma
   clínica; usa notificações nativas para avisos de consulta e tratamento; o
   conteúdo é personalizado por paciente e não está disponível publicamente;
   o código é empacotado no app, não carregado de um site.
2. Anexe um vídeo curto (gravação de tela do iPhone) mostrando: login,
   notificação chegando, jornada de tratamento, exclusão de conta.
3. Para o **Marcela CRM**, reforce que é ferramenta interna e peça a
   distribuição não listada (item 12) — a Apple trata ferramenta de equipe de
   forma diferente de app ao público.
4. Se a recusa persistir, peça a apelação ao *App Review Board* (link na
   própria mensagem de recusa).

Mudanças de código que ajudariam, se a Apple insistir (não feitas nesta
versão, por decisão): desbloqueio por biometria no app da médica e
notificações para a equipe.

---

## 14. Build de teste no emulador

*Esta seção é técnica: para quem verifica os apps no emulador Android com a
API rodando no próprio computador.*

O app de loja fala com `https://www.dramarceladuch.com.br/api`. Para testar
contra a API local (`http://localhost:3001` no computador, que o emulador vê
como `http://10.0.2.2:3001`), existe um build de teste separado:

```sh
# no Windows: JAVA_HOME apontando para um JDK 21
cd apps/patient            # ou apps/admin
npm run build:nativo:teste # build web com VITE_API_URL=http://10.0.2.2:3001/api + cap sync com CAP_TESTE_LOCAL=1
cd android && ./gradlew assembleDebug
adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/app.apk
adb shell pm install -r /data/local/tmp/app.apk
```

(No Git Bash, prefixe os comandos `adb` com `MSYS_NO_PATHCONV=1`.)

**Sem compilar no computador:** cada execução do workflow já deixa esse APK
pronto no artefato `<app>-android-apk-teste-local-<versão>-<build>`; basta
baixar e instalar com os dois comandos `adb` acima.

A API de teste precisa aceitar a origem do app: `CORS_ORIGIN` com
`https://localhost` (o `.env.example` já traz).

O que esse build libera, e onde fica preso:

| Liberação | Onde | Por que não vaza para a loja |
|---|---|---|
| Conteúdo misto (página `https://localhost` chamando `http://`) | `android.allowMixedContent` em `capacitor.config.ts`, **só** com `CAP_TESTE_LOCAL=1` | Sem a variável não entra no `capacitor.config.json`; e o `android/app/build.gradle` **recusa compilar o release** se o arquivo sincronizado tiver `allowMixedContent: true` |
| Tráfego sem HTTPS, **só para `10.0.2.2`** | `android/app/src/debug/` (`network_security_config`) | Pasta `debug` só entra no APK de depuração; o release não a vê |

Estado em 15/11/2026: confirmado no computador que o `cap sync` do build de
teste grava `allowMixedContent: true` e que o bundle aponta para
`10.0.2.2:3001`, e que o APK de release **sem** a variável não leva
`networkSecurityConfig` nem `allowMixedContent`. **Não provados ainda:** o APK
de teste conversando de fato com a API local, e a recusa do release depois de
um sync de teste — provar com o APK do Actions.

**Depois de testar, antes de qualquer build de loja:** `npm run build:nativo`
e `npx cap sync android` de novo (o CI faz isso sempre do zero).
