'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Eye, Loader2, Mail, Paperclip, PenLine, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getComposerData, sendEmail, type ComposerData, type EmailContext } from '@/lib/email-actions'
import { EMAIL_KIND_LABEL, type EmailKind } from '@/lib/email/templates'
import { renderEmailHtml } from '@/lib/email/render'
import { cn } from '@/lib/utils'

type Attachment = { name: string; type: string; size: number; base64: string }

const MAX_TOTAL = 10 * 1024 * 1024
const splitEmails = (s: string) => s.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const ATTACH_HINT: Partial<Record<EmailKind, string>> = {
  PROPOSAL: 'Attach the proposal PDF (export it from Proposal & contract).',
  CONTRACT: 'Attach the agreement PDF for signature.',
  INVOICE: 'Attach the invoice PDF if the client needs one for their books.',
}

export function EmailComposer({
  context,
  kind: initialKind,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  context: EmailContext
  kind?: EmailKind
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState

  const [data, setData] = useState<ComposerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [signature, setSignature] = useState('')
  const [editSignature, setEditSignature] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [markSent, setMarkSent] = useState(true)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async (kind?: EmailKind) => {
    setLoading(true)
    setLoadError('')
    const res = await getComposerData(context, kind)
    setLoading(false)
    if (!res.success) return setLoadError(res.error)
    const d = res.data
    setData(d)
    setTo(d.to.join(', '))
    setCc(d.cc.join(', '))
    setSubject(d.subject)
    setBody(d.body)
    setSignature(s => s || d.signature)
  }

  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }

  // Runs every time the dialog opens, whether from its own trigger or from a parent
  const init = () => {
    setData(null)
    setAttachments([])
    setPreview(false)
    setMarkSent(true)
    setSignature('')
    load(initialKind)
  }

  const toList = splitEmails(to)
  const totalBytes = attachments.reduce((s, a) => s + a.size, 0)
  const previewHtml = useMemo(() => (preview ? renderEmailHtml({ body, signature }) : ''), [preview, body, signature])

  const toggleRecipient = (email: string) => {
    const list = splitEmails(to)
    setTo((list.includes(email) ? list.filter(e => e !== email) : [...list, email]).join(', '))
  }

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const next = [...attachments]
    for (const f of Array.from(files)) {
      if (next.length >= 5) { toast.error('Attach up to 5 files'); break }
      if (next.reduce((s, a) => s + a.size, 0) + f.size > MAX_TOTAL) { toast.error(`${f.name} would take the attachments over 10 MB`); continue }
      next.push({ name: f.name, type: f.type, size: f.size, base64: await readAsBase64(f) })
    }
    setAttachments(next)
    if (fileInput.current) fileInput.current.value = ''
  }

  const send = async () => {
    if (!data) return
    setSending(true)
    const res = await sendEmail({
      kind: data.kind,
      context,
      to: toList,
      cc: splitEmails(cc),
      subject,
      body,
      signature,
      attachments: attachments.map(({ name, type, base64 }) => ({ name, type, base64 })),
      markInvoiceSent: data.kind === 'INVOICE' && data.canMarkInvoiceSent && markSent,
    })
    setSending(false)
    if (!res.success) return toast.error(res.error)
    toast.success(res.invoiceMarkedSent ? 'Invoice emailed and marked as sent' : `Email sent to ${toList.join(', ')}`)
    setOpen(false)
    router.refresh()
  }

  const off = data?.sender.mode === 'off'
  const sendLabel = data?.kind === 'INVOICE' ? 'Send invoice' : data?.kind === 'PAYMENT_REMINDER' ? 'Send reminder' : 'Send email'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0 gap-0" onOpenAutoFocus={init}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> New email</DialogTitle>
          <DialogDescription>{data?.about ?? 'Loading…'}</DialogDescription>
        </DialogHeader>

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing the draft
          </div>
        ) : loadError ? (
          <p className="m-6 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{loadError}</p>
        ) : data && (
          <div className="space-y-4 px-6 py-5">
            {off && (
              <div className="flex gap-2 rounded-md border border-warn/20 bg-warn-soft px-3 py-2.5 text-sm text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Email isn&apos;t connected yet, so this can&apos;t be sent. Add {data.sender.missing?.join(', ')} to the server settings. See Emails → Setup.</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="text-sm">
                <span className="text-muted-foreground">From </span>
                <span className="font-medium">{data.sender.label}</span>
              </div>
              <Select value={data.kind} onValueChange={(v) => load(v as EmailKind)} disabled={loading}>
                <SelectTrigger className="h-8 text-[13px]" aria-label="Template"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.kinds.map(k => <SelectItem key={k} value={k}>{EMAIL_KIND_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-to">To</Label>
              <Input id="email-to" value={to} onChange={e => setTo(e.target.value)} placeholder="name@company.com, another@company.com" />
              {data.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.recipients.map(r => {
                    const on = toList.includes(r.email)
                    return (
                      <button key={r.email} type="button" onClick={() => toggleRecipient(r.email)}
                        className={cn('rounded-md border px-2 py-0.5 text-xs transition-colors',
                          on ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted')}>
                        {r.name} · {r.role}
                      </button>
                    )
                  })}
                </div>
              )}
              {data.recipients.length === 0 && (
                <p className="text-xs text-muted-foreground">No email address is saved for this contact. Type one, and add it to the client record later.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-cc">Cc</Label>
              <Input id="email-cc" value={cc} onChange={e => setCc(e.target.value)} placeholder="Optional" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Message</Label>
                <button type="button" onClick={() => setPreview(p => !p)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  {preview ? <><PenLine className="h-3.5 w-3.5" /> Edit</> : <><Eye className="h-3.5 w-3.5" /> Preview</>}
                </button>
              </div>
              {preview ? (
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  // Scripts stay blocked; same-origin only lets the browser paint our escaped HTML
                  sandbox="allow-same-origin"
                  className="h-[440px] w-full rounded-md border bg-[#f4f3f7]"
                />
              ) : (
                <>
                  <Textarea id="email-body" value={body} onChange={e => setBody(e.target.value)} rows={16} className="text-[14px] leading-relaxed" />
                  <p className="text-xs text-muted-foreground">
                    Start a line with &quot;- &quot; for a bullet, or write &quot;| Label | Value&quot; for a summary row. Links work as typed.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Signature</Label>
                <button type="button" onClick={() => setEditSignature(e => !e)} className="text-xs font-medium text-primary hover:underline">
                  {editSignature ? 'Done' : 'Edit'}
                </button>
              </div>
              {editSignature
                ? <Textarea value={signature} onChange={e => setSignature(e.target.value)} rows={3} aria-label="Signature" />
                : <p className="whitespace-pre-line text-sm text-muted-foreground">{signature}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Paperclip className="h-3.5 w-3.5" /> Attach files
                </Button>
                <input ref={fileInput} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
                <span className="text-xs text-muted-foreground">{ATTACH_HINT[data.kind] ?? 'Up to 5 files, 10 MB in total.'}</span>
              </div>
              {attachments.length > 0 && (
                <ul className="space-y-1">
                  {attachments.map((a, i) => (
                    <li key={`${a.name}-${i}`} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span className="truncate">{a.name} <span className="text-xs text-muted-foreground">{kb(a.size)}</span></span>
                      <button type="button" onClick={() => setAttachments(attachments.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                  <li className="text-xs text-muted-foreground">{kb(totalBytes)} of 10 MB</li>
                </ul>
              )}
            </div>

            {data.kind === 'INVOICE' && data.canMarkInvoiceSent && (
              <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5">
                <Checkbox id="mark-sent" checked={markSent} onCheckedChange={c => setMarkSent(c === true)} className="mt-0.5" />
                <Label htmlFor="mark-sent" className="font-normal leading-snug">
                  Mark this invoice as sent once the email goes out, so it counts in receivables and the cash forecast
                </Label>
              </div>
            )}
          </div>
        )}

        {data && !loadError && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card px-6 py-3">
            <p className="text-xs text-muted-foreground">
              {toList.length ? `To ${toList.length} recipient${toList.length > 1 ? 's' : ''}` : 'No recipient yet'}
              {data.sender.mode === 'outbox' && ' · test mode: saved to the outbox folder, not delivered'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
              <Button onClick={send} disabled={sending || loading || off || !toList.length || !subject.trim()}>
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending</> : <><Send className="h-4 w-4" /> {sendLabel}</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
