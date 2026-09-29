"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function ProjectSettingsForm({ project }: { project: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name || "",
    contractValue: project.contractValue || 0,
    completionPercentage: project.completionPercentage || 0,
    description: project.description || "",
    scope: project.scope || "",
    isRecurring: project.isRecurring || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await updateProject(project.id, {
        name: formData.name,
        contractValue: parseFloat(formData.contractValue.toString()),
        completionPercentage: parseInt(formData.completionPercentage.toString()),
        description: formData.description,
        scope: formData.scope,
        isRecurring: formData.isRecurring,
      });

      if (res.success) {
        alert("Project updated successfully!");
        router.refresh();
      } else {
        alert("Error updating project: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
          required 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contract Value (₹)</Label>
          <Input 
            type="number"
            value={formData.contractValue} 
            onChange={e => setFormData({...formData, contractValue: e.target.value})} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>Completion (%)</Label>
          <Input 
            type="number"
            min="0" max="100"
            value={formData.completionPercentage} 
            onChange={e => setFormData({...formData, completionPercentage: e.target.value})} 
            required 
          />
        </div>
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox 
          id="isRecurring" 
          checked={formData.isRecurring} 
          onCheckedChange={(checked) => setFormData({...formData, isRecurring: checked === true})} 
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="isRecurring">Recurring Revenue Project</Label>
          <p className="text-sm text-muted-foreground">
            Mark this project if it provides continuous, recurring revenue (e.g. retainers, AMC).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description / Readme</Label>
        <Textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          placeholder="General project summary..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Scope of Work</Label>
        <Textarea 
          value={formData.scope} 
          onChange={e => setFormData({...formData, scope: e.target.value})} 
          placeholder="Detailed scope and deliverables..."
          rows={6}
        />
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
