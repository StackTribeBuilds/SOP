import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('Stacktribe2026', 10)

  const users = [
    { name: 'Nimesh', email: 'nimesh@stacktribe.com', role: 'CEO' },
    { name: 'Aditya', email: 'aditya@stacktribe.com', role: 'CTO' },
    { name: 'Arvind', email: 'arvind@stacktribe.com', role: 'BDE' }
  ]

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
    console.log(`User created/updated: ${user.email} with role ${user.role}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
