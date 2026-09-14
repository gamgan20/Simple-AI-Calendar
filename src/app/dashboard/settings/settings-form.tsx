"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserPreferences } from "@/app/actions/preferences";
import type { UserPreferences } from "@prisma/client";

interface SettingsFormProps {
  prefs: UserPreferences;
  user: { name: string; email: string };
}

export function SettingsForm({ prefs, user }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError("");

    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k) as string;

    try {
      await updateUserPreferences({
        timezone: get("timezone") || "UTC",
        preferredStudyStart: get("preferredStudyStart"),
        preferredStudyEnd: get("preferredStudyEnd"),
        maxStudyMinutesPerDay: parseInt(get("maxStudyMinutesPerDay")) || 240,
        defaultSessionMinutes: parseInt(get("defaultSessionMinutes")) || 60,
        minimumSessionMinutes: parseInt(get("minimumSessionMinutes")) || 30,
        breakMinutes: parseInt(get("breakMinutes")) || 15,
        canvasUrl: get("canvasUrl") || null,
        canvasToken: get("canvasToken") || null,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Profile */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">Your account information (from Google).</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={user.name} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={prefs.timezone}
            placeholder="e.g. America/New_York"
          />
        </div>
      </section>

      <hr className="border-border" />

      {/* Study Preferences */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Study Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Controls when and how the AI schedules your study sessions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preferredStudyStart">Study Start Time</Label>
            <Input
              id="preferredStudyStart"
              name="preferredStudyStart"
              type="time"
              defaultValue={prefs.preferredStudyStart}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredStudyEnd">Study End Time</Label>
            <Input
              id="preferredStudyEnd"
              name="preferredStudyEnd"
              type="time"
              defaultValue={prefs.preferredStudyEnd}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxStudyMinutesPerDay">Max Study per Day (min)</Label>
            <Input
              id="maxStudyMinutesPerDay"
              name="maxStudyMinutesPerDay"
              type="number"
              defaultValue={prefs.maxStudyMinutesPerDay}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultSessionMinutes">Default Session Length (min)</Label>
            <Input
              id="defaultSessionMinutes"
              name="defaultSessionMinutes"
              type="number"
              defaultValue={prefs.defaultSessionMinutes}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimumSessionMinutes">Minimum Session Length (min)</Label>
            <Input
              id="minimumSessionMinutes"
              name="minimumSessionMinutes"
              type="number"
              defaultValue={prefs.minimumSessionMinutes}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breakMinutes">Break Between Sessions (min)</Label>
            <Input
              id="breakMinutes"
              name="breakMinutes"
              type="number"
              defaultValue={prefs.breakMinutes}
            />
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Canvas Integration */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Canvas LMS</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Canvas account to automatically import assignments.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="canvasUrl">Canvas URL</Label>
          <Input
            id="canvasUrl"
            name="canvasUrl"
            type="url"
            defaultValue={prefs.canvasUrl || ""}
            placeholder="https://your-school.instructure.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="canvasToken">Canvas API Token</Label>
          <Input
            id="canvasToken"
            name="canvasToken"
            type="password"
            defaultValue={prefs.canvasToken || ""}
            placeholder="Your Canvas access token"
          />
          <p className="text-xs text-muted-foreground">
            Generate in Canvas: Account → Settings → Approved Integrations → New Access Token.
          </p>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Settings saved successfully!</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
