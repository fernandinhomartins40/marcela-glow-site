import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { fetchDashboard, getErrorMessage } from '@/lib/api'
import { firstName } from '@/lib/format'
import { AppShell, type SectionId } from '@/components/AppShell'
import { DashboardSkeleton } from '@/components/sections'
import { HomePage } from '@/pages/sections/Home'
import { AppointmentsPage } from '@/pages/sections/Appointments'
import { Jornada } from './sections/Jornada'
import { JornadaDetalhe } from './sections/JornadaDetalhe'
import { PrescriptionsPage } from '@/pages/sections/Prescriptions'
import { MessagesPage } from '@/pages/sections/Messages'

/* A lista que valida a URL. Uma seção que existe na navegação mas falta aqui é
   silenciosamente rejeitada e cai em `inicio` — foi o que aconteceu com a
   jornada, que aparecia na barra e não abria. */
const SECTION_IDS: SectionId[] = ['inicio', 'consultas', 'jornada', 'prescricoes', 'mensagens']

export function Dashboard() {
  const navigateTo = useNavigate()
  const { section: requestedSection, planoId } = useParams()
  /* Em `/jornada/:planoId` o parametro `section` nao existe — quem manda e a
     rota. Sem isto o detalhe cairia no redirecionamento para `/inicio`. */
  const section: SectionId | null = planoId
    ? 'jornada'
    : SECTION_IDS.includes(requestedSection as SectionId)
      ? (requestedSection as SectionId)
      : null
  const query = useQuery({ queryKey: ['patient-dashboard'], queryFn: fetchDashboard })

  const data = query.data
  const patientName = data?.patient?.name ?? null
  const greeting = firstName(patientName)
  const unread = data?.notifications.filter((notification) => !notification.readAt).length ?? 0

  /* Aceita a secao ou um caminho inteiro (`/jornada/<id>`). O prefixo so
     entra quando falta: montar `/${id}` com um caminho ja barrado daria
     `//jornada/...`, que o roteador nao casa. */
  function navigate(destino: SectionId | string) {
    navigateTo(destino.startsWith('/') ? destino : `/${destino}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!section) return <Navigate to="/inicio" replace />

  return (
    <AppShell active={section} onNavigate={navigate} patientName={patientName} pending={unread}>
      {query.isLoading && <DashboardSkeleton />}

      {query.isError && (
        <div className="panel panel-pad text-center py-12">
          <div className="w-11 h-11 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle size={19} className="text-destructive" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl text-primary">Não conseguimos carregar seus dados</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {getErrorMessage(query.error, 'Verifique sua conexão e tente novamente.')}
          </p>
          <button onClick={() => query.refetch()} className="btn-outline mt-6">
            <RefreshCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          {/* A saudacao abre a secao, mas nao a pagina de um tratamento: ali a
              paciente ja escolheu o que quer ver, e repetir "Ola" so empurra o
              conteudo para baixo. */}
          {!planoId && (
            <div className="mb-6">
              <h1 className="font-display text-3xl sm:text-4xl text-primary">
                {greeting ? `Olá, ${greeting}` : 'Olá'}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Acompanhe sua jornada de cuidado com a Dra. Marcela.
              </p>
            </div>
          )}

          {section === 'inicio' && (
            <HomePage
              data={data}
              onRequest={() => navigate('consultas')}
              onNavigate={(nextSection) => navigate(nextSection)}
            />
          )}
          {section === 'consultas' && <AppointmentsPage data={data} />}
          {section === 'jornada' &&
            (planoId ? (
              <JornadaDetalhe
                data={data}
                planoId={planoId}
                onVoltar={() => navigateTo('/jornada')}
              />
            ) : (
              <Jornada data={data} onAbrir={(id) => navigate(`/jornada/${id}`)} />
            ))}
          {section === 'prescricoes' && <PrescriptionsPage data={data} />}
          {section === 'mensagens' && <MessagesPage data={data} />}
        </>
      )}
    </AppShell>
  )
}
