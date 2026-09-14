"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, updateCalendarEvent } from "@/lib/integrations/google-calendar";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createEventSchema = z.object({
  taskId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
});

export async function scheduleSession(data: z.infer<typeof createEventSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const task = await prisma.task.findFirst({ where: { id: data.taskId, userId: session.user.id }, include: { course: true } });
  if (!task) throw new Error("Task not found");

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  const coursePrefix = task.course?.code ? `[${task.course.code}] ` : "";
  const dueText = task.dueAt ? `Due: ${task.dueAt.toLocaleDateString()} at ${task.dueAt.toLocaleTimeString()}\n` : "";

  const googleEvent = await createCalendarEvent({
    summary: `${coursePrefix}${task.title} — Work Session`,
    description: `AI Academic Planner\nTask: ${task.title}\n${dueText}Planned session: ${Math.round((endAt.getTime() - startAt.getTime()) / 60000)} minutes`,
    start: startAt,
    end: endAt,
  });

  const calEvent = await prisma.calendarEvent.create({
    data: {
      taskId: task.id,
      userId: session.user.id,
      googleEventId: googleEvent.id || undefined,
      startAt,
      endAt,
      status: "scheduled",
    },
  });

  await prisma.task.update({ where: { id: task.id }, data: { status: "scheduled" } });
  revalidatePath("/dashboard");
  return calEvent;
}

export async function deleteSession(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId: session.user.id } });
  if (!event) throw new Error("Event not found");

  if (event.googleEventId) {
    try {
      await deleteCalendarEvent(event.googleEventId);
    } catch (e) {
      console.error("Failed to delete Google Calendar event", e);
    }
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } });

  // Update task status if no more events
  const remaining = await prisma.calendarEvent.count({ where: { taskId: event.taskId } });
  if (remaining === 0) {
    await prisma.task.update({ where: { id: event.taskId }, data: { status: "pending" } });
  }

  revalidatePath("/dashboard");
}

export async function rescheduleSession(eventId: string, newStart: Date, newEnd: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId: session.user.id },
    include: { task: { include: { course: true } } },
  });
  if (!event) throw new Error("Event not found");

  const coursePrefix = event.task.course?.code ? `[${event.task.course.code}] ` : "";
  const dueText = event.task.dueAt ? `Due: ${event.task.dueAt.toLocaleDateString()}\n` : "";

  if (event.googleEventId) {
    await updateCalendarEvent(event.googleEventId, {
      summary: `${coursePrefix}${event.task.title} — Work Session`,
      description: `AI Academic Planner\nTask: ${event.task.title}\n${dueText}Planned session: ${Math.round((newEnd.getTime() - newStart.getTime()) / 60000)} minutes`,
      start: newStart,
      end: newEnd,
    });
  }

  const updated = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { startAt: newStart, endAt: newEnd },
  });

  revalidatePath("/dashboard");
  return updated;
}

export async function getUpcomingCalendarEvents() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    return await getCalendarEvents(now, oneWeekLater);
  } catch (e) {
    console.error("Failed to fetch Google Calendar events", e);
    return [];
  }
}
