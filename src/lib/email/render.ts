// Turns the plain text written in the composer into an email-client-safe HTML message.
// The text stays the source of truth: what you type is what the client reads.
//
// Light formatting, chosen so the plain-text version reads naturally too:
//   blank line      new paragraph
//   - item          bulleted list
//   | Label | Value two-column summary table (amounts, dates, invoice numbers)
//   URLs            become links

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const linkify = (s: string) =>
  s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#5b3fb8;">$1</a>')

const inline = (s: string) => linkify(esc(s))

const BRAND = '#5b3fb8'
const INK = '#1c1930'
const MUTED = '#645f7a'
const LINE = '#e3e0eb'

function renderBlock(lines: string[]): string {
  if (lines.every(l => /^\s*[-•]\s+/.test(l))) {
    const items = lines.map(l => `<li style="margin:0 0 6px;">${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')
    return `<ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>`
  }
  if (lines.every(l => /^\s*\|/.test(l))) {
    const rows = lines.map(l => {
      const cells = l.split('|').map(c => c.trim()).filter((c, i, all) => !(c === '' && (i === 0 || i === all.length - 1)))
      const [label, ...rest] = cells
      return `<tr>
        <td style="padding:9px 14px;border-top:1px solid ${LINE};color:${MUTED};font-size:13px;white-space:nowrap;">${inline(label ?? '')}</td>
        <td style="padding:9px 14px;border-top:1px solid ${LINE};color:${INK};font-size:14px;font-weight:600;text-align:right;">${inline(rest.join(' | '))}</td>
      </tr>`
    }).join('')
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;border:1px solid ${LINE};border-radius:8px;border-collapse:separate;overflow:hidden;">${rows}</table>`
  }
  return `<p style="margin:0 0 16px;">${lines.map(inline).join('<br>')}</p>`
}

export function renderEmailHtml({ body, signature, preheader }: { body: string; signature: string; preheader?: string }) {
  const blocks = body.replace(/\r\n/g, '\n').trim().split(/\n{2,}/).map(b => b.split('\n'))
  const content = blocks.map(renderBlock).join('\n')
  const sig = signature.trim() ? `<p style="margin:24px 0 0;color:${MUTED};font-size:13px;">${signature.trim().split('\n').map(inline).join('<br>')}</p>` : ''

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f3f7;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f7;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:22px 32px 0;">
        <span style="display:inline-block;font:600 15px/1 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};letter-spacing:-0.01em;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${BRAND};margin-right:8px;vertical-align:middle;"></span>StackTribe
        </span>
      </td></tr>
      <tr><td style="padding:22px 32px 30px;font:15px/1.6 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
        ${content}
        ${sig}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font:12px/1.5 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${MUTED};">
      StackTribe · Product engineering · Reply to this email to reach us directly
    </p>
  </td></tr>
</table>
</body>
</html>`
}

// The plain-text part of the message: the same text, with table rows tidied
export function renderEmailText({ body, signature }: { body: string; signature: string }) {
  const tidy = body.replace(/\r\n/g, '\n').trim().split('\n').map(l => {
    if (!/^\s*\|/.test(l)) return l
    const cells = l.split('|').map(c => c.trim()).filter(Boolean)
    return cells.length >= 2 ? `${cells[0]}: ${cells.slice(1).join(' | ')}` : l
  }).join('\n')
  return signature.trim() ? `${tidy}\n\n${signature.trim()}` : tidy
}
