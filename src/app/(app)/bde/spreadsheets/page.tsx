import { getSpreadsheets } from '@/lib/admin-actions'
import { SpreadsheetList } from '@/components/admin/spreadsheet-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = { title: 'Sheets' };

export default async function BDESpreadsheetsPage() {
  const session = await getServerSession(authOptions)
  const sheets = await getSpreadsheets()

  return (
    <div className="h-[85vh] max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col">
      <SpreadsheetList 
        initialData={sheets} 
        userId={session?.user?.id as string} 
        isFounder={false}
      />
    </div>
  )
}
