import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/providers'

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
})

// Figures (money, counts) use the condensed cut so long rupee amounts stay compact
const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'StackTribe OS', template: '%s · StackTribe OS' },
  description: 'Sales, delivery and money for StackTribe, run by the Operating System Bible',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${plexCondensed.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
