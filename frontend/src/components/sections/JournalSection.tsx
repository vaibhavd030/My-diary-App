"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry, deleteEntry } from "@/lib/api";

interface Props {
  date: string;
  initial: string;
}

export function JournalSection({ date, initial }: Props) {
  const [body, setBody] = useState<string>(initial);
  const filled = body.trim().length > 0;

  const status = useAutosave(body, async (v) => {
    if (!v.trim()) {
      await deleteEntry(date, "journal_note").catch(() => {});
      return;
    }
    await upsertEntry(date, "journal_note", { body: v });
  });

  const firstLine = body.split("\n")[0]?.trim().slice(0, 80);

  return (
    <SectionCard
      title="Journal"
      subtitle="Whatever the day asks of you"
      summary={firstLine || "logged"}
      icon={BookOpen}
      status={status}
      filled={filled}
      alwaysOpen
    >
      <textarea
        rows={10}
        placeholder="The day, as it was…"
        className="field-textarea"
        style={{ fontSize: 16, minHeight: 220, background: "#FDFBF5" }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </SectionCard>
  );
}
