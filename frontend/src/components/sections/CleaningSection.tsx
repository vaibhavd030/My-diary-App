"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry } from "@/lib/api";

export interface CleaningData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: CleaningData | null;
}

export function CleaningSection({ date, initial }: Props) {
  const [value, setValue] = useState<CleaningData>(initial ?? {});
  const filled = Boolean(value.duration_minutes || value.notes);

  const status = useAutosave(value, async (v) => {
    if (!v.duration_minutes && !v.notes) return;
    await upsertEntry(date, "cleaning", { ...v });
  });

  const time = value.datetime_logged?.slice(11, 16) ?? "";
  const summary = [
    time,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Cleaning"
      subtitle="Evening Heartfulness cleaning"
      summary={summary}
      icon={Sparkles}
      status={status}
      filled={filled}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Time">
          <input
            type="time"
            className="field-input"
            value={time}
            onChange={(e) =>
              setValue({
                ...value,
                datetime_logged: e.target.value
                  ? `${date}T${e.target.value}:00`
                  : null,
              })
            }
          />
        </Field>
        <Field label="Duration (min)">
          <input
            type="number"
            min={1}
            max={300}
            className="field-input"
            value={value.duration_minutes ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                duration_minutes: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Any reflection…"
            className="field-textarea"
            value={value.notes ?? ""}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
