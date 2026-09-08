import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * O contrato da navegação.
 *
 * A sidebar foi desenhada olhando para a administradora, que vê os doze itens.
 * Para os outros seis papéis o agrupamento se desfazia: a assistente via dois
 * cabeçalhos em caixa-alta sobre dois botões, e a editora de conteúdo via o
 * título "DIVULGAÇÃO" sozinho sobre um único item. Rótulo que não separa nada
 * é altura gasta à toa.
 *
 * Estes testes leem o código-fonte de propósito: o que se quer proteger é a
 * decisão — que o menu continue fazendo sentido para quem não é ADMIN.
 */

const raiz = join(__dirname, '..', '..', '..')
const fonte = readFileSync(join(raiz, 'apps/admin/src/AdminApp.tsx'), 'utf8')

/** Os grupos como o menu os declara, com a permissão de cada item. */
function grupos(): { label: string; items: [string, string][] }[] {
  const bloco = fonte.slice(fonte.indexOf('const NAV_GROUPS = ['), fonte.indexOf('] as const satisfies'))
  const saida: { label: string; items: [string, string][] }[] = []
  for (const trecho of bloco.split(/label: '/).slice(1)) {
    const label = trecho.slice(0, trecho.indexOf("'"))
    const items = [...trecho.matchAll(/\['(\w+)',[^\]]*?'([A-Z_|]+)'\]/g)].map(
      (m) => [m[1], m[2]] as [string, string],
    )
    saida.push({ label, items })
  }
  return saida
}

/* As permissões de cada papel, copiadas de lib/permissions.ts. Duplicar aqui é
   proposital: o admin não importa da API, e o teste deve falhar se os dois
   divergirem — foi assim que a "Equipe" leu prontuário. */
const PAPEIS: Record<string, string[]> = {
  ADMIN: ['DASHBOARD_READ','PATIENT_READ','PATIENT_WRITE','RECORD_READ','RECORD_WRITE','APPOINTMENT_READ','APPOINTMENT_WRITE','LEAD_READ','LEAD_WRITE','PRESCRIPTION_READ','PRESCRIPTION_WRITE','PRESCRIPTION_SIGN','CMS_READ','CMS_WRITE','NOTIFICATION_SEND','SETTINGS_READ','SETTINGS_WRITE','USER_MANAGE','AUDIT_READ','FILE_MANAGE','FINANCE_OPERATE','FINANCE_MANAGE'],
  DOCTOR: ['DASHBOARD_READ','PATIENT_READ','PATIENT_WRITE','RECORD_READ','RECORD_WRITE','APPOINTMENT_READ','APPOINTMENT_WRITE','PRESCRIPTION_READ','PRESCRIPTION_WRITE','PRESCRIPTION_SIGN','FILE_MANAGE','FINANCE_MANAGE'],
  STAFF: ['DASHBOARD_READ','PATIENT_READ','APPOINTMENT_READ','APPOINTMENT_WRITE','LEAD_READ','LEAD_WRITE'],
  RECEPTION: ['DASHBOARD_READ','PATIENT_READ','PATIENT_WRITE','APPOINTMENT_READ','APPOINTMENT_WRITE','LEAD_READ','LEAD_WRITE','FINANCE_OPERATE'],
  ASSISTANT: ['PATIENT_READ','RECORD_READ','APPOINTMENT_READ','FILE_MANAGE'],
  CONTENT_EDITOR: ['CMS_READ','CMS_WRITE'],
  FINANCE: ['DASHBOARD_READ','PATIENT_READ','APPOINTMENT_READ','SETTINGS_READ','FINANCE_OPERATE','FINANCE_MANAGE'],
}

const visiveis = (papel: string) =>
  grupos()
    .map((g) => ({ ...g, items: g.items.filter(([, p]) => p.split('|').some((x) => PAPEIS[papel].includes(x))) }))
    .filter((g) => g.items.length > 0)

describe('a sidebar serve todos os papéis, não só a administradora', () => {
  it('todo papel enxerga ao menos uma tela', () => {
    /* Um papel sem nenhum item cairia num painel que só sabe dar 403. */
    for (const papel of Object.keys(PAPEIS)) {
      expect(visiveis(papel).flatMap((g) => g.items), papel).not.toHaveLength(0)
    }
  })

  it('ninguém vê um rótulo que não agrupa nada', () => {
    /* A regra do render: rotular exige mais de um grupo E que algum agrupe de
       fato. Onde ela não vale, os rótulos somem — e é isso que se verifica. */
    for (const papel of Object.keys(PAPEIS)) {
      const gs = visiveis(papel)
      const rotula = gs.length > 1 && gs.some((g) => g.items.length > 1)
      if (!rotula) continue
      const itens = gs.reduce((n, g) => n + g.items.length, 0)
      /* Com rótulos ligados, cada cabeçalho deve cobrir mais de um item em
         média — senão o menu é mais cabeçalho que conteúdo. */
      expect(itens / gs.length, `${papel}: ${gs.length} rótulos para ${itens} itens`).toBeGreaterThan(1)
    }
  })

  it('a regra do rótulo está no código, não só neste teste', () => {
    expect(fonte).toContain('const mostrarRotulos = gruposVisiveis.length > 1 && gruposVisiveis.some((g) => g.items.length > 1)')
    // O eyebrow nomeia o grupo da tela aberta: sem grupo rotulado ele mente.
    expect(fonte).toContain('{mostrarRotulos && <span className="eyebrow">')
  })
})

describe('os grupos refletem o trabalho', () => {
  it('o dia está em ordem cronológica', () => {
    /* Chega, é atendida, paga. A ordem do menu é a ordem dos fatos. */
    const dia = grupos().find((g) => g.label === 'O dia')!.items.map(([id]) => id)
    expect(dia).toEqual(['dashboard', 'appointments', 'reception', 'encounter', 'finance'])
  })

  it('Cadastros é configuração, não atendimento', () => {
    /* Estava em "Clínico", ao lado de Atendimento e Documentos. A médica mexe
       nele uma vez por mês, não com a paciente na sala. */
    const config = grupos().find((g) => g.label === 'Configuração')!.items.map(([id]) => id)
    expect(config).toContain('registry')
    const pacientes = grupos().find((g) => g.label === 'Pacientes')!.items.map(([id]) => id)
    expect(pacientes).not.toContain('registry')
  })

  it('quem trabalha no balcão vê a Recepção; quem não, não vê', () => {
    const temRecepcao = (papel: string) => visiveis(papel).flatMap((g) => g.items).some(([id]) => id === 'reception')
    expect(temRecepcao('RECEPTION')).toBe(true)
    // A médica remarca do consultório, mas não recebe no balcão.
    expect(temRecepcao('DOCTOR')).toBe(false)
    expect(temRecepcao('ASSISTANT')).toBe(false)
  })

  it('cada item aparece uma vez só', () => {
    const ids = grupos().flatMap((g) => g.items.map(([id]) => id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('a lateral acompanha a tela, não a altura da página', () => {
  /* Como célula de grid a `.app-nav` esticava até o tamanho do `main`: medido
     no navegador, 2640px de faixa escura numa janela de 720px, com o "Sair"
     descendo junto para fora do alcance. Só a medição revelou isso — a
     estrutura do menu estava certa o tempo todo. */
  const css = readFileSync(join(raiz, 'apps/admin/src/styles.css'), 'utf8')
  const regra = css.slice(css.indexOf('.app-nav {'), css.indexOf('}', css.indexOf('.app-nav {')))

  it('a barra é presa à tela e rola sozinha', () => {
    expect(regra).toMatch(/position:\s*sticky/)
    expect(regra).toMatch(/height:\s*100vh/)
    expect(regra).toMatch(/overflow-y:\s*auto/)
    /* `align-self: start` impede o grid de esticar a célula de volta. */
    expect(regra).toMatch(/align-self:\s*start/)
  })

  it('a gaveta do celular anula a altura fixa do desktop', () => {
    /* No mobile a lateral é `fixed` com `inset: 0 auto 0 0`, que já dá a
       altura da tela; herdar `height: 100vh` e `align-self: start` daqui
       quebraria a gaveta. */
    const mobile = css.slice(css.indexOf('.app-nav {', css.indexOf('position: fixed') - 400))
    expect(mobile).toMatch(/height:\s*auto/)
    expect(mobile).toMatch(/align-self:\s*stretch/)
  })

  it('o Sair fica no rodapé por margem automática', () => {
    const sair = css.slice(css.indexOf('.nav-signout {'), css.indexOf('}', css.indexOf('.nav-signout {')))
    expect(sair).toMatch(/margin-top:\s*auto/)
  })
})

describe('teste não entra no build de produção', () => {
  /* Este arquivo derrubou um deploy. O build roda `tsc --noEmit -p
     tsconfig.app.json`, que compilava `src` inteiro — testes junto —, e o
     Dockerfile do admin instala só as dependências do próprio app: `vitest`
     mora na raiz do monorepo e não existe lá dentro. O `compose build` morria
     com "Cannot find module 'vitest'" e abortava antes de subir container
     algum, deixando a versão anterior no ar.

     Localmente passava: `turbo run build` resolve `vitest` pela raiz. Só o
     container expunha a diferença. */
  for (const app of ['admin', 'web', 'patient']) {
    it(`${app} exclui testes do tsconfig do build`, () => {
      const conf = readFileSync(join(raiz, `apps/${app}/tsconfig.app.json`), 'utf8')
      expect(conf).toContain('src/**/*.test.ts')
      expect(conf).toContain('src/**/*.test.tsx')
    })
  }
})

describe('a lateral nao rola junto com a pagina', () => {
  /* `position: sticky` gruda em relacao ao ancestral que rola — e quem define
     esse ancestral pode ser uma regra distante. `overflow-x: hidden` no body
     obriga o navegador a computar `overflow-y: auto` (o `visible` deixa de ser
     possivel quando um eixo e `hidden`), fazendo do proprio body o container de
     rolagem. A lateral passava a grudar nele, nao na janela: medido, numa lista
     longa ela ia para -1943px e sumia, deixando o fundo a mostra.

     `clip` contem a rolagem horizontal igual e nao cria contexto de rolagem. */
  const css = readFileSync(join(raiz, 'apps/admin/src/styles.css'), 'utf8')

  it('o body contem o eixo horizontal sem virar container de rolagem', () => {
    const regra = css.match(/html,\s*body\s*\{[^}]*\}/)?.[0] ?? ''
    expect(regra).toMatch(/overflow-x:\s*clip/)
    expect(regra).not.toMatch(/overflow-x:\s*hidden/)
  })
})
