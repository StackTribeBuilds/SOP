'use client'

import { useState } from 'react'
import { createCaseStudy, deleteCaseStudy } from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, ExternalLink, Briefcase } from 'lucide-react'

export function CaseStudyList({ initialData, userId, isFounder }: { initialData: any[], userId: string, isFounder: boolean }) {
  const [studies, setStudies] = useState(initialData)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [projectName, setProjectName] = useState('')
  const [driveUrl, setDriveUrl] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await createCaseStudy({ title, projectName, driveUrl }, userId)
    setOpen(false)
    setTitle('')
    setProjectName('')
    setDriveUrl('')
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await deleteCaseStudy(id)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Upload Case Study</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Case Study / Work Sample</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Case Study Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., E-commerce Redesign" required />
              </div>
              <div className="space-y-2">
                <Label>Project / Client Name (Optional)</Label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g., Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Google Drive Link</Label>
                <Input 
                  value={driveUrl} 
                  onChange={e => setDriveUrl(e.target.value)} 
                  placeholder="https://drive.google.com/..."
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Add Case Study</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {studies.map(study => (
          <Card key={study.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <CardTitle className="text-base font-semibold flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {study.title}
                </span>
                {study.projectName && (
                  <span className="text-sm font-normal text-muted-foreground ml-6">
                    Project: {study.projectName}
                  </span>
                )}
              </CardTitle>
              {(isFounder || study.uploadedBy === userId) && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(study.id)} className="h-6 w-6 p-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-4">
                <a 
                  href={study.driveUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md gap-2 w-full justify-center"
                >
                  View / Download <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
        {studies.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No case studies uploaded yet.
          </div>
        )}
      </div>
    </div>
  )
}
