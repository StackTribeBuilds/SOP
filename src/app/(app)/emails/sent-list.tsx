'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Paperclip, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EMAIL_KIND_LABEL, type EmailKind } from '@/lib/email/templates'
import type { SentEmail } from '@/lib/email-actions'
import { cn } from '@/lib/utils'

const when = (d: Date) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export function SentList({ emails, clientNames }: { emails: SentEmail[]; clientNames: Record<string, string> }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<EmailKind | 'ALL'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)

  const kinds = [...new Set(emails.map(e => e.kind))].filter(k => EMAIL_KIND_LABEL[k])
  const q = query.trim().toLowerCase()
  const shown = emails.filter(e =>
    (kind === 'ALL' || e.kind === kind) &&
    (!q || [e.subject, ...e.to, ...e.cc, e.clientId ? clientNames[e.clientId] : ''].join(' ').toLowerCase().includes(q)))

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search subject, client or address" className="pl-8" aria-label="Search sent emails" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
          {(['ALL', ...kinds] as const).map(k => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
              className={cn('rounded-md px-2.5 py-1 text-xs transition-colors',
                kind === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>
              {k === 'ALL' ? 'All' : EMAIL_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-14 text-center text-sm text-muted-foreground">
          {emails.length === 0
            ? 'Nothing sent yet. Email clients from an invoice, a change request, a project or a lead, or use New → Email.'
            : 'No sent emails match.'}
        </p>
      ) : (
        <ul className="divide-y">
          {shown.map(e => {
            const open = openId === e.id
            const client = e.clientId ? clientNames[e.clientId] : undefined
            return (
              <li key={e.id}>
                <button type="button" onClick={() => setOpenId(open ? null : e.id)} aria-expanded={open}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-muted/40">
                  <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      To {e.to.join(', ')}{client ? ` · ${client}` : ''} · by {e.sentBy}
                    </p>
                  </div>
                  {e.attachments.length > 0 && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={`${e.attachments.length} attachments`} />}
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{EMAIL_KIND_LABEL[e.kind] ?? e.kind}</Badge>
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">{when(e.sentAt)}</span>
                </button>
                {open && (
                  <div className="space-y-3 border-t bg-muted/30 px-5 py-4 sm:pl-14">
                    <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-[60px_1fr]">
                      <dt>To</dt><dd className="text-foreground">{e.to.join(', ')}</dd>
                      {e.cc.length > 0 && <><dt>Cc</dt><dd className="text-foreground">{e.cc.join(', ')}</dd></>}
                      {e.attachments.length > 0 && <><dt>Files</dt><dd className="text-foreground">{e.attachments.map(a => a.name).join(', ')}</dd></>}
                      {e.delivery === 'outbox' && <><dt>Note</dt><dd className="text-warn">Test mode: saved to the outbox folder, not delivered</dd></>}
                    </dl>
                    <p className="max-w-[75ch] whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {e.projectId && <Link className="font-medium text-primary hover:underline" href={`/projects/${e.projectId}`}>Open project</Link>}
                      {e.leadId && <Link className="font-medium text-primary hover:underline" href={`/leads/${e.leadId}`}>Open lead</Link>}
                      {e.clientId && <Link className="font-medium text-primary hover:underline" href={`/clients/${e.clientId}/onboard`}>Open client</Link>}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
