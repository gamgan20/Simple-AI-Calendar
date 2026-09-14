import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [courses, tasks, todaySessions, weeklySessions] = await Promise.all([
    prisma.course.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.task.findMany({
      where: { userId },
      include: { course: true },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: startOfToday, lte: endOfToday } },
      include: { task: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: now, lte: endOfWeek } },
    }),
  ]);

  const overdue = tasks.filter(t => t.dueAt && t.dueAt < now && t.status !== "completed");
  const upcoming = tasks.filter(t => t.dueAt && t.dueAt >= now && t.dueAt <= endOfWeek && t.status !== "completed");
  const totalWeeklyMinutes = weeklySessions.reduce((sum, e) => {
    return sum + Math.round((e.endAt.getTime() - e.startAt.getTime()) / 60000);
  }, 0);

  return { courses, tasks, overdue, upcoming, todaySessions, totalWeeklyMinutes, now };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { courses, tasks, overdue, upcoming, todaySessions, totalWeeklyMinutes } =
    await getDashboardData(session.user.id);

  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "overdue");

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.user.name?.split(" ")[0] || "Student"}!
          </p>
        </div>
        <Link href="/dashboard/planner">
          <Button size="lg" className="gap-2">Plan my week</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <p className="text-sm text-muted-foreground font-medium">Today's Sessions</p>
          <p className="text-3xl font-bold mt-1">{todaySessions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">study sessions scheduled</p>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <p className="text-sm text-muted-foreground font-medium">This Week</p>
          <p className="text-3xl font-bold mt-1">{Math.round(totalWeeklyMinutes / 60)}h {totalWeeklyMinutes % 60}m</p>
          <p className="text-xs text-muted-foreground mt-1">planned study time</p>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <p className="text-sm text-muted-foreground font-medium">Upcoming Deadlines</p>
          <p className="text-3xl font-bold mt-1">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground mt-1">due in the next 7 days</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-5 ${overdue.length > 0 ? "bg-destructive/5 border-destructive/30" : "bg-card"}`}>
          <p className="text-sm text-muted-foreground font-medium">Overdue</p>
          <p className={`text-3xl font-bold mt-1 ${overdue.length > 0 ? "text-destructive" : ""}`}>{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-1">tasks past their deadline</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's sessions */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-5">
          <h2 className="font-semibold mb-4">Today</h2>
          {todaySessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No study sessions scheduled for today.</p>
              <Link href="/dashboard/planner" className="mt-3 inline-block">
                <Button variant="outline" size="sm">Ask AI to schedule →</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{s.task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {new Date(s.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant="secondary">{Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000)} min</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <h2 className="font-semibold mb-4">Upcoming Deadlines</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No deadlines this week 🎉</p>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 6).map(t => (
                <div key={t.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.course?.code || "No Course"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{t.dueAt?.toLocaleDateString()}</p>
                    <Badge variant={t.priority === "high" ? "destructive" : "outline"} className="text-[10px]">
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Courses</h2>
            <Link href="/dashboard/courses" className="text-sm text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map(c => {
              const courseTasks = tasks.filter(t => t.courseId === c.id && t.status !== "completed");
              const nextDue = courseTasks.find(t => t.dueAt);
              return (
                <div key={c.id} className="rounded-xl border bg-card shadow-sm p-4">
                  <p className="font-semibold text-sm">{c.code || c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{courseTasks.length} pending tasks</p>
                    {nextDue?.dueAt && (
                      <p className="text-xs mt-1">Next due: <span className="font-medium">{nextDue.dueAt.toLocaleDateString()}</span></p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA when no courses */}
      {courses.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <h2 className="font-semibold text-lg mb-2">Get started</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Add your courses, upload a syllabus, or sync Canvas to begin planning.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/dashboard/courses"><Button>Add a Course</Button></Link>
            <Link href="/dashboard/settings"><Button variant="outline">Connect Canvas</Button></Link>
            <Link href="/dashboard/planner"><Button variant="outline">Open AI Planner</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
