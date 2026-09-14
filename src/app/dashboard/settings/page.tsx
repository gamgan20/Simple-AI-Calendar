import { getUserPreferences } from "@/app/actions/preferences";
import { auth } from "@/auth";
import { SettingsForm } from "./settings-form";
import { DemoButton } from "./demo-button";

export default async function SettingsPage() {
  const session = await auth();
  const prefs = await getUserPreferences();

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your profile, study preferences, and integrations.</p>
      </div>

      <SettingsForm
        prefs={prefs}
        user={{ name: session?.user?.name || "", email: session?.user?.email || "" }}
      />

      <hr className="border-border" />
      
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">Destructive actions for testing and demo purposes.</p>
        </div>
        <DemoButton />
      </section>
    </div>
  );
}
