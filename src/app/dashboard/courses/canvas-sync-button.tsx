"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { syncCanvasAssignments } from "@/app/actions/canvas";

interface CanvasSyncButtonProps {
  courseId: string;
  canvasCourseId: string;
}

export function CanvasSyncButton({ courseId, canvasCourseId }: CanvasSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const count = await syncCanvasAssignments(parseInt(canvasCourseId), courseId);
      setResult(`Synced ${count} new assignment${count !== 1 ? "s" : ""}`);
    } catch (err: any) {
      setResult("Error: " + (err.message || "Sync failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        {loading ? "Syncing..." : "Sync Canvas"}
      </Button>
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
    </div>
  );
}
