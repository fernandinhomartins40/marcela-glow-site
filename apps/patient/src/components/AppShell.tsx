import React from 'react'
import { CalendarDays, FileText, Home, LogOut, MessageCircle, type LucideIcon } from 'lucide-react'
import { logout } from '@/lib/api'
import { firstName, initials } from '@/lib/format'
import { cn } from './ui'

export type SectionId = 'inicio' | 'consultas' | 'prescricoes' | 'mensagens'

export const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'consultas', label: 'Consultas', icon: CalendarDays },
  { id: 'prescricoes', label: 'Prescrições', icon: FileText },
  { id: 'mensagens', label: 'Mensagens', icon: MessageCircle },
]

export function AppShell({
  active,
  onNavigate,
  patientName,
  unreadMessages,
  children,
}: {
  active: SectionId
  onNavigate: (id: SectionId) => void
  patientName: string | null
  unreadMessages?: number
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navegação lateral — desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[13.5rem] lg:w-60 flex-col border-r border-border bg-card">
        <div className="px-6 py-6 border-b border-border">
          {/* Sem `whitespace-nowrap`: a sidebar encolhe em tablet e o nome
              precisa poder quebrar em duas linhas em vez de vazar a coluna. */}
          <p className="font-display text-[0.95rem] tracking-[0.14em] uppercase text-primary leading-tight">
            Dra. Marcela Duch
          </p>
          <p className="mt-1 text-[0.6rem] tracking-[0.25em] uppercase text-muted-foreground">
            Portal da paciente
          </p>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label="Navegação principal">
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
                    {section.id === 'mensagens' && unreadMessages ? (
                      <span
                        className={cn(
                          'ml-auto min-w-5 h-5 px-1.5 rounded-full text-[0.65rem] font-medium inline-flex items-center justify-center',
                          isActive ? 'bg-primary-foreground/20' : 'bg-accent text-accent-foreground',
                        )}
                      >
                        {unreadMessages}
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
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-5 h-16 bg-card border-b border-border">
        <div className="min-w-0">
          <p className="font-display text-sm tracking-[0.2em] uppercase text-primary truncate">
            Dra. Marcela Duch
          </p>
          <p className="text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground">
            Portal da paciente
          </p>
        </div>
        <button onClick={logout} className="btn-ghost h-10 px-3 shrink-0" aria-label="Sair da conta">
          <LogOut size={16} aria-hidden="true" />
        </button>
      </header>

      {/* Conteúdo */}
      <div className="md:pl-[13.5rem] lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:pb-12">
          {children}
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
        <ul className="grid grid-cols-4">
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
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="text-[0.65rem] tracking-wide">{section.label}</span>
                  {section.id === 'mensagens' && unreadMessages ? (
                    <span className="absolute top-1.5 right-[22%] w-2 h-2 rounded-full bg-accent" />
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
