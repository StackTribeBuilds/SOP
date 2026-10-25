'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveEmailSettings } from '@/lib/email-actions'

type Settings = {
  signature: string
  paymentInstructions: string
  canEditPaymentInstructions: boolean
  sender: { mode: 'smtp' | 'outbox' | 'off'; label: string; missing: string[] }
}

const ENV_EXAMPLE = `SMTP_HOST=smtp.gmail.com        # Google Workspace; Zoho: smtp.zoho.in
SMTP_PORT=465
SMTP_USER=info@stacktribe.dev
SMTP_PASS=your-app-password      # an app password, not the login password
EMAIL_FROM_NAME=StackTribe
EMAIL_BCC=                       # optional: copy of every email`

export function EmailSettings({ settings, userName }: { settings: Settings; userName: string }) {
  const [signature, setSignature] = useState(settings.signature || `${userName}\nStackTribe`)
  const [payment, setPayment] = useState(settings.paymentInstructions)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await saveEmailSettings({
      signature,
      ...(settings.canEditPaymentInstructions ? { paymentInstructions: payment } : {}),
    })
    setSaving(false)
    if (!res.success) return toast.error(res.error)
    toast.success('Email settings saved')
  }

  return (
    <div className="space-y-6">
      <section className="surface p-5">
        <h2 className="text-[15px] font-semibold">Sending</h2>
        {settings.sender.mode === 'off' ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="flex items-start gap-2 text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Not connected. Emails can be written but not sent.
            </p>
            <p className="text-muted-foreground">
              Add these to the server environment (Vercel → Settings → Environment Variables, or <code className="text-xs">.env</code> locally), then redeploy.
              For Google Workspace, create an app password under Google Account → Security → App passwords.
            </p>
            <pre className="overflow-x-auto rounded-md bg-sidebar p-3 text-xs leading-relaxed text-sidebar-foreground">{ENV_EXAMPLE}</pre>
          </div>
        ) : (
          <div className="mt-3 space-y-1 text-sm">
            <p className="flex items-center gap-2 text-good">
              <CheckCircle2 className="h-4 w-4" /> {settings.sender.mode === 'outbox' ? 'Test mode' : 'Connected'}
            </p>
            <p>Sending as <span className="font-medium">{settings.sender.label}</span></p>
            <p className="text-xs text-muted-foreground">
              {settings.sender.mode === 'outbox'
                ? 'Emails are written to the EMAIL_OUTBOX_DIR folder instead of being delivered.'
                : 'Sent mail appears in that mailbox’s Sent folder, and client replies arrive there.'}
            </p>
          </div>
        )}
      </section>

      <section className="surface space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="signature">Your signature</Label>
          <Textarea id="signature" rows={4} value={signature} onChange={e => setSignature(e.target.value)} />
          <p className="text-xs text-muted-foreground">Added under every email you send. Only yours, not the team&apos;s.</p>
        </div>

        {settings.canEditPaymentInstructions && (
          <div className="space-y-1.5">
            <Label htmlFor="payment">Payment details for invoices and reminders</Label>
            <Textarea id="payment" rows={5} value={payment} onChange={e => setPayment(e.target.value)}
              placeholder={'Bank transfer to StackTribe\n| Account | 1234567890\n| IFSC | HDFC0001234\n| UPI | stacktribe@hdfcbank'} />
            <p className="text-xs text-muted-foreground">Shared by every founder. Use &quot;| Label | Value&quot; lines to show them as a neat table.</p>
          </div>
        )}

        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
      </section>
    </div>
  )
}
