"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { processSyllabusFile } from "@/app/actions/syllabus";

export function UploadSyllabusDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extractedTaskCount, setExtractedTaskCount] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await processSyllabusFile(courseId, formData);
      setSuccess(true);
      setExtractedTaskCount(result.tasks.length);
    } catch (err: any) {
      setError(err.message || "Failed to process syllabus.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setSuccess(false); setError(""); } }}>
      <DialogTrigger>
        <Button variant="outline" size="sm">Upload Syllabus</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Syllabus</DialogTitle>
          <DialogDescription>
            Upload a PDF or TXT syllabus to automatically extract deadlines and assignments.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="text-green-500 font-semibold text-lg">Success!</div>
            <p>Extracted {extractedTaskCount} tasks from the syllabus.</p>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Syllabus File (PDF/TXT)</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.txt" required />
            </div>
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Processing AI Extraction..." : "Upload & Process"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
