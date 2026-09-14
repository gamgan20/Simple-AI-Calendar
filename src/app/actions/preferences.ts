"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const prefsSchema = z.object({
  timezone: z.string().optional(),
  preferredStudyStart: z.string().optional(),
  preferredStudyEnd: z.string().optional(),
  weekdaysAvailable: z.string().optional(),
  maxStudyMinutesPerDay: z.number().int().positive().optional(),
  defaultSessionMinutes: z.number().int().positive().optional(),
  minimumSessionMinutes: z.number().int().positive().optional(),
  breakMinutes: z.number().int().positive().optional(),
  schedulingEnabled: z.boolean().optional(),
  canvasUrl: z.string().url().optional().nullable().or(z.literal("")),
  canvasToken: z.string().optional().nullable(),
});

export async function getUserPreferences() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const prefs = await prisma.userPreferences.findUnique({ where: { userId: session.user.id } });

  if (!prefs) {
    return prisma.userPreferences.create({
      data: { userId: session.user.id },
    });
  }
  return prefs;
}

export async function updateUserPreferences(data: z.infer<typeof prefsSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = prefsSchema.parse(data);

  const prefs = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: validated,
    create: { userId: session.user.id, ...validated },
  });

  revalidatePath("/dashboard/settings");
  return prefs;
}
