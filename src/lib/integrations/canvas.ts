import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function getCanvasConfig(userId?: string) {
  const targetUserId = userId || (await auth())?.user?.id;
  if (!targetUserId) throw new Error("Unauthorized");

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: targetUserId },
  });

  if (!prefs?.canvasUrl || !prefs?.canvasToken) {
    throw new Error("Canvas LMS not connected");
  }

  // Ensure URL doesn't end with a slash
  const baseUrl = prefs.canvasUrl.replace(/\/$/, "");
  return { baseUrl, token: prefs.canvasToken };
}

export async function fetchCanvasCourses(userId?: string) {
  const { baseUrl, token } = await getCanvasConfig(userId);

  const res = await fetch(`${baseUrl}/api/v1/courses?enrollment_state=active&per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Canvas courses: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchCanvasAssignments(courseId: number, userId?: string) {
  const { baseUrl, token } = await getCanvasConfig(userId);

  const res = await fetch(`${baseUrl}/api/v1/courses/${courseId}/assignments?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Canvas assignments: ${res.statusText}`);
  }

  return res.json();
}
