"use client";

import { useState } from "react";
import { Sunrise } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { Field } from "@/components/ui/Field";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry, deleteEntry } from "@/lib/api";

export interface MeditationData {
  datetime_logged?: string | null;
  duration_minutes?: number | null;
  place?: string | null;
  felt?: string | null;
  quality?: number | null;
  is_distracted?: boolean;
  is_deep_unaware?: boolean;
  is_deep_transmission?: boolean;
  is_calm_deep_end?: boolean;
  notes?: string | null;
}

interface Props {
  date: string;
  initial: MeditationData | null;
  onDataChange?: () => void;
}

export function MeditationSection({ date, initial, onDataChange }: Props) {
  const [value, setValue] = useState<MeditationData>(initial ?? {
    is_distracted: false,
    is_deep_unaware: false,
    is_deep_transmission: false,
    is_calm_deep_end: false
  });
  
  const filled = Boolean(
    value.duration_minutes || value.place || value.felt || value.notes || 
    value.quality || value.is_distracted || value.is_deep_unaware || 
    value.is_deep_transmission || value.is_calm_deep_end
  );

  const status = useAutosave(value, async (v) => {
    const hasData = Boolean(
      v.duration_minutes || v.place || v.felt || v.notes || 
      v.quality || v.is_distracted || v.is_deep_unaware || 
      v.is_deep_transmission || v.is_calm_deep_end
    );
    if (!hasData) {
      await deleteEntry(date, "meditation").catch(() => {});
      onDataChange?.();
      return;
    }
    await upsertEntry(date, "meditation", { ...v });
    onDataChange?.();
  });

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this section? All data for this section on this day will be removed.")) return;
    try {
      await deleteEntry(date, "meditation");
      setValue({
        is_distracted: false,
        is_deep_unaware: false,
        is_deep_transmission: false,
        is_calm_deep_end: false
      });
      onDataChange?.();
    } catch (err) {
      console.error("Failed to reset meditation:", err);
    }
  };

  const time = value.datetime_logged?.slice(11, 16) ?? "";
  const summary = [
    time,
    value.duration_minutes ? `${value.duration_minutes} min` : null,
    value.quality ? `${value.quality}/10` : null,
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
                data-on={value.quality !== null && (value.quality ?? 0) >= v}
                aria-label={`Quality ${v} of 10`}
                onClick={() => setValue({ ...value, quality: value.quality === v ? null : v })}
              >
                ★
              </button>
            );
          })}
          <span className="ml-2 text-xs text-[#b7ad92]">
            {value.quality ? `${value.quality}/10` : "tap to rate"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FDFBF5] cursor-pointer transition-colors border border-transparent hover:border-[#ede7d7]">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-[#e6dece] text-[#8C6D3F] focus:ring-[#8C6D3F]"
            checked={value.is_distracted || false}
            onChange={e => setValue({ ...value, is_distracted: e.target.checked })}
          />
          <span className="text-sm font-medium text-[#5c4d37]">Distracted</span>
        </label>
        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FDFBF5] cursor-pointer transition-colors border border-transparent hover:border-[#ede7d7]">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-[#e6dece] text-[#8C6D3F] focus:ring-[#8C6D3F]"
            checked={value.is_deep_unaware || false}
            onChange={e => setValue({ ...value, is_deep_unaware: e.target.checked })}
          />
          <span className="text-sm font-medium text-[#5c4d37]">Deep & unaware</span>
        </label>
        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FDFBF5] cursor-pointer transition-colors border border-transparent hover:border-[#ede7d7]">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-[#e6dece] text-[#8C6D3F] focus:ring-[#8C6D3F]"
            checked={value.is_deep_transmission || false}
            onChange={e => setValue({ ...value, is_deep_transmission: e.target.checked })}
          />
          <span className="text-sm font-medium text-[#5c4d37]">Deep & transmission</span>
        </label>
        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FDFBF5] cursor-pointer transition-colors border border-transparent hover:border-[#ede7d7]">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-[#e6dece] text-[#8C6D3F] focus:ring-[#8C6D3F]"
            checked={value.is_calm_deep_end || false}
            onChange={e => setValue({ ...value, is_calm_deep_end: e.target.checked })}
          />
          <span className="text-sm font-medium text-[#5c4d37]">Calm, Deep at the End</span>
        </label>
      </div>

      <div className="mt-4">
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
