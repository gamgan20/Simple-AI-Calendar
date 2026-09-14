import { getCourses } from "@/app/actions/courses";
import { CreateCourseDialog } from "./create-course-dialog";
import { UploadSyllabusDialog } from "./upload-syllabus-dialog";
import { CanvasSyncButton } from "./canvas-sync-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">Manage your academic courses and syllabuses.</p>
        </div>
        <CreateCourseDialog />
      </div>

      {courses.length === 0 ? (
        <div className="text-center p-12 border rounded-xl bg-card border-dashed">
          <p className="text-muted-foreground">No courses added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <CardTitle>{course.name}</CardTitle>
                <CardDescription>{course.code}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {course.instructor && <p className="text-sm">Instructor: {course.instructor}</p>}
                  {course.semester && <p className="text-sm">Semester: {course.semester}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <UploadSyllabusDialog courseId={course.id} />
                  {course.canvasCourseId && (
                    <CanvasSyncButton courseId={course.id} canvasCourseId={course.canvasCourseId} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
