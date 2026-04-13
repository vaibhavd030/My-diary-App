"use client";

import { useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry } from "@/lib/api";

const ACTIVITIES = [
  "run",
  "walk",
  "swim",
  "cycle",
  "badminton",
  "tennis",
  "pickleball",
  "yoga",
  "other",
] as const;
type ActivityType = (typeof ACTIVITIES)[number];

const LABEL: Record<ActivityType, string> = {
  run: "Running",
  walk: "Walking",
  swim: "Swimming",
  cycle: "Cycling",
  badminton: "Badminton",
  tennis: "Tennis",
  pickleball: "Pickleball",
  yoga: "Yoga",
  other: "Other",
};

const HAS_DISTANCE: Record<ActivityType, boolean> = {
  run: true,
  walk: true,
  swim: true,
  cycle: true,
  badminton: false,
  tennis: false,
  pickleball: false,
  yoga: false,
  other: false,
};

export interface ActivityData {
  datetime_logged?: string | null;
  activity_type?: ActivityType;
  duration_minutes?: number | null;
  distance_km?: number | null;
  intensity?: number | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: ActivityData | null;
}

export function ActivitySection({ date, initial }: Props) {
  const [value, setValue] = useState<ActivityData>({
    activity_type: "other",
    ...(initial ?? {}),
  });
  const filled = Boolean(
    value.duration_minutes ||
      value.distance_km ||
      value.intensity ||
      value.notes ||
      (value.activity_type && value.activity_type !== "other"),
  );

  const status = useAutosave(value, async (v) => {
    if (
      !v.duration_minutes &&
      !v.distance_km &&
      !v.intensity &&
      !v.notes &&
      (!v.activity_type || v.activity_type === "other")
    )
      return;
    await upsertEntry(date, "activity", { ...v });
  });

  const act = value.activity_type ?? "other";
  const showDistance = HAS_DISTANCE[act];

  const summary = [
    act !== "other" ? LABEL[act] : null,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    value.distance_km ? `${value.distance_km} km` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Activity"
      subtitle="Running, swimming, sports…"
      summary={summary}
      icon={ActivityIcon}
      status={status}
      filled={filled}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Type">
          <select
            className="field-select"
            value={act}
            onChange={(e) =>
              setValue({
                ...value,
                activity_type: e.target.value as ActivityType,
              })
            }
          >
            {ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
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
        {showDistance ? (
          <Field label="Distance (km)">
            <input
              type="number"
              min={0}
              max={1000}
              step={0.1}
              className="field-input"
              value={value.distance_km ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  distance_km: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
        ) : (
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
        )}
      </div>

      {showDistance && (
        <div className="mt-3">
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
      )}

      <div className="mt-3">
        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Route, partners, how it felt…"
            className="field-textarea"
            value={value.notes ?? ""}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
