import nodemailer, { type Transporter } from 'nodemailer'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Email goes out through the company mailbox over SMTP (Google Workspace, Zoho, etc.),
// so sent mail lands in that mailbox's Sent folder and clients reply to a real inbox.
//
//   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS (an app password)
//   EMAIL_FROM        address shown as the sender; defaults to SMTP_USER
//   EMAIL_FROM_NAME   name shown as the sender; defaults to "StackTribe"
//   EMAIL_BCC         optional address that gets a copy of everything sent
//   EMAIL_REPLY_TO    optional address for client replies; defaults to the sender
//   EMAIL_OUTBOX_DIR  development only: write .eml files here instead of sending

export type EmailSetup =
  | { mode: 'smtp'; from: string; fromName: string; bcc?: string }
  | { mode: 'outbox'; from: string; fromName: string; dir: string }
  | { mode: 'off'; missing: string[] }

export function getEmailSetup(): EmailSetup {
  const env = process.env
  const fromName = env.EMAIL_FROM_NAME || 'StackTribe'

  if (env.EMAIL_OUTBOX_DIR && process.env.NODE_ENV !== 'production') {
    return { mode: 'outbox', from: env.EMAIL_FROM || 'info@stacktribe.dev', fromName, dir: env.EMAIL_OUTBOX_DIR }
  }

  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !env[k])
  if (missing.length) return { mode: 'off', missing }

  return { mode: 'smtp', from: env.EMAIL_FROM || env.SMTP_USER!, fromName, bcc: env.EMAIL_BCC || undefined }
}

let transporter: Transporter | null = null

function smtp(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

export type OutgoingEmail = {
  to: string[]
  cc: string[]
  replyTo?: string
  subject: string
  text: string
  html: string
  attachments: { filename: string; content: Buffer; contentType?: string }[]
}

export async function deliver(email: OutgoingEmail): Promise<{ messageId: string }> {
  const setup = getEmailSetup()
  if (setup.mode === 'off') {
    throw new Error(`Email isn't set up yet. Add ${setup.missing.join(', ')} to the server environment.`)
  }

  const message = {
    from: { name: setup.fromName, address: setup.from },
    to: email.to,
    cc: email.cc.length ? email.cc : undefined,
    bcc: setup.mode === 'smtp' ? setup.bcc : undefined,
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: email.attachments,
  }

  if (setup.mode === 'outbox') {
    // Build the real MIME message without sending it, and keep it for inspection
    const built = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' }).sendMail(message)
    await mkdir(setup.dir, { recursive: true })
    const file = path.join(setup.dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.eml`)
    await writeFile(file, built.message as Buffer)
    return { messageId: built.messageId }
  }

  const sent = await smtp().sendMail(message)
  return { messageId: sent.messageId }
}
