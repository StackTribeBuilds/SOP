'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// The 9 Gates (OS Bible §1.4): every project passes them in this order
const GATES = ['Lead', 'Qualified', 'Won', 'Kickoff', 'Development', 'Change', 'Milestone', 'Launch', 'Closure']

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result?.error) {
      setLoading(false)
      setError('That email and password don’t match an active account.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel: what this system exists to protect */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={34} height={34} className="rounded-lg object-cover" />
          <span className="text-[15px] font-semibold tracking-tight">StackTribe OS</span>
        </div>

        <div className="max-w-[30rem]">
          <p className="figure text-[64px] font-semibold leading-[1] tracking-[-0.03em] text-white">
            <span className="block">Revenue</span>
            <span className="block"><span className="text-[#a98ef0]">≠</span> Cash</span>
            <span className="block"><span className="text-[#a98ef0]">≠</span> Profit</span>
          </p>
          <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-sidebar-muted">
            One place to run sales, delivery and money the way the Operating System Bible says, every day.
          </p>
        </div>

        <ol className="grid grid-cols-3 gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-[13px]">
          {GATES.map((gate, i) => (
            <li key={gate} className="flex items-baseline gap-2">
              <span className="figure text-xs text-[#a98ef0]">{i + 1}</span>
              <span className="text-sidebar-foreground/85">{gate}</span>
            </li>
          ))}
        </ol>
      </aside>

      {/* Sign-in */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[22rem]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.jpg" alt="" width={34} height={34} className="rounded-lg object-cover" />
            <span className="text-[15px] font-semibold tracking-tight">StackTribe OS</span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Use your StackTribe work email.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@stacktribe.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>
            )}
            <Button type="submit" className="h-11 w-full text-[15px]" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : 'Sign in'}
            </Button>
          </form>

          <p className="mt-10 text-xs text-muted-foreground">
            Forgot your password? Ask a founder to reset it for you.
          </p>
        </div>
      </main>
    </div>
  )
}
