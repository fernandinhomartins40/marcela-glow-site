import React from 'react'
import { ChevronRight, FileText, HelpCircle, Mail, Sprout } from 'lucide-react'
import type { DashboardData } from '@/lib/api'
import { pickNextAppointment } from '@/lib/format'
import { NextAppointment } from '@/components/NextAppointment'
import { RequestCare } from '@/components/RequestCare'
import { NotificationsPanel } from '@/components/sections'
import type { Plano } from './Jornada'
import { JourneySteps, etapasDaJornada } from '@/components/JourneySteps'

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
  /* A conversa vem da mais recente para a mais antiga: se a última palavra é
     da equipe, há algo que a paciente ainda não respondeu. */
  const lastIsStaff = data.messages[0]?.sender === 'STAFF'
  const etapas = etapasDaJornada(data.appointments, currentPlan)
  const atual = Math.max(0, etapas.findIndex((etapa) => etapa.estado === 'atual'))

  return (
    <div className="space-y-5 sm:space-y-6">
      <NextAppointment appointment={next} onRequest={onRequest} onDetails={() => onNavigate('consultas')} />

      <section className="panel panel-pad bg-card" aria-labelledby="home-journey-title">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="home-journey-title" className="font-display text-2xl sm:text-3xl text-primary">Sua jornada</h2>
          <p className="text-sm text-muted-foreground">Você está na etapa {atual + 1} de {etapas.length}</p>
        </div>
        {currentPlan && <p className="mt-1 text-sm text-foreground/80">{currentPlan.title}{currentPlan.status === 'PAUSED' ? ' · plano pausado' : ''}</p>}
        <div className="mt-6">
          <JourneySteps etapas={etapas} />
        </div>
        <button type="button" onClick={() => onNavigate('jornada')} className="btn-outline mt-6 h-12 w-full justify-center border-primary/60 text-base">
          Ver minha jornada <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>

      <section aria-label="Acessos rápidos" className="grid gap-3 sm:grid-cols-2">
        <Atalho
          onClick={() => onNavigate('mensagens')}
          icone={<Mail size={22} aria-hidden="true" />}
          tom="bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
          titulo="Mensagens"
          texto={lastIsStaff ? 'Você tem uma nova orientação' : lastStaffMessage?.body ?? 'Converse com a equipe quando precisar'}
          novidade={lastIsStaff}
        />
        <Atalho
          onClick={() => onNavigate('prescricoes')}
          icone={<FileText size={22} aria-hidden="true" />}
          titulo="Receitas e documentos"
          texto={documentCount ? `${documentCount} ${documentCount === 1 ? 'item disponível' : 'itens disponíveis'}` : 'Acesse seus documentos sempre que precisar'}
        />
        <Atalho
          onClick={() => onNavigate('mensagens')}
          icone={<HelpCircle size={22} aria-hidden="true" />}
          titulo="Precisa de ajuda?"
          texto="Fale com nossa equipe"
          largo
        />
      </section>

      <figure className="panel flex items-center gap-4 border-transparent bg-secondary/60 px-5 py-5">
        <Sprout size={30} strokeWidth={1.3} className="shrink-0 text-[hsl(var(--accent-text))]" aria-hidden="true" />
        <blockquote className="min-w-0">
          <p className="font-display text-xl italic leading-snug text-primary">Pequenas escolhas, grandes avanços.</p>
          <figcaption className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Dra. Marcela</figcaption>
        </blockquote>
      </figure>

      <RequestCare procedures={data.procedures} />
      <div id="avisos" className="scroll-mt-20">
        <NotificationsPanel notifications={data.notifications} />
      </div>
    </div>
  )
}

function Atalho({
  onClick,
  icone,
  titulo,
  texto,
  tom = 'bg-secondary text-primary',
  novidade,
  largo,
}: {
  onClick: () => void
  icone: React.ReactNode
  titulo: string
  texto: string
  tom?: string
  novidade?: boolean
  largo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel flex w-full min-w-0 min-h-[5.5rem] items-center gap-4 bg-card px-5 py-4 text-left transition-colors hover:bg-secondary/50 ${largo ? 'sm:col-span-2' : ''}`}
    >
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${tom}`}>{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.05rem] font-medium text-foreground">{titulo}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{texto}</span>
      </span>
      {novidade && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--bronze))]" aria-label="Nova" />}
      <ChevronRight size={20} className="shrink-0 text-foreground/70" aria-hidden="true" />
    </button>
  )
}
