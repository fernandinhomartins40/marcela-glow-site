import { ChevronRight, FileText, Heart, HelpCircle, MessageCircle } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { pickNextAppointment } from '@/lib/format'
import { NextAppointment } from '@/components/NextAppointment'
import { RequestCare } from '@/components/RequestCare'
import { NotificationsPanel } from '@/components/sections'
import type { Plano } from './Jornada'

export function HomePage({
  data,
  onRequest,
  onNavigate,
}: {
  data: DashboardData
  onRequest: () => void
  onNavigate: (section: 'consultas' | 'jornada' | 'prescricoes' | 'mensagens') => void
}) {
  const next = pickNextAppointment(data.appointments)
  const plans = (data.plans ?? []) as Plano[]
  const currentPlan = plans.find((plan) => plan.status === 'ACTIVE')
    ?? plans.find((plan) => plan.status === 'PAUSED')
  // O dashboard entrega mensagens da mais recente para a mais antiga.
  const lastStaffMessage = data.messages.find((message) => message.sender === 'STAFF')
  const documentCount = data.prescriptions.length + data.attachments.length

  return (
    <div className="space-y-5 sm:space-y-6">
      <NextAppointment appointment={next} onRequest={onRequest} onDetails={() => onNavigate('consultas')} />

      <section className="panel panel-pad bg-white" aria-labelledby="home-journey-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-eyebrow">Seu cuidado</p>
            <h2 id="home-journey-title" className="mt-1 font-display text-2xl sm:text-3xl text-primary">
              Sua jornada
            </h2>
          </div>
          <Heart size={24} className="text-accent" aria-hidden="true" />
        </div>
        {currentPlan ? (
          <div className="mt-5">
            <p className="text-lg font-medium text-foreground">{currentPlan.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentPlan.status === 'PAUSED' ? 'Plano pausado' : 'Plano em andamento'}
              {' · '}{currentPlan.progresso.feitas} de {currentPlan.progresso.total} sessões realizadas
            </p>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Progresso do plano"
              aria-valuenow={currentPlan.progresso.percentual}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[hsl(var(--espresso))]"
                style={{ width: `${Math.max(0, Math.min(100, currentPlan.progresso.percentual))}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Seu plano de cuidado aparecerá aqui assim que for definido na consulta.
          </p>
        )}
        <button type="button" onClick={() => onNavigate('jornada')} className="btn-outline mt-6 w-full justify-center">
          Ver minha jornada <ChevronRight size={17} aria-hidden="true" />
        </button>
      </section>

      <section aria-label="Acessos rápidos" className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onNavigate('mensagens')} className="panel panel-pad bg-white flex items-center gap-4 text-left transition-colors hover:bg-secondary/50">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-accent"><MessageCircle size={22} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">Mensagens e orientações</span>
            <span className="mt-1 block truncate text-sm text-muted-foreground">{lastStaffMessage?.body ?? 'Converse com a equipe quando precisar'}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onNavigate('prescricoes')} className="panel panel-pad bg-white flex items-center gap-4 text-left transition-colors hover:bg-secondary/50">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-accent"><FileText size={22} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">Receitas e documentos</span>
            <span className="mt-1 block text-sm text-muted-foreground">{documentCount ? `${documentCount} ${documentCount === 1 ? 'item disponível' : 'itens disponíveis'}` : 'Seus documentos ficam aqui'}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onNavigate('mensagens')} className="panel panel-pad bg-white flex items-center gap-4 text-left transition-colors hover:bg-secondary/50 sm:col-span-2">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-accent"><HelpCircle size={22} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">Precisa de ajuda com seu cuidado?</span>
            <span className="mt-1 block text-sm text-muted-foreground">Escreva sua dúvida para a equipe</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </section>

      <RequestCare procedures={data.procedures} />
      <NotificationsPanel notifications={data.notifications} />
    </div>
  )
}
