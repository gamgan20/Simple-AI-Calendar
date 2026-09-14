import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth, signIn, signOut } from "@/auth";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          📚 AI Academic Planner
        </Link>
        <nav className="flex items-center gap-1">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/courses" className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Courses
              </Link>
              <Link href="/dashboard/tasks" className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Tasks
              </Link>
              <Link href="/dashboard/planner" className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                AI Planner
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Settings
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <Button variant="ghost" size="sm" type="submit" className="ml-2">
                  Sign Out
                </Button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button size="sm" type="submit">
                Sign In with Google
              </Button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
