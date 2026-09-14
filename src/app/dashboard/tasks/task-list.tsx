"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import type { Task, Course } from "@prisma/client";

type TaskWithCourse = Task & { course: Course | null };

export function TaskList({ tasks }: { tasks: TaskWithCourse[] }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center p-12 border rounded-xl bg-card border-dashed">
        <p className="text-muted-foreground">No tasks added yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <Badge variant={task.status === "completed" ? "secondary" : "default"}>
                {task.status}
              </Badge>
            </div>
            <CardDescription>{task.course?.code || task.course?.name || "No Course"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              {task.dueAt && (
                <p><strong>Due:</strong> {new Date(task.dueAt).toLocaleString()}</p>
              )}
              {task.estimatedMinutes && (
                <p><strong>Est:</strong> {task.estimatedMinutes} min</p>
              )}
              <p><strong>Priority:</strong> {task.priority}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
              >
                {task.status === "completed" ? "Mark Pending" : "Mark Complete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
