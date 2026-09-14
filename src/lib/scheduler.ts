import type { Task, UserPreferences } from "@prisma/client";
import type { calendar_v3 } from "googleapis";

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ScheduledSession {
  taskId: string;
  start: Date;
  end: Date;
  durationMinutes: number;
}

function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function isWeekdayAvailable(date: Date, weekdaysAvailable: string): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon...
  return weekdaysAvailable.split(",").map(Number).includes(day);
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date): boolean {
  return start < busyEnd && end > busyStart;
}

/**
 * Finds free time slots in a given day given a list of busy intervals.
 */
function getFreeSlots(
  date: Date,
  busyIntervals: Array<{ start: Date; end: Date }>,
  studyStart: string,
  studyEnd: string,
  minSessionMinutes: number
): TimeSlot[] {
  const dayStart = parseTime(studyStart, date);
  const dayEnd = parseTime(studyEnd, date);

  if (dayStart >= dayEnd) return [];

  const sorted = [...busyIntervals]
    .filter(b => b.end > dayStart && b.start < dayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const freeSlots: TimeSlot[] = [];
  let cursor = dayStart;

  for (const busy of sorted) {
    const freeEnd = new Date(Math.min(busy.start.getTime(), dayEnd.getTime()));
    if (cursor < freeEnd) {
      const dur = (freeEnd.getTime() - cursor.getTime()) / 60000;
      if (dur >= minSessionMinutes) {
        freeSlots.push({ start: new Date(cursor), end: freeEnd, durationMinutes: dur });
      }
    }
    cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
  }

  // Remaining time after last busy event
  if (cursor < dayEnd) {
    const dur = (dayEnd.getTime() - cursor.getTime()) / 60000;
    if (dur >= minSessionMinutes) {
      freeSlots.push({ start: new Date(cursor), end: dayEnd, durationMinutes: dur });
    }
  }

  return freeSlots;
}

/**
 * Main scheduling engine.
 *
 * Given a set of tasks, the user's existing calendar events, and preferences,
 * returns a list of proposed study sessions.
 */
export function scheduleTaskSessions(
  tasks: Task[],
  googleEvents: calendar_v3.Schema$Event[],
  prefs: UserPreferences,
  existingScheduledSessions: Array<{ startAt: Date; endAt: Date }> = []
): ScheduledSession[] {
  const now = new Date();
  const sessions: ScheduledSession[] = [];

  // Build busy intervals from Google events + already-scheduled sessions
  const busyFromGoogle = googleEvents
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      start: new Date(e.start!.dateTime!),
      end: new Date(e.end!.dateTime!),
    }));

  const busyFromSessions = existingScheduledSessions.map(s => ({
    start: new Date(s.startAt),
    end: new Date(s.endAt),
  }));

  let allBusy = [...busyFromGoogle, ...busyFromSessions];

  // Sort tasks: high priority first, then by due date
  const sortedTasks = [...tasks]
    .filter(t => t.status !== "completed" && t.status !== "skipped")
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pa = priorityOrder[(a.priority as keyof typeof priorityOrder)] ?? 1;
      const pb = priorityOrder[(b.priority as keyof typeof priorityOrder)] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return 0;
    });

  for (const task of sortedTasks) {
    let remainingMinutes = task.estimatedMinutes || prefs.defaultSessionMinutes;
    const deadline = task.dueAt;
    const maxDate = deadline ? new Date(deadline.getTime() - 30 * 60 * 1000) : null; // 30 min buffer before deadline

    // Generate candidate days (up to 14 days from now)
    const candidateDays: Date[] = [];
    for (let i = 0; i <= 14; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() + i);
      day.setHours(0, 0, 0, 0);

      // Skip unavailable weekdays
      if (!isWeekdayAvailable(day, prefs.weekdaysAvailable)) continue;

      // Skip days past the deadline
      if (maxDate) {
        const dayStart = parseTime(prefs.preferredStudyStart, day);
        if (dayStart > maxDate) continue;
      }

      candidateDays.push(day);
    }

    // Prefer to spread across multiple days
    let dailyMinutesUsed: Record<string, number> = {};
    for (const day of candidateDays) {
      if (remainingMinutes <= 0) break;

      const dateKey = day.toDateString();
      const usedToday = dailyMinutesUsed[dateKey] || 0;
      const maxToday = prefs.maxStudyMinutesPerDay - usedToday;
      if (maxToday <= 0) continue;

      const freeSlots = getFreeSlots(
        day,
        allBusy,
        prefs.preferredStudyStart,
        prefs.preferredStudyEnd,
        prefs.minimumSessionMinutes
      );

      for (const slot of freeSlots) {
        if (remainingMinutes <= 0) break;

        // Clamp session length to max
        const sessionMax = Math.min(prefs.defaultSessionMinutes, 120, maxToday, remainingMinutes);
        const sessionMin = prefs.minimumSessionMinutes;
        const sessionDur = Math.min(slot.durationMinutes, sessionMax);

        if (sessionDur < sessionMin) continue;

        // Enforce deadline: don't schedule past deadline
        const sessionStart = new Date(slot.start);
        const sessionEnd = new Date(sessionStart.getTime() + sessionDur * 60000);

        if (maxDate && sessionEnd > maxDate) {
          // Try fitting before the deadline
          const clampedEnd = new Date(Math.min(sessionEnd.getTime(), maxDate.getTime()));
          const clampedDur = (clampedEnd.getTime() - sessionStart.getTime()) / 60000;
          if (clampedDur < sessionMin) continue;

          sessions.push({ taskId: task.id, start: sessionStart, end: clampedEnd, durationMinutes: clampedDur });
          allBusy.push({ start: sessionStart, end: clampedEnd });
          remainingMinutes -= clampedDur;
          dailyMinutesUsed[dateKey] = usedToday + clampedDur;
        } else {
          sessions.push({ taskId: task.id, start: sessionStart, end: sessionEnd, durationMinutes: sessionDur });
          allBusy.push({ start: sessionStart, end: sessionEnd });
          remainingMinutes -= sessionDur;
          dailyMinutesUsed[dateKey] = usedToday + sessionDur;
        }

        // Add break after session
        allBusy.push({
          start: new Date(sessionEnd.getTime()),
          end: new Date(sessionEnd.getTime() + prefs.breakMinutes * 60000),
        });
      }
    }
  }

  return sessions;
}
