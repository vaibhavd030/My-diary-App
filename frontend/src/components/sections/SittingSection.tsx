"use client";

import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry, deleteEntry } from "@/lib/api";

export interface SittingData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  took_from?: string | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: SittingData | null;
  onDataChange?: () => void;
}

export function SittingSection({ date, initial, onDataChange }: Props) {
  const [value, setValue] = useState<SittingData>(initial ?? {});
  const filled = Boolean(
    value.duration_minutes || value.took_from || value.notes,
  );

  const status = useAutosave(value, async (v) => {
    if (!v.duration_minutes && !v.took_from && !v.notes) {
      await deleteEntry(date, "sitting").catch(() => {});
      onDataChange?.();
      return;
    }
    await upsertEntry(date, "sitting", { ...v });
    onDataChange?.();
  });

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this section?")) return;
    try {
      await deleteEntry(date, "sitting");
      setValue({});
      onDataChange?.();
    } catch (err) {
      console.error("Failed to reset sitting:", err);
    }
  };

  const time = value.datetime_logged?.slice(11, 16) ?? "";
  const summary = [
    time,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    value.took_from,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Sitting"
      subtitle="With a trainer or preceptor"
      summary={summary}
      icon={HeartHandshake}
      status={status}
      filled={filled}
      onReset={handleReset}
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
        <Field label="Took from">
          <input
            type="text"
            placeholder="Trainer / preceptor"
            className="field-input"
            value={value.took_from ?? ""}
            onChange={(e) => setValue({ ...value, took_from: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Condition, impressions…"
            className="field-textarea"
            value={value.notes ?? ""}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
