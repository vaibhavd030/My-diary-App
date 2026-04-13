"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry } from "@/lib/api";

const BODY_PARTS = [
  "full_body",
  "upper_body",
  "lower_body",
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "stretching",
] as const;
type BodyPart = (typeof BODY_PARTS)[number];

const LABEL: Record<BodyPart, string> = {
  full_body: "Full body",
  upper_body: "Upper body",
  lower_body: "Lower body",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  stretching: "Stretching",
};

export interface GymData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  body_parts?: BodyPart[];
  intensity?: number | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: GymData | null;
}

export function GymSection({ date, initial }: Props) {
  const [value, setValue] = useState<GymData>({
    body_parts: [],
    ...(initial ?? {}),
  });
  const parts = value.body_parts ?? [];
  const filled = Boolean(
    value.duration_minutes || parts.length || value.intensity || value.notes,
  );

  const status = useAutosave(value, async (v) => {
    if (!v.duration_minutes && !(v.body_parts?.length) && !v.intensity && !v.notes) return;
    await upsertEntry(date, "gym", { ...v });
  });

  const togglePart = (p: BodyPart) => {
    const has = parts.includes(p);
    setValue({
      ...value,
      body_parts: has ? parts.filter((x) => x !== p) : [...parts, p],
    });
  };

  const summary = [
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    parts.length ? `${parts.length} group${parts.length === 1 ? "" : "s"}` : null,
    value.intensity ? `RPE ${value.intensity}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Gym"
      subtitle="Body parts, duration, intensity"
      summary={summary}
      icon={Dumbbell}
      status={status}
      filled={filled}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (min)">
          <input
            type="number"
            min={1}
            max={600}
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
        <Field label="Intensity (1–10)">
          <input
            type="number"
            min={1}
            max={10}
            className="field-input"
            value={value.intensity ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                intensity: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
      </div>

      <div className="mt-4">
        <span className="field-label">Body parts worked</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {BODY_PARTS.map((p) => (
            <button
              key={p}
              type="button"
              className="pill"
              data-active={parts.includes(p)}
              onClick={() => togglePart(p)}
            >
              {LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Exercises, PRs, how it felt…"
            className="field-textarea"
            value={value.notes ?? ""}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
