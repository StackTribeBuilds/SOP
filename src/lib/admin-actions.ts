'use server'

import { prisma } from './prisma'
import { requireFounder, requireUser, isFounderRole } from './session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// --- Users ---
export async function getUsers() {
  await requireFounder()
  return prisma.user.findMany({ orderBy: { name: 'asc' } })
}

export async function createUser(data: any) {
  await requireFounder()
  if (!data.password || data.password.length < 8) throw new Error('Password must be at least 8 characters')
  const hash = await bcrypt.hash(data.password, 10)
  await prisma.user.create({
    data: { name: data.name, email: data.email, password: hash, role: data.role }
  })
  revalidatePath('/founder/staff')
}

// Deactivate rather than delete: leads, invoices and reports keep their owner,
// and requireUser() rejects the account on its next request.
export async function deactivateUser(id: string) {
  const founder = await requireFounder()
  if (id === founder.id) throw new Error('You cannot deactivate your own account')
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/founder/staff')
}

// --- Documents ---
export async function getDocuments() {
  await requireUser()
  return prisma.document.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createDocument(data: { title: string; url: string; description?: string; isSop?: boolean }) {
  const founder = await requireFounder()
  await prisma.document.create({
    data: { title: data.title, url: data.url, description: data.description, isSop: !!data.isSop, createdBy: founder.id }
  })
  revalidatePath('/founder/documents')
  revalidatePath('/bde/documents')
}

export async function deleteDocument(id: string) {
  await requireFounder()
  await prisma.document.delete({ where: { id } })
  revalidatePath('/founder/documents')
  revalidatePath('/bde/documents')
}

// --- Spreadsheets ---
export async function getSpreadsheets() {
  const user = await requireUser()
  if (isFounderRole(user.role)) {
    return prisma.spreadsheet.findMany({ orderBy: { createdAt: 'desc' } })
  }
  // If not founder, only get sheets assigned to this user, or sheets assigned to no one (null/empty) if you want them global.
  // The requirement said: "allocated by founder to a particular employee and they would only be able to see it".
  // So we will STRICTLY show only sheets assigned to them (or globally unassigned ones maybe? Let's just do assigned to them).
  return prisma.spreadsheet.findMany({ 
    where: { 
      OR: [
        { assignedTo: user.id },
        { assignedTo: null },
        { assignedTo: '' }
      ]
    },
    orderBy: { createdAt: 'desc' } 
  })
}

export async function createSpreadsheet(data: { title: string; embedUrl: string; assignedTo?: string | null }) {
  const founder = await requireFounder()
  await prisma.spreadsheet.create({
    data: { title: data.title, embedUrl: data.embedUrl, assignedTo: data.assignedTo || null, createdBy: founder.id }
  })
  revalidatePath('/founder/spreadsheets')
  revalidatePath('/bde/spreadsheets')
}

export async function deleteSpreadsheet(id: string) {
  await requireFounder()
  await prisma.spreadsheet.delete({ where: { id } })
  revalidatePath('/founder/spreadsheets')
  revalidatePath('/bde/spreadsheets')
}

// --- Case Studies ---
export async function getCaseStudies() {
  await requireUser()
  return prisma.caseStudy.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createCaseStudy(data: { title: string; projectName?: string; driveUrl: string }) {
  const user = await requireUser()
  await prisma.caseStudy.create({
    data: { title: data.title, projectName: data.projectName, driveUrl: data.driveUrl, uploadedBy: user.id }
  })
  revalidatePath('/case-studies')
}

export async function deleteCaseStudy(id: string) {
  const user = await requireUser()
  // Founders can remove any case study; everyone else only their own uploads
  const where = isFounderRole(user.role) ? { id } : { id, uploadedBy: user.id }
  await prisma.caseStudy.deleteMany({ where })
  revalidatePath('/case-studies')
}
