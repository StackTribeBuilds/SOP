"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal } from "lucide-react";
import { createTask, updateTaskStatus } from "@/lib/project-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const COLUMNS = [
  "BACKLOG",
  "THIS WEEK",
  "IN PROGRESS",
  "IN REVIEW",
  "CLIENT REVIEW",
  "APPROVED",
  "DONE",
] as const;

type Status = typeof COLUMNS[number];

export function TaskBoard({ initialTasks, projectId }: { initialTasks: any[], projectId: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("BACKLOG");
  const [priority, setPriority] = useState("MEDIUM");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createTask({
        projectId,
        title,
        description,
        status,
        priority,
      });
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setStatus("BACKLOG");
      setPriority("MEDIUM");
      router.refresh(); // Refresh server component
    } catch (error) {
      console.error("Failed to create task", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: Status) => {
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      await updateTaskStatus(taskId, newStatus);
      router.refresh();
    } catch (error) {
      console.error("Failed to update task", error);
      // Revert on failure (simplified)
      setTasks(initialTasks);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Task"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
        {COLUMNS.map((col) => (
          <div key={col} className="w-80 shrink-0 bg-muted/50 rounded-lg p-4 snap-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{col}</h3>
              <Badge variant="secondary" className="rounded-full">
                {tasks.filter(t => t.status === col).length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {tasks
                .filter(t => t.status === col)
                .map((task) => (
                  <Card key={task.id} className="cursor-grab active:cursor-grabbing">
                    <CardHeader className="p-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                        <Select 
                          value={task.status} 
                          onValueChange={(val: Status) => handleMoveTask(task.id, val)}
                        >
                          <SelectTrigger className="w-8 h-8 p-0 border-none bg-transparent">
                            <MoreHorizontal className="w-4 h-4" />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {COLUMNS.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {task.priority || "MEDIUM"}
                        </Badge>
                        {task.assignee && (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {task.assignee.name?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              {tasks.filter(t => t.status === col).length === 0 && (
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg h-24 flex items-center justify-center text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
