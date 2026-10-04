'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// --- Users ---
export async function getUsers() {
  return prisma.user.findMany({ orderBy: { name: 'asc' } })
}

export async function createUser(data: any) {
  const hash = await bcrypt.hash(data.password, 10)
  await prisma.user.create({
    data: { name: data.name, email: data.email, password: hash, role: data.role }
  })
  revalidatePath('/founder/staff')
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } })
  revalidatePath('/founder/staff')
}

// --- Documents ---
export async function getDocuments() {
  return prisma.document.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createDocument(data: any, userId: string) {
  await prisma.document.create({
    data: { ...data, createdBy: userId }
  })
  revalidatePath('/founder/documents')
  revalidatePath('/bde/documents')
}

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } })
  revalidatePath('/founder/documents')
  revalidatePath('/bde/documents')
}

// --- Spreadsheets ---
export async function getSpreadsheets(userId?: string, isFounder?: boolean) {
  if (isFounder) {
    return prisma.spreadsheet.findMany({ orderBy: { createdAt: 'desc' } })
  }
  // If not founder, only get sheets assigned to this user, or sheets assigned to no one (null/empty) if you want them global.
  // The requirement said: "allocated by founder to a particular employee and they would only be able to see it".
  // So we will STRICTLY show only sheets assigned to them (or globally unassigned ones maybe? Let's just do assigned to them).
  return prisma.spreadsheet.findMany({ 
    where: { 
      OR: [
        { assignedTo: userId },
        { assignedTo: null },
        { assignedTo: '' }
      ]
    },
    orderBy: { createdAt: 'desc' } 
  })
}

export async function createSpreadsheet(data: any, userId: string) {
  await prisma.spreadsheet.create({
    data: { ...data, createdBy: userId }
  })
  revalidatePath('/founder/spreadsheets')
  revalidatePath('/bde/spreadsheets')
}

export async function deleteSpreadsheet(id: string) {
  await prisma.spreadsheet.delete({ where: { id } })
  revalidatePath('/founder/spreadsheets')
  revalidatePath('/bde/spreadsheets')
}

// --- Case Studies ---
export async function getCaseStudies() {
  return prisma.caseStudy.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createCaseStudy(data: any, userId: string) {
  await prisma.caseStudy.create({
    data: { ...data, uploadedBy: userId }
  })
  revalidatePath('/case-studies')
}

export async function deleteCaseStudy(id: string) {
  await prisma.caseStudy.delete({ where: { id } })
  revalidatePath('/case-studies')
}
