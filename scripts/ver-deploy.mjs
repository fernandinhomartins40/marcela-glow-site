#!/usr/bin/env node
/**
 * Le os logs do GitHub Actions deste repositorio.
 *
 * Nasceu de um deploy que falhou sem que houvesse como ver o motivo: `gh` nao
 * esta instalado, o repositorio e privado (a API publica devolve 404) e a
 * investigacao acabou feita por SSH na VPS, comparando data de imagem Docker
 * com data de release para deduzir em que passo o job morreu. O log dizia a
 * mesma coisa em uma linha.
 *
 * O token sai de onde o `git push` ja o guarda (`~/.git-credentials`), entao
 * nao ha credencial nova para gerenciar. Se o helper do git mudar, defina
 * GITHUB_TOKEN no ambiente.
 *
 *   node scripts/ver-deploy.mjs            # ultimas execucoes
 *   node scripts/ver-deploy.mjs falhas     # so as que falharam
 *   node scripts/ver-deploy.mjs <run_id>   # passo que falhou + erro
 *   node scripts/ver-deploy.mjs <run_id> --tudo   # log inteiro do passo
 */
import { readFileSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const REPO = 'fernandinhomartins40/marcela-glow-site'

/** O token que o `git push` ja usa; GITHUB_TOKEN tem precedencia. */
function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    const linha = readFileSync(join(homedir(), '.git-credentials'), 'utf8')
      .split(/\r?\n/)
      .find((l) => l.includes('github.com'))
    const m = linha?.match(/:\/\/[^:]+:([^@]+)@/)
    if (m) return m[1]
  } catch {
    /* segue para a mensagem abaixo */
  }
  console.error(
    'Sem token do GitHub.\n' +
      'Esperado em ~/.git-credentials (o mesmo que o `git push` usa) ou em GITHUB_TOKEN.\n' +
      'O token precisa dos escopos `repo` e `workflow`.',
  )
  process.exit(1)
}

const TOK = token()
const cabecalho = { Authorization: `token ${TOK}`, 'User-Agent': 'ver-deploy', Accept: 'application/vnd.github+json' }

async function api(caminho) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, { headers: cabecalho })
  if (!r.ok) {
    if (r.status === 401) console.error('Token recusado (401): expirou ou perdeu o escopo `repo`.')
    else if (r.status === 404) console.error(`Nao encontrado (404): ${caminho}`)
    else console.error(`HTTP ${r.status} em ${caminho}`)
    process.exit(1)
  }
  return r.json()
}

const marca = (c) => (c === 'success' ? 'ok    ' : c === 'failure' ? 'FALHOU' : `${c ?? '...'}`.padEnd(6))

async function listar(sofalhas) {
  const q = sofalhas ? '&status=failure' : ''
  const { workflow_runs: runs } = await api(`/actions/runs?per_page=10${q}`)
  if (!runs.length) return console.log('Nenhuma execucao encontrada.')
  for (const r of runs) {
    const quando = new Date(r.created_at).toLocaleString('pt-BR')
    console.log(`${marca(r.conclusion)} ${quando}  ${r.head_sha.slice(0, 8)}  ${r.display_title.split('\n')[0]}`)
    console.log(`       run ${r.id}`)
  }
  const falha = runs.find((r) => r.conclusion === 'failure')
  if (falha && !sofalhas) console.log(`\nPara o motivo da ultima falha:\n  node scripts/ver-deploy.mjs ${falha.id}`)
}

/** Baixa o zip de logs e devolve o texto do arquivo de cada passo. */
function baixarLogs(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-log-'))
  const zip = join(dir, 'logs.zip')
  /* fetch nao segue bem o redirect assinado do GitHub para binario; curl sim.
     O token vai por variavel de ambiente, nao por argumento: argumento de
     processo e visivel a qualquer usuario da maquina (`ps`, Get-Process). */
  execFileSync('curl', ['-sSL', '-H', '@-', '-o', zip,
    `https://api.github.com/repos/${REPO}/actions/runs/${runId}/logs`],
    { input: `Authorization: token ${TOK}\n`, stdio: ['pipe', 'ignore', 'inherit'] })
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}\\x' -Force`], { stdio: ['ignore', 'ignore', 'inherit'] })
  return join(dir, 'x')
}

async function detalhar(runId, tudo) {
  const run = await api(`/actions/runs/${runId}`)
  console.log(`${run.display_title.split('\n')[0]}`)
  console.log(`${marca(run.conclusion)} ${run.head_sha.slice(0, 8)}  ${new Date(run.created_at).toLocaleString('pt-BR')}\n`)

  const { jobs } = await api(`/actions/runs/${runId}/jobs`)
  const quebrados = []
  for (const j of jobs) {
    console.log(`job: ${j.name} -> ${j.conclusion}`)
    for (const s of j.steps ?? []) {
      if (s.conclusion !== 'success' && s.conclusion !== 'skipped') {
        console.log(`  FALHOU no passo #${s.number}: ${s.name}`)
        quebrados.push({ job: j.name, numero: s.number, nome: s.name })
      }
    }
  }
  if (!quebrados.length) return console.log('\nNenhum passo falhou.')

  const raiz = baixarLogs(runId)
  const { readdirSync, statSync } = await import('node:fs')
  const arquivos = []
  const varrer = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      statSync(p).isDirectory() ? varrer(p) : arquivos.push(p)
    }
  }
  varrer(raiz)

  for (const q of quebrados) {
    /* Varios jobs tem passo de mesmo nome ("Build and push", "Checkout"):
       sem filtrar pela pasta do job, o log mostrado era o de outro job. */
    const doJob = arquivos.filter((a) => a.includes(`${q.job}\\`) || a.includes(`${q.job}/`))
    /* Desde 09/2026 o zip traz um arquivo por job na raiz ("1_Build web.txt")
       e so `system.txt` na pasta do job; o formato antigo tinha um por passo. */
    const base = (a) => a.split(/[\\/]/).pop()
    const alvo = doJob.find((a) => a.includes(`${q.numero}_${q.nome}`)) ??
      doJob.find((a) => a.includes(q.nome)) ??
      arquivos.find((a) => new RegExp(`^\\d+_${q.job}\\.txt$`).test(base(a)))
    if (!alvo) { console.log(`\n(log do passo "${q.nome}" nao encontrado no zip)`); continue }
    const linhas = readFileSync(alvo, 'utf8').split(/\r?\n/).map((l) => l.replace(/^\S+Z /, ''))
    console.log(`\n${'='.repeat(70)}\n${q.nome}\n${'='.repeat(70)}`)
    if (tudo) { console.log(linhas.join('\n')); continue }

    /* O erro raramente esta na ultima linha: um build quebra no meio e o
       resto e ruido de rollback. Mostra o que casa com erro e o fim. */
    const padrao = /error TS\d+|Cannot find module|Could not (load|resolve)|ENOENT|ERROR:|error:|falhou|failed|Error:|npm ERR!|exit code [1-9]/i
    const achados = linhas.map((l, i) => [i, l]).filter(([, l]) => padrao.test(l) && l.trim())
    if (achados.length) {
      console.log('\n--- linhas com erro ---')
      const vistos = new Set()
      for (const [, l] of achados.slice(0, 25)) {
        const limpo = l.replace(/^#\d+ [\d.]+ /, '').trim()
        if (!vistos.has(limpo)) { vistos.add(limpo); console.log(`  ${limpo}`) }
      }
    }
    console.log('\n--- ultimas 25 linhas ---')
    console.log(linhas.filter((l) => l.trim()).slice(-25).map((l) => `  ${l}`).join('\n'))
  }
  console.log(`\n(log completo: node scripts/ver-deploy.mjs ${runId} --tudo)`)
}

const args = process.argv.slice(2)
const alvo = args.find((a) => !a.startsWith('--'))
if (!alvo) await listar(false)
else if (alvo === 'falhas') await listar(true)
else await detalhar(alvo, args.includes('--tudo'))
