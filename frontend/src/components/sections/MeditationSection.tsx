"use client";

import { useState } from "react";
import { Sunrise } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry } from "@/lib/api";

export interface MeditationData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  place?: string | null;
  felt?: string | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: MeditationData | null;
}

export function MeditationSection({ date, initial }: Props) {
  const [value, setValue] = useState<MeditationData>(initial ?? {});
  const filled = Boolean(
    value.duration_minutes || value.place || value.felt || value.notes,
  );

  const status = useAutosave(value, async (v) => {
    if (!v.duration_minutes && !v.place && !v.felt && !v.notes) return;
    await upsertEntry(date, "meditation", { ...v });
  });

  const time = value.datetime_logged?.slice(11, 16) ?? "";
  const summary = [
    time,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    value.place,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SectionCard
      title="Morning meditation"
      subtitle="When, where, and how it felt"
      summary={summary || "logged"}
      icon={Sunrise}
      status={status}
      filled={filled}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        <Field label="Place">
          <input
            type="text"
            placeholder="home, park, office…"
            className="field-input"
            value={value.place ?? ""}
            onChange={(e) => setValue({ ...value, place: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="How it felt">
          <textarea
            rows={2}
            placeholder="A word, a phrase, a sensation…"
            className="field-textarea"
            value={value.felt ?? ""}
            onChange={(e) => setValue({ ...value, felt: e.target.value })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
