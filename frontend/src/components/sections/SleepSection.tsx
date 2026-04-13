"use client";

import { useMemo, useState } from "react";
import { Moon } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry, deleteEntry } from "@/lib/api";

export interface SleepData {
  bedtime?: string | null;
  wake_time?: string | null;
  duration_hours?: number | null;
  quality?: number | null;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: SleepData | null;
  onDataChange?: () => void;
}

function computeDuration(bedtime: string, wake: string): number | null {
  if (!bedtime || !wake) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  return Math.round(((wakeMin - bedMin) / 60) * 100) / 100;
}

function normaliseTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function SleepSection({ date, initial, onDataChange }: Props) {
  const [bedtime, setBedtime] = useState<string>(
    normaliseTime(initial?.bedtime),
  );
  const [wakeTime, setWakeTime] = useState<string>(
    normaliseTime(initial?.wake_time),
  );
  const [quality, setQuality] = useState<number | null>(initial?.quality ?? null);
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");

  const duration = useMemo(
    () => computeDuration(bedtime, wakeTime),
    [bedtime, wakeTime],
  );

  const filled = Boolean(bedtime || wakeTime || quality || notes);

  const value = { bedtime, wakeTime, quality, notes };
  const status = useAutosave(value, async (v) => {
    if (!v.bedtime && !v.wakeTime && !v.quality && !v.notes) {
      await deleteEntry(date, "sleep").catch(() => {});
      onDataChange?.();
      return;
    }
    await upsertEntry(date, "sleep", {
      bedtime: v.bedtime ? `${v.bedtime}:00` : null,
      wake_time: v.wakeTime ? `${v.wakeTime}:00` : null,
      quality: v.quality,
      notes: v.notes || null,
    });
    onDataChange?.();
  });

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this section?")) return;
    try {
      await deleteEntry(date, "sleep");
      setBedtime("");
      setWakeTime("");
      setQuality(null);
      setNotes("");
      onDataChange?.();
    } catch (err) {
      console.error("Failed to reset sleep:", err);
    }
  };

  const summary = [
    bedtime && wakeTime ? `${bedtime} → ${wakeTime}` : null,
    duration ? `${duration}h` : null,
    quality ? `${quality}/10` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "logged";

  return (
    <SectionCard
      title="Sleep"
      subtitle="From when to when, how well"
      summary={summary}
      icon={Moon}
      status={status}
      filled={filled}
      onReset={handleReset}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Bedtime">
          <input
            type="time"
            className="field-input"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
          />
        </Field>
        <Field label="Wake time">
          <input
            type="time"
            className="field-input"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
          />
        </Field>
        <Field label="Duration">
          <div
            className="field-input flex items-center"
            style={{ color: duration ? "#8C6D3F" : "#b7ad92", background: "#FDFBF5" }}
          >
            {duration ? `${duration} hours` : "—"}
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <span className="field-label">Quality</span>
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const v = i + 1;
            return (
              <button
                key={v}
                type="button"
                className="star"
                data-on={quality !== null && quality >= v}
                aria-label={`Quality ${v} of 10`}
                onClick={() => setQuality(quality === v ? null : v)}
              >
                ★
              </button>
            );
          })}
          <span className="ml-2 text-xs text-[#b7ad92]">
            {quality ? `${quality}/10` : "tap to rate"}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <Field label="Notes">
          <textarea
            rows={2}
            placeholder="Dreams, disturbances, how you woke up…"
            className="field-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
