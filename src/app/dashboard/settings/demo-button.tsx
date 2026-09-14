"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/app/actions/demo";

export function DemoButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSeed() {
    if (!confirm("This will delete all your current courses and tasks and replace them with demo data. Are you sure?")) return;
    setLoading(true);
    try {
      await seedDemoData();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert("Failed to seed data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSeed} disabled={loading} variant="destructive">
      {loading ? "Seeding..." : done ? "Data Seeded!" : "Seed Demo Data (Warning: Destructive)"}
    </Button>
  );
}
