import { getServerSession } from 'next-auth/next'
import { Role } from '@prisma/client'
import { authOptions } from './auth'
import { prisma } from './prisma'

export const FOUNDER_ROLES: Role[] = ['FOUNDER', 'CEO', 'CTO', 'ADMIN']

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

// Server actions are public POST endpoints, so every action must call one of
// these. The role is read from the database, not the JWT, so deactivating a
// user or changing their role takes effect immediately.
export async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new AuthError()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
  if (!user || !user.isActive) throw new AuthError()

  return user
}

export async function requireFounder() {
  const user = await requireUser()
  if (!FOUNDER_ROLES.includes(user.role)) throw new AuthError('Founder access required')
  return user
}

export function isFounderRole(role: Role) {
  return FOUNDER_ROLES.includes(role)
}
