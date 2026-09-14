import { getTasks } from "@/app/actions/tasks";
import { getCourses } from "@/app/actions/courses";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskList } from "./task-list";

export default async function TasksPage() {
  const tasks = await getTasks();
  const courses = await getCourses();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-2">Manage your academic assignments, exams, and projects.</p>
        </div>
        <CreateTaskDialog courses={courses} />
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}
