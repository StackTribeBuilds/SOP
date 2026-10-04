'use client'

import { useState } from 'react'
import { createSpreadsheet, deleteSpreadsheet } from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, ExternalLink } from 'lucide-react'

export function SpreadsheetList({ initialData, userId }: { initialData: any[], userId: string }) {
  const [spreadsheets, setSpreadsheets] = useState(initialData)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await createSpreadsheet({ title, embedUrl }, userId)
    setOpen(false)
    setTitle('')
    setEmbedUrl('')
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await deleteSpreadsheet(id)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
                <Label>Embed URL (Google Sheets publish link)</Label>
                <Input 
                  value={embedUrl} 
                  onChange={e => setEmbedUrl(e.target.value)} 
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Add Sheet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {spreadsheets.map(sheet => (
          <Card key={sheet.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {sheet.title}
                <a href={sheet.embedUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(sheet.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                src={sheet.embedUrl}
                className="w-full h-[600px] border-0"
                allowFullScreen
              />
            </CardContent>
          </Card>
        ))}
        {spreadsheets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No spreadsheets linked yet.
          </div>
        )}
      </div>
    </div>
  )
}
