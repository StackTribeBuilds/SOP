import { getUsers } from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Team' };

export default async function StaffPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Team</h1>
        <p className="text-muted-foreground mt-1">Manage team members and their roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3 px-4">{u.name}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{u.role}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
