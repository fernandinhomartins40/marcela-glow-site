import React from 'react'
import { CalendarDays, FileText, Home, LogOut, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react'
import { logout } from '@/lib/api'
import { firstName, initials } from '@/lib/format'
import { cn } from './ui'
import logoMD from '@/assets/brand/md-monogram-brown.webp'
import { useAplicativoInstalado } from '@/lib/standalone'

export type SectionId = 'inicio' | 'consultas' | 'jornada' | 'prescricoes' | 'mensagens'

/** `badge: true` marca onde o contador de pendências aparece. */
/**
 * As seções do portal.
 *
 * "Minha jornada" fica no meio e em destaque: é o que dá sentido ao nome do
 * aplicativo e o que a paciente abre para saber onde está no tratamento. O
 * centro da barra é também o ponto que o polegar alcança sem reposicionar o
 * aparelho.
 */
export const SECTIONS: { id: SectionId; label: string; icon: LucideIcon; badge?: boolean; destaque?: true }[] = [
  { id: 'inicio', label: 'Início', icon: Home, badge: true },
  { id: 'consultas', label: 'Consultas', icon: CalendarDays },
  { id: 'jornada', label: 'Jornada', icon: Sparkles, destaque: true },
  { id: 'prescricoes', label: 'Prescrições', icon: FileText },
  { id: 'mensagens', label: 'Mensagens', icon: MessageCircle },
]

export function AppShell({
  active,
  onNavigate,
  patientName,
  pending,
  children,
}: {
  active: SectionId
  onNavigate: (id: SectionId) => void
  patientName: string | null
  /** Avisos ainda não lidos — aparecem como contador sobre "Início". */
  pending?: number
  children: React.ReactNode
}) {
  /* Instalado, o portal deixa de se comportar como página: o cabeçalho desce
     abaixo do entalhe da câmera, a rolagem para no limite em vez de revelar o
     fundo do sistema, e a troca de seção desliza. Pelo navegador nada disso
     muda — lá a barra de endereço e o botão de voltar já dão esse contexto. */
  const comoApp = useAplicativoInstalado()

  return (
    <div className={cn('min-h-screen bg-background', comoApp && 'is-app')}>
      {/* Navegação lateral — desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[13.5rem] lg:w-60 flex-col border-r border-border bg-card">
        <div className="px-6 py-6 border-b border-border">
          {/* Sem `whitespace-nowrap`: a sidebar encolhe em tablet e o nome
              precisa poder quebrar em duas linhas em vez de vazar a coluna. */}
          <div className="flex items-center gap-3">
            <img src={logoMD} alt="Monograma Dra. Marcela Duch" className="h-10 w-10 object-contain shrink-0" width={40} height={40} />
            <div>
              <p className="font-display text-[0.95rem] tracking-[0.14em] uppercase text-primary leading-tight">Dra. Marcela Duch</p>
              <p className="mt-1 text-[0.6rem] tracking-[0.25em] uppercase text-muted-foreground">Portal da paciente</p>
            </div>
          </div>
        </div>

        {/* `min-h-0` é o que permite encolher: sem ele o `flex-1` respeita o
            tamanho do conteúdo e a lista empurra o rodapé (conta e sair) para
            fora da tela numa janela baixa, em vez de rolar. */}
        <nav className="flex-1 min-h-0 overflow-y-auto barra-fina px-3 py-4" aria-label="Navegação principal">
          <ul className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = active === section.id
              return (
                <li key={section.id}>
                  <button
                    onClick={() => onNavigate(section.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 h-11 px-3 rounded-md text-sm transition-colors duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <Icon size={17} className="shrink-0" aria-hidden="true" />
                    {section.label}
                    {section.badge && pending ? (
                      <span
                        className={cn(
                          'ml-auto min-w-5 h-5 px-1.5 rounded-full text-[0.65rem] font-medium inline-flex items-center justify-center',
                          isActive ? 'bg-primary-foreground/20' : 'bg-accent text-accent-foreground',
                        )}
                        aria-label={`${pending} aviso${pending > 1 ? 's' : ''} não lido${pending > 1 ? 's' : ''}`}
                      >
                        {pending}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <span className="w-9 h-9 rounded-full bg-secondary text-primary flex items-center justify-center text-xs font-medium shrink-0">
              {initials(patientName)}
            </span>
            <span className="text-sm text-foreground truncate" title={patientName ?? undefined}>
              {firstName(patientName) ?? 'Minha conta'}
            </span>
          </div>
          <button onClick={logout} className="btn-ghost w-full justify-start">
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      {/* Topo — mobile */}
      <header
        className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-5 h-16 bg-card border-b border-border"
        style={comoApp ? { paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' } : undefined}
      >
        {/* A logo faltava no topo: sobrava so o texto, e o portal perdia a
            marca justamente na tela que a paciente mais abre. */}
        <div className="flex items-center gap-3 min-w-0">
          <img src={logoMD} alt="" className="h-9 w-auto shrink-0" width={36} height={36} />
          <div className="min-w-0">
          <p className="font-display text-sm tracking-[0.2em] uppercase text-primary truncate">
            Dra. Marcela Duch
          </p>
          <p className="text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground">
            Portal da paciente
          </p>
          </div>
        </div>
        <button onClick={logout} className="btn-ghost h-10 px-3 shrink-0" aria-label="Sair da conta">
          <LogOut size={16} aria-hidden="true" />
        </button>
      </header>

      {/* Conteúdo */}
      <div className="md:pl-[13.5rem] lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:pb-12">
          {/* `key` na seção ativa: sem ela o React reaproveita o nó e a animação
              não reinicia, então a troca acontece sem movimento nenhum. */}
          <div key={active} className={comoApp ? 'tela-entra' : undefined}>
            {children}
          </div>
          {/* Espaçador: garante que a navegação fixa do mobile não cubra o fim do conteúdo */}
          <div className="h-24 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-hidden="true" />
        </main>
      </div>

      {/* Navegação inferior — mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border"
        aria-label="Navegação principal"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Cinco colunas: a Jornada entrou no meio e a grade de quatro deixava
            a ultima secao sem lugar. */}
        <ul className="grid grid-cols-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = active === section.id
            return (
              <li key={section.id}>
                <button
                  onClick={() => onNavigate(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative w-full flex flex-col items-center justify-center gap-1 py-2.5 min-h-[3.75rem] transition-colors',
                    section.destaque && 'pt-8',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {/* A Jornada sobe num circulo acima da barra: e o que da
                      sentido ao nome do aplicativo, e o centro da barra e o
                      ponto que o polegar alcanca sem mover o aparelho. */}
                  {section.destaque ? (
                    <span className="pat-circulo">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                  ) : (
                    <Icon size={19} aria-hidden="true" />
                  )}
                  <span className="text-[0.65rem] tracking-wide">{section.label}</span>
                  {section.badge && pending ? (
                    <span
                      className="absolute top-1.5 right-[22%] w-2 h-2 rounded-full bg-accent"
                      aria-label={`${pending} aviso${pending > 1 ? 's' : ''} não lido${pending > 1 ? 's' : ''}`}
                    />
                  ) : null}
                  {isActive && <span className="absolute top-0 inset-x-4 h-px bg-primary" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
