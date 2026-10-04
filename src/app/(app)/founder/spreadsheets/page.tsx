import { getSpreadsheets, getUsers } from '@/lib/admin-actions'
import { SpreadsheetList } from '@/components/admin/spreadsheet-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function SpreadsheetsPage() {
  const session = await getServerSession(authOptions)
  const sheets = await getSpreadsheets(session?.user?.id as string, true)
  const users = await getUsers()

  return (
    <div className="h-[85vh] max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col">
      <SpreadsheetList 
        initialData={sheets} 
        userId={session?.user?.id as string} 
        isFounder={true}
        users={users}
      />
    </div>
  )
}
