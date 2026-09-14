"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { fetchCanvasAssignments, fetchCanvasCourses } from "@/lib/integrations/canvas";
import { revalidatePath } from "next/cache";

export async function syncCanvasAssignments(canvasCourseId: number, internalCourseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const assignments = await fetchCanvasAssignments(canvasCourseId);

  let syncedCount = 0;
  for (const assignment of assignments) {
    if (!assignment.due_at) continue; // Skip assignments without due dates

    // Check if task already exists
    const existing = await prisma.task.findFirst({
      where: {
        userId: session.user.id,
        source: "canvas",
        sourceId: String(assignment.id),
      }
    });

    if (existing) continue;

    await prisma.task.create({
      data: {
        title: assignment.name,
        description: assignment.description?.substring(0, 1000) || "", // truncate if too long
        type: "assignment",
        source: "canvas",
        sourceId: String(assignment.id),
        dueAt: new Date(assignment.due_at),
        priority: "medium",
        courseId: internalCourseId,
        userId: session.user.id,
      }
    });
    syncedCount++;
  }

  revalidatePath("/dashboard/tasks");
  return syncedCount;
}

export async function connectCanvasCourse(internalCourseId: string, canvasCourseIdStr: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.course.update({
    where: { id: internalCourseId, userId: session.user.id },
    data: { canvasCourseId: canvasCourseIdStr },
  });

  revalidatePath("/dashboard/courses");
}
