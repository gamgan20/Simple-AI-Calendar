"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function seedDemoData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const userId = session.user.id;

  // Clear existing courses/tasks for a clean slate
  await prisma.calendarEvent.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.course.deleteMany({ where: { userId } });

  // 1. Create Courses
  const chem = await prisma.course.create({
    data: {
      userId,
      name: "Organic Chemistry I",
      code: "CHEM 232",
      instructor: "Dr. Roberts",
      semester: "Fall 2024",
    }
  });

  const cs = await prisma.course.create({
    data: {
      userId,
      name: "Data Structures and Algorithms",
      code: "CS 301",
      instructor: "Prof. Alan",
      semester: "Fall 2024",
    }
  });

  const history = await prisma.course.create({
    data: {
      userId,
      name: "World History: 1500 to Present",
      code: "HIST 102",
      instructor: "Dr. Smith",
      semester: "Fall 2024",
    }
  });

  const now = new Date();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59);

  const overdue = new Date(now);
  overdue.setDate(overdue.getDate() - 2);
  overdue.setHours(12, 0, 0);

  // 2. Create Tasks
  await prisma.task.createMany({
    data: [
      {
        userId,
        courseId: chem.id,
        title: "Midterm Exam 1",
        type: "exam",
        description: "Covers chapters 1-4: Alkanes, Alkenes, Stereochemistry.",
        priority: "high",
        dueAt: nextWeek,
        estimatedMinutes: 240,
        status: "pending",
      },
      {
        userId,
        courseId: chem.id,
        title: "Lab Report 3",
        type: "assignment",
        description: "Synthesis of Aspirin.",
        priority: "medium",
        dueAt: tomorrow,
        estimatedMinutes: 120,
        status: "pending",
      },
      {
        userId,
        courseId: cs.id,
        title: "Programming Assignment 2",
        type: "project",
        description: "Implement a Red-Black Tree in C++.",
        priority: "high",
        dueAt: nextWeek,
        estimatedMinutes: 360,
        status: "pending",
      },
      {
        userId,
        courseId: cs.id,
        title: "Reading: Graph Algorithms",
        type: "reading",
        description: "Read CLRS Chapters 22-24.",
        priority: "low",
        dueAt: overdue,
        estimatedMinutes: 60,
        status: "overdue",
      },
      {
        userId,
        courseId: history.id,
        title: "Essay: The Industrial Revolution",
        type: "assignment",
        description: "1500 words on the social impact of the Industrial Revolution.",
        priority: "medium",
        dueAt: tomorrow,
        estimatedMinutes: 180,
        status: "pending",
      },
      {
        userId,
        courseId: history.id,
        title: "Discussion Board Post",
        type: "assignment",
        description: "Reply to two classmates about the French Revolution.",
        priority: "low",
        dueAt: nextWeek,
        estimatedMinutes: 30,
        status: "pending",
      }
    ]
  });

  revalidatePath("/");
  return { success: true };
}
