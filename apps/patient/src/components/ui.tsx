import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { toneClass } from '@/lib/format'

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <header className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-border">
          <h2 className="flex items-center gap-2.5 text-lg text-primary">
            {Icon && <Icon size={17} className="text-accent shrink-0" aria-hidden="true" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatusChip({ label, tone }: { label: string; tone: keyof typeof toneClass }) {
  return <span className={cn('chip', toneClass[tone])}>{label}</span>
}

/** Estado vazio — explica o que vai aparecer ali, em vez de só dizer "nenhum registro". */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="px-5 sm:px-6 py-10 text-center">
      {Icon && (
        <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
          <Icon size={18} className="text-accent" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{description}</p>
      )}
    </div>
  )
}

export function ItemRow({
  title,
  meta,
  description,
  trailing,
  href,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  description?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="text-[0.95rem] font-medium text-foreground">{title}</p>
          {trailing}
        </div>
        {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
        {description && (
          <p className="mt-2 text-sm text-foreground/70 leading-relaxed whitespace-pre-line">{description}</p>
        )}
      </div>
    </>
  )

  const base = 'flex items-start gap-4 px-5 sm:px-6 py-4 border-b border-border last:border-b-0'

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, 'transition-colors hover:bg-secondary/50')}
      >
        {content}
      </a>
    )
  }

  return <div className={base}>{content}</div>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-secondary', className)} />
}

export function Feedback({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'text-sm rounded-md px-3 py-2.5',
        tone === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]',
      )}
    >
      {children}
    </p>
  )
}
