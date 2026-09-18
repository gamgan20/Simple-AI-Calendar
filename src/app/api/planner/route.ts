import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { PLANNER_SYSTEM_PROMPT, PLANNER_TOOLS } from "@/lib/ai-planner";
import { prisma } from "@/lib/db";
import { getCalendarEvents } from "@/lib/integrations/google-calendar";
import { scheduleTaskSessions } from "@/lib/scheduler";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/integrations/google-calendar";

// Tool execution handler
async function executeTool(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "get_tasks": {
      const statusFilter = (args.status_filter as string) || "all";
      const where: Record<string, unknown> = { userId };
      if (statusFilter !== "all") where.status = statusFilter;
      const tasks = await prisma.task.findMany({
        where,
        include: { course: true },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      });
      return tasks.map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        course: t.course?.code || t.course?.name || null,
        dueAt: t.dueAt?.toISOString() || null,
        estimatedMinutes: t.estimatedMinutes,
        priority: t.priority,
        status: t.status,
      }));
    }

    case "get_upcoming_calendar_events": {
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      try {
        const events = await getCalendarEvents(now, twoWeeksLater);
        return events.map(e => ({
          id: e.id,
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        }));
      } catch (e: any) {
        return { error: "Could not fetch calendar. Google Calendar may not be connected: " + e.message };
      }
    }

    case "get_user_preferences": {
      const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
      return prefs || { error: "No preferences found. Using defaults." };
    }

    case "schedule_task_sessions": {
      const taskId = args.task_id as string;
      const rawSessions = args.sessions as Array<{ start_at: string; end_at: string }>;

      const task = await prisma.task.findFirst({ where: { id: taskId, userId }, include: { course: true } });
      if (!task) return { error: "Task not found" };

      const coursePrefix = task.course?.code ? `[${task.course.code}] ` : "";
      const dueText = task.dueAt ? `Due: ${task.dueAt.toLocaleDateString()}\n` : "";

      const created = [];
      for (const s of rawSessions) {
        const start = new Date(s.start_at);
        const end = new Date(s.end_at);
        const dur = Math.round((end.getTime() - start.getTime()) / 60000);

        const googleEvent = await createCalendarEvent({
          summary: `${coursePrefix}${task.title} — Work Session`,
          description: `AI Academic Planner\nTask: ${task.title}\n${dueText}Planned session: ${dur} minutes`,
          start,
          end,
        });

        const dbEvent = await prisma.calendarEvent.create({
          data: {
            taskId: task.id,
            userId,
            googleEventId: googleEvent.id || undefined,
            startAt: start,
            endAt: end,
            status: "scheduled",
          },
        });

        created.push({ id: dbEvent.id, start: s.start_at, end: s.end_at, durationMinutes: dur });
      }

      await prisma.task.update({ where: { id: taskId }, data: { status: "scheduled" } });
      return { success: true, scheduled: created };
    }

    case "delete_session": {
      const eventId = args.event_id as string;
      const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
      if (!event) return { error: "Session not found" };

      if (event.googleEventId) {
        try { await deleteCalendarEvent(event.googleEventId); } catch (e) { /* ignore */ }
      }
      await prisma.calendarEvent.delete({ where: { id: eventId } });
      return { success: true };
    }

    case "reschedule_session": {
      const eventId = args.event_id as string;
      const newStart = new Date(args.new_start_at as string);
      const newEnd = new Date(args.new_end_at as string);
      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, userId },
        include: { task: { include: { course: true } } },
      });
      if (!event) return { error: "Session not found" };

      const coursePrefix = event.task.course?.code ? `[${event.task.course.code}] ` : "";
      const dueText = event.task.dueAt ? `Due: ${event.task.dueAt.toLocaleDateString()}\n` : "";
      const dur = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

      if (event.googleEventId) {
        await updateCalendarEvent(event.googleEventId, {
          summary: `${coursePrefix}${event.task.title} — Work Session`,
          description: `AI Academic Planner\nTask: ${event.task.title}\n${dueText}Rescheduled session: ${dur} minutes`,
          start: newStart,
          end: newEnd,
        });
      }
      await prisma.calendarEvent.update({ where: { id: eventId }, data: { startAt: newStart, endAt: newEnd } });
      return { success: true, newStart: args.new_start_at, newEnd: args.new_end_at };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });

  const systemPrompt = PLANNER_SYSTEM_PROMPT({
    currentDate: new Date().toISOString(),
    timezone: prefs?.timezone || "UTC",
    userName: session.user.name || "Student",
    studyStart: prefs?.preferredStudyStart || "09:00",
    studyEnd: prefs?.preferredStudyEnd || "21:00",
    maxDailyMinutes: prefs?.maxStudyMinutesPerDay || 240,
  });

  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  // Agentic loop: keep running until no more tool calls
  let response = await ai.chat.completions.create({
    model: "gemini-1.5-flash",
    messages: aiMessages,
    tools: PLANNER_TOOLS,
    tool_choice: "auto",
  });

  const loopMessages = [...aiMessages];
  let iterations = 0;
  const MAX_ITERATIONS = 8;

  while (response.choices[0].finish_reason === "tool_calls" && iterations < MAX_ITERATIONS) {
    iterations++;
    const assistantMsg = response.choices[0].message;
    loopMessages.push(assistantMsg);

    const toolResults = [];
    for (const toolCall of assistantMsg.tool_calls || []) {
      const tc = toolCall as { id: string; function: { name: string; arguments: string } };
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      const result = await executeTool(tc.function.name, args, userId);
      toolResults.push({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    loopMessages.push(...toolResults);

    response = await ai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: loopMessages,
      tools: PLANNER_TOOLS,
      tool_choice: "auto",
    });
  }

  const finalMessage = response.choices[0].message.content || "Done!";
  return NextResponse.json({ message: finalMessage });
}
