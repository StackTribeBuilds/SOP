import { getSpreadsheets } from '@/lib/admin-actions'
import { SpreadsheetList } from '@/components/admin/spreadsheet-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function SpreadsheetsPage() {
  const session = await getServerSession(authOptions)
  const sheets = await getSpreadsheets()

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Team Spreadsheets</h1>
        <p className="text-muted-foreground mt-1">View and manage embedded Google Sheets for your team</p>
      </div>

      <SpreadsheetList initialData={sheets} userId={session?.user?.id as string} />
    </div>
  )
}
