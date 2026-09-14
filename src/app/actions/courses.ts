"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createCourseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  code: z.string().optional(),
  instructor: z.string().optional(),
  semester: z.string().optional(),
});

export async function createCourse(data: z.infer<typeof createCourseSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = createCourseSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error("Invalid fields");
  }

  const course = await prisma.course.create({
    data: {
      ...validatedFields.data,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/courses");
  return course;
}

export async function getCourses() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.course.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteCourse(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.course.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard/courses");
}
