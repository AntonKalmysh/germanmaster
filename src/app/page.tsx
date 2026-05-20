"use client";
import { useState } from "react";
import { SessionConfigForm } from "@/components/SessionConfig";
import { SessionRunner } from "@/components/SessionRunner";
import type { SessionConfig } from "@/lib/types";

export default function Home() {
  const [active, setActive] = useState<SessionConfig | null>(null);

  if (active) {
    return <SessionRunner config={active} onExit={() => setActive(null)} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <SessionConfigForm onStart={(c) => setActive(c)} />
    </div>
  );
}
