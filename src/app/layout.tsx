import type { Metadata } from 'next'
import { Karla } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/providers'

const karla = Karla({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'StackTribe Management System',
  description: 'Financial & Operations Management for StackTribe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css" />
      </head>
      <body className={karla.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
