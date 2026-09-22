import { useInfiniteQuery } from '@tanstack/react-query'
import { api, getErrorMessage, type DashboardData, type Message } from '@/lib/api'
import { RequestCare } from '@/components/RequestCare'
import { MessagesList } from '@/components/sections'

export function MessagesPage({ data }: { data: DashboardData }) {
  const history = useInfiniteQuery<{ messages: Message[]; nextCursor: string | null }>({
    queryKey: ['patient-messages'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => (await api.get('/patient/messages', { params: { cursor: pageParam } })).data,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
  const messages = history.data?.pages.flatMap((page) => page.messages) ?? data.messages
  return (
    <div className="space-y-6">
      <RequestCare procedures={data.procedures} initialIntent="message" />
      {history.isError && <p role="alert">{getErrorMessage(history.error, 'Não foi possível carregar o histórico.')}</p>}
      <MessagesList messages={messages} />
      {history.hasNextPage && (
        <button type="button" className="w-full rounded-lg border border-accent px-4 py-3 text-accent disabled:opacity-50" onClick={() => history.fetchNextPage()} disabled={history.isFetchingNextPage}>
          {history.isFetchingNextPage ? 'Carregando...' : 'Ver mensagens anteriores'}
        </button>
      )}
    </div>
  )
}
