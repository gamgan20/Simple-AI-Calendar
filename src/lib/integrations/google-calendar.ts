import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function getCalendarClient(userId?: string) {
  const targetUserId = userId || (await auth())?.user?.id;
  if (!targetUserId) throw new Error("Unauthorized");

  const account = await prisma.account.findFirst({
    where: { userId: targetUserId, provider: "google" },
  });

  if (!account || !account.access_token) {
    throw new Error("Google Calendar not connected");
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getCalendarEvents(timeMin: Date, timeMax: Date) {
  const calendar = await getCalendarClient();
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items || [];
}

export async function createCalendarEvent(event: {
  summary: string;
  description: string;
  start: Date;
  end: Date;
}) {
  const calendar = await getCalendarClient();
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
    },
  });
  return res.data;
}

export async function updateCalendarEvent(eventId: string, event: {
  summary: string;
  description: string;
  start: Date;
  end: Date;
}) {
  const calendar = await getCalendarClient();
  const res = await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
    },
  });
  return res.data;
}

export async function deleteCalendarEvent(eventId: string) {
  const calendar = await getCalendarClient();
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}
