import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const password = await bcrypt.hash('Stacktribe2026', 10)

    const users = [
      { name: 'Nimesh', email: 'nimesh@stacktribe.com', role: 'FOUNDER' },
      { name: 'Aditya', email: 'aditya@stacktribe.com', role: 'FOUNDER' },
      { name: 'Arvind', email: 'arvind@stacktribe.com', role: 'BUSINESS_ANALYST' }
    ]

    const results = []

    for (const u of users) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { password: password, role: u.role as any },
        create: {
          name: u.name,
          email: u.email,
          password: password,
          role: u.role as any
        }
      })
      results.push(user.email)
    }

    return NextResponse.json({ success: true, created: results, message: 'Password for all users is: Stacktribe2026' })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
