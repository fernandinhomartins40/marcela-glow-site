#!/usr/bin/env node
/**
 * Destila graphify-out/graph.json em um mapa curto da arquitetura.
 *
 * Por que existe: ler o grafo inteiro (5 MB) ou os arquivos afetados (~160 KB)
 * custa caro em contexto. Este script extrai só o que responde as perguntas
 * frequentes -- onde mexer, o que e hub, o que atravessa fronteira -- em ~2 KB,
 * que cabem no CLAUDE.md e ficam disponiveis sem nenhuma leitura de arquivo.
 *
 * Uso: node scripts/graph-map.js [--json]
 */
const fs = require('fs')
const path = require('path')

const GRAPH = path.join(__dirname, '..', 'graphify-out', 'graph.json')

if (!fs.existsSync(GRAPH)) {
  console.error('graph.json nao encontrado. Rode `graphify update .` primeiro.')
  process.exit(1)
}

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf8'))
const nodes = g.nodes || []
const links = g.links || []

const norm = (s) => (s || '').split(String.fromCharCode(92)).join('/')
const areaOf = (f) => {
  const p = norm(f)
  if (!p.includes('/')) return null
  const parts = p.split('/')
  return parts[0] === 'apps' || parts[0] === 'packages' ? `${parts[0]}/${parts[1]}` : parts[0]
}

const fileById = new Map(nodes.map((n) => [n.id, norm(n.source_file)]))
const nodeById = new Map(nodes.map((n) => [n.id, n]))

// 1. Peso de cada area
const byArea = new Map()
for (const n of nodes) {
  const a = areaOf(n.source_file)
  if (a) byArea.set(a, (byArea.get(a) || 0) + 1)
}

// 2. Grau de cada no (hubs = onde uma mudanca se propaga)
const degree = new Map()
for (const e of links) {
  degree.set(e.source, (degree.get(e.source) || 0) + 1)
  degree.set(e.target, (degree.get(e.target) || 0) + 1)
}

// 3. Arestas que cruzam fronteira de app/pacote
const cross = new Map()
for (const e of links) {
  const a = areaOf(fileById.get(e.source))
  const b = areaOf(fileById.get(e.target))
  if (a && b && a !== b) {
    const k = `${a} -> ${b}`
    cross.set(k, (cross.get(k) || 0) + 1)
  }
}

// 4. Hubs por area: o simbolo mais conectado de cada app
const hubsByArea = new Map()
for (const [id, d] of degree) {
  const n = nodeById.get(id)
  if (!n) continue
  const a = areaOf(n.source_file)
  if (!a) continue
  const cur = hubsByArea.get(a)
  if (!cur || d > cur.d) hubsByArea.set(a, { label: n.label, d, file: norm(n.source_file), loc: n.source_location })
}

const result = {
  commit: g.built_at_commit || null,
  totals: { nodes: nodes.length, edges: links.length },
  areas: [...byArea.entries()].sort((a, b) => b[1] - a[1]),
  crossBoundary: [...cross.entries()].sort((a, b) => b[1] - a[1]),
  hubs: [...hubsByArea.entries()].sort((a, b) => b[1].d - a[1].d),
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

console.log(`# Mapa da arquitetura  (commit ${result.commit || '?'})`)
console.log(`${result.totals.nodes} nos - ${result.totals.edges} arestas\n`)

console.log('## Peso por area')
for (const [a, n] of result.areas) console.log(`- ${a}: ${n} nos`)

console.log('\n## Hub de cada area (maior propagacao de mudanca)')
for (const [a, h] of result.hubs) {
  console.log(`- ${a}: ${h.label} (${h.d} arestas) - ${h.file}:${h.loc}`)
}

console.log('\n## Acoplamento entre areas')
if (result.crossBoundary.length === 0) {
  console.log('- nenhum: as areas sao silos independentes')
} else {
  for (const [k, n] of result.crossBoundary) console.log(`- ${k}: ${n} arestas`)
}
