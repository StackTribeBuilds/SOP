'use client'

import { useState } from 'react'
import { createDocument, deleteDocument } from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, ExternalLink, FileText, Eye } from 'lucide-react'

// Convert google drive links to preview mode to allow iframe embedding
function getEmbedUrl(url: string) {
  if (url.includes('docs.google.com') && (url.includes('/edit') || url.includes('/view'))) {
    return url.replace(/\/(edit|view).*/, '/preview')
  }
  return url
}

export function DocumentList({ initialData, userId, isFounder }: { initialData: any[], userId: string, isFounder: boolean }) {
  const [docs, setDocs] = useState(initialData)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [isSop, setIsSop] = useState(false)
  
  const [viewDoc, setViewDoc] = useState<any>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await createDocument({ title, url, isSop }, userId)
    setOpen(false)
    setTitle('')
    setUrl('')
    setIsSop(false)
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await deleteDocument(id)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {isFounder && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Document/SOP</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link a Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Document URL</Label>
                  <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="https://docs.google.com/document/d/.../edit"
                    required 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sop" checked={isSop} onCheckedChange={(c) => setIsSop(!!c)} />
                  <Label htmlFor="sop">This is a Standard Operating Procedure (SOP)</Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Add Document</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Document Viewer Modal */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {viewDoc?.title}
                
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-white relative">
            {viewDoc && (
              <iframe
                src={getEmbedUrl(viewDoc.url)}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {docs.map(doc => (
          <Card key={doc.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {doc.title}
              </CardTitle>
              {isFounder && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="h-6 w-6 p-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-2">
                {doc.isSop && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    SOP
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 gap-2"
                  onClick={() => setViewDoc(doc)}
                >
                  <Eye className="w-4 h-4" /> View Document
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {docs.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No documents uploaded yet.
          </div>
        )}
      </div>
    </div>
  )
}
