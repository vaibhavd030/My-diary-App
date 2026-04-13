"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry } from "@/lib/api";

export interface GroupMeditationData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  place?: string | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: GroupMeditationData | null;
}

export function GroupMeditationSection({ date, initial }: Props) {
  const [value, setValue] = useState<GroupMeditationData>(initial ?? {});
  const filled = Boolean(
    value.duration_minutes || value.place || value.notes,
  );

  const status = useAutosave(value, async (v) => {
    if (!v.duration_minutes && !v.place && !v.notes) return;
    await upsertEntry(date, "group_meditation", { ...v });
  });

  const time = value.datetime_logged?.slice(11, 16) ?? "";
  const summary = [
    time,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    value.place,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Group meditation"
      subtitle="Satsang or group practice"
      summary={summary}
      icon={Users}
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
            placeholder="Centre, home, online…"
            className="field-input"
            value={value.place ?? ""}
            onChange={(e) => setValue({ ...value, place: e.target.value })}
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
