"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  courseId: z.string().optional().nullable(),
  description: z.string().optional(),
  type: z.string().default("assignment"),
  dueAt: z.string().optional().nullable(), // Receive as ISO string from client
  estimatedMinutes: z.number().int().positive().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function createTask(data: z.infer<typeof createTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = createTaskSchema.safeParse(data);
  if (!validated.success) throw new Error("Invalid fields");

  const { dueAt, ...rest } = validated.data;
  
  const task = await prisma.task.create({
    data: {
      ...rest,
      dueAt: dueAt ? new Date(dueAt) : null,
      source: "manual",
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/tasks");
  return task;
}

export async function getTasks() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.task.findMany({
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateTaskStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const task = await prisma.task.update({
    where: { id, userId: session.user.id },
    data: { status },
  });

  revalidatePath("/dashboard/tasks");
  return task;
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.task.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard/tasks");
}
