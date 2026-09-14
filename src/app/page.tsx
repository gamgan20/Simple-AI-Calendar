import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-24 bg-gradient-to-b from-background to-muted/50">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
          Your AI Academic Planner
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground mb-8">
          Turn your syllabuses and Canvas assignments into a realistic, AI-generated academic schedule directly in Google Calendar.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <Button size="lg" type="submit" className="text-lg px-8">
            Get Started with Google
          </Button>
        </form>
      </main>
    </div>
  );
}
