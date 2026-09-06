import React from 'react'
import {
  CalendarDays,
  LayoutDashboard,
  MoreHorizontal,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { AdminTab } from '../pages/AdminPanel'

/**
 * Barra inferior de navegação, só no aplicativo instalado.
 *
 * O painel tem dez seções, e uma barra comporta quatro ou cinco antes de os
 * rótulos começarem a se cortar. As quatro escolhidas são as que se abrem todo
 * dia; o resto vive atrás de "Mais", que sobe como folha a partir do rodapé.
 *
 * Por que barra inferior e não a gaveta lateral que o painel já tem: numa mão
 * só, o topo da tela de um celular grande é inalcançável sem reposicionar o
 * aparelho. A gaveta continua existindo no navegador, onde a pessoa tem a barra
 * do sistema por perto e a tela costuma ser maior.
 */

const PRINCIPAIS: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Hoje', icon: LayoutDashboard },
  { id: 'encounter', label: 'Atender', icon: Stethoscope },
  { id: 'appointments', label: 'Agenda', icon: CalendarDays },
  { id: 'patients', label: 'Pacientes', icon: Users },
]

/** O que não coube na barra — abre na folha de "Mais". */
const SECUNDARIAS: { id: AdminTab; label: string; hint: string }[] = [
  { id: 'documents', label: 'Documentos', hint: 'Assinar e enviar receitas e pedidos de exame' },
  { id: 'registry', label: 'Cadastros', hint: 'Procedimentos, medicamentos, exames e modelos' },
  { id: 'leads', label: 'Leads', hint: 'Contatos interessados vindos do site' },
  { id: 'cms', label: 'Site', hint: 'Conteúdo da landing page e publicações' },
  { id: 'security', label: 'Equipe e acessos', hint: 'Quem usa o painel e registro de auditoria' },
  { id: 'settings', label: 'Ajustes', hint: 'Horários de atendimento e certificado digital' },
]

export function AppBar({
  tab,
  onNavigate,
  onSignOut,
}: {
  tab: AdminTab
  onNavigate: (id: AdminTab) => void
  onSignOut: () => void
}) {
  const [maisAberto, setMaisAberto] = React.useState(false)

  /* Estar numa seção secundária acende "Mais": sem isso a barra inteira fica
     apagada e o app parece não saber onde a pessoa está. */
  const emSecundaria = SECUNDARIAS.some((s) => s.id === tab)

  const ir = (id: AdminTab) => {
    setMaisAberto(false)
    onNavigate(id)
  }

  /* Voltar fecha a folha em vez de sair do app — é o que o botão de voltar do
     Android faz num aplicativo de verdade. */
  React.useEffect(() => {
    if (!maisAberto) return
    const fechar = () => setMaisAberto(false)
    window.addEventListener('popstate', fechar)
    window.history.pushState({ folha: true }, '')
    return () => {
      window.removeEventListener('popstate', fechar)
      if (window.history.state?.folha) window.history.back()
    }
  }, [maisAberto])

  return (
    <>
      {maisAberto && (
        <>
          <button
            className="folha-fundo"
            onClick={() => setMaisAberto(false)}
            aria-label="Fechar"
            tabIndex={-1}
          />
          <div className="folha" role="dialog" aria-label="Mais seções">
            <div className="folha-alca" aria-hidden="true" />
            <header>
              <strong>Mais</strong>
              <button onClick={() => setMaisAberto(false)} aria-label="Fechar">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <ul>
              {SECUNDARIAS.map((s) => (
                <li key={s.id}>
                  <button
                    className={tab === s.id ? 'is-active' : ''}
                    onClick={() => ir(s.id)}
                    aria-current={tab === s.id ? 'page' : undefined}
                  >
                    <span>
                      <strong>{s.label}</strong>
                      <em>{s.hint}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="folha-sair" onClick={onSignOut}>
              Sair da conta
            </button>
          </div>
        </>
      )}

      <nav className="app-bar" aria-label="Navegação principal">
        {PRINCIPAIS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? 'is-active' : ''}
            onClick={() => ir(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            {label}
          </button>
        ))}
        <button
          className={emSecundaria ? 'is-active' : ''}
          onClick={() => setMaisAberto((v) => !v)}
          aria-expanded={maisAberto}
        >
          <MoreHorizontal size={21} aria-hidden="true" />
          Mais
        </button>
      </nav>
    </>
  )
}
