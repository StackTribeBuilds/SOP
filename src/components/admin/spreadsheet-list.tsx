'use client'

import { useState } from 'react'
import { createSpreadsheet, deleteSpreadsheet } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ExternalLink } from 'lucide-react'

// Convert Google Sheets URL to minimal UI mode
function getMinimalSpreadsheetUrl(url: string) {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === 'docs.google.com' && urlObj.pathname.includes('/spreadsheets/d/')) {
      // If it has /edit, we can append rm=minimal
      urlObj.searchParams.set('rm', 'minimal')
      return urlObj.toString()
    }
    return url
  } catch (e) {
    return url
  }
}

export function SpreadsheetList({ 
  initialData, 
  userId, 
  isFounder,
  users = []
}: { 
  initialData: any[], 
  userId: string, 
  isFounder: boolean,
  users?: any[]
}) {
  const [spreadsheets, setSpreadsheets] = useState(initialData)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [assignedTo, setAssignedTo] = useState('unassigned')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const finalAssignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    await createSpreadsheet({ title, embedUrl, assignedTo: finalAssignedTo }, userId)
    setOpen(false)
    setTitle('')
    setEmbedUrl('')
    setAssignedTo('unassigned')
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await deleteSpreadsheet(id)
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Team Spreadsheets</h1>
          <p className="text-sm text-muted-foreground">Manage and view operational spreadsheets</p>
        </div>
        {isFounder && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Spreadsheet</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link a Google Sheet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Embed URL</Label>
                  <Input 
                    value={embedUrl} 
                    onChange={e => setEmbedUrl(e.target.value)} 
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign To (Optional)</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Global (All Team)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Global (All Team)</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">If assigned, only this user and founders can see it.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Add Sheet</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        {spreadsheets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed m-4 rounded-lg">
            No spreadsheets available.
          </div>
        ) : (
          <Tabs defaultValue={spreadsheets[0]?.id} className="w-full h-full flex flex-col">
            <div className="bg-muted/30 px-2 pt-2 border-b">
              <TabsList className="h-10 w-full justify-start overflow-x-auto bg-transparent rounded-none p-0">
                {spreadsheets.map(sheet => {
                  const assignee = users.find(u => u.id === sheet.assignedTo);
                  return (
                    <TabsTrigger 
                      key={sheet.id} 
                      value={sheet.id}
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4"
                    >
                      {sheet.title} 
                      {assignee && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{assignee.name}</span>}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
            
            {spreadsheets.map(sheet => (
              <TabsContent key={sheet.id} value={sheet.id} className="flex-1 p-0 m-0 relative outline-none data-[state=active]:flex flex-col">
                {isFounder && (
                  <div className="absolute top-2 right-4 flex gap-2 z-10 bg-white/80 p-1 rounded-md backdrop-blur-sm">
                    <a href={sheet.embedUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8 shadow-sm">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open Full
                      </Button>
                    </a>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(sheet.id)} className="h-8 shadow-sm">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                    </Button>
                  </div>
                )}
                {!isFounder && (
                  <div className="absolute top-2 right-4 flex gap-2 z-10 bg-white/80 p-1 rounded-md backdrop-blur-sm">
                    <a href={sheet.embedUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8 shadow-sm">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open Full
                      </Button>
                    </a>
                  </div>
                )}
                <div className="flex-1 w-full bg-slate-50 relative">
                  <iframe
                    src={getMinimalSpreadsheetUrl(sheet.embedUrl)}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  )
}
