'use client'

import { Mail } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import type { EmailContext } from '@/lib/email-actions'
import type { EmailKind } from '@/lib/email/templates'
import { EmailComposer } from './email-composer'

// A button that opens the composer with the right template for where it sits
export function EmailButton({
  context,
  kind,
  label = 'Email',
  variant = 'outline',
  size = 'sm',
  iconOnly,
}: {
  context: EmailContext
  kind?: EmailKind
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  iconOnly?: boolean
}) {
  return (
    <EmailComposer
      context={context}
      kind={kind}
      trigger={
        <Button variant={variant} size={iconOnly ? 'icon' : size} title={label} aria-label={iconOnly ? label : undefined}
          className={iconOnly ? 'h-8 w-8' : undefined}>
          <Mail className="h-3.5 w-3.5" />{!iconOnly && label}
        </Button>
      }
    />
  )
}
