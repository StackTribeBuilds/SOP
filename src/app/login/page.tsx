import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  return <LoginForm sessionExpired={reason === 'session'} />
}
