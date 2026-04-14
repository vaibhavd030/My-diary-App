"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { useAutosave } from "@/lib/useAutosave";
import { upsertEntry, deleteEntry } from "@/lib/api";

export interface PersonalWatchData {
  got_angry?: boolean;
  mtb?: boolean;
  junk_food?: boolean;
  scrolled_phone?: boolean;
  no_sugar?: boolean;
  slept_late?: boolean;
}

interface Props {
  date: string;
  initial: PersonalWatchData | null;
  onDataChange?: () => void;
}

export function PersonalWatchSection({ date, initial, onDataChange }: Props) {
  const [value, setValue] = useState<PersonalWatchData>(initial ?? {});
  const filled = Object.values(value).some((v) => v === true);

  const status = useAutosave(value, async (v) => {
    const hasData = Object.values(v).some((val) => val === true);
    if (!hasData) {
      await deleteEntry(date, "personal_watch").catch(() => {});
      onDataChange?.();
      return;
    }
    await upsertEntry(date, "personal_watch", { ...v });
    onDataChange?.();
  });

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this section?")) return;
    try {
      await deleteEntry(date, "personal_watch");
      setValue({});
      onDataChange?.();
    } catch (err) {
      console.error("Failed to reset personal watch:", err);
    }
  };

  const items = [
    { key: "got_angry", label: "Got Angry", color: "text-red-500" },
    { key: "mtb", label: "MTB", color: "text-purple-500" },
    { key: "junk_food", label: "Junk Food", color: "text-orange-500" },
    { key: "scrolled_phone", label: "Scrolled Phone in Bed", color: "text-blue-500" },
    { key: "no_sugar", label: "No Sugar", color: "text-teal-500" },
    { key: "slept_late", label: "Slept Late", color: "text-slate-500" },
  ] as const;

  const summaryCount = Object.values(value).filter((v) => v === true).length;
  const summary = summaryCount > 0 ? `${summaryCount} check(s)` : "logged";

  return (
    <SectionCard
      title="Personal Watch"
      subtitle="Habit checks and behavioral awareness"
      summary={summary}
      icon={Eye}
      status={status}
      filled={filled}
      onReset={handleReset}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-xl border border-[#ede7d7] bg-[#FDFBF5] hover:bg-[#F9F6ED] transition-colors cursor-pointer group"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                className="peer h-5 w-5 appearance-none rounded border-2 border-[#d4cdb4] checked:bg-[#8C6D3F] checked:border-[#8C6D3F] transition-all cursor-pointer"
                checked={!!value[item.key]}
                onChange={(e) => setValue({ ...value, [item.key]: e.target.checked })}
              />
              <svg
                className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-sm font-medium text-[#5c4d37] group-hover:text-[#413626] transition-colors">
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
