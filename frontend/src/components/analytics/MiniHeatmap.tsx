"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from "date-fns";
import { useRouter } from "next/navigation";

interface Props {
  year: number;
  month: number;
  data: Record<string, number>; // ISO date -> intensity (0-4)
  colorScale?: string[]; // 5 colors from 0 to 4
}

const DEFAULT_COLORS = ["#f8f9fa", "#e6f4ea", "#ceead6", "#81c995", "#1e8e3e"];

export function MiniHeatmap({ year, month, data, colorScale = DEFAULT_COLORS }: Props) {
  const router = useRouter();

  const days = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  // Offset for the first day of the week (Sun=0, Mon=1...)
  const firstDay = getDay(days[0]);

  return (
    <div className="analytics-calendar">
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`head-${d}-${i}`} className="text-[9px] text-[#b7ad92] text-center font-medium mb-1">
            {d}
          </div>
        ))}
        
        {/* Padding for first week */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`pad-${i}`} className="w-full aspect-square" />
        ))}

        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const dayNum = format(day, "d");
          const intensity = data[iso] ?? 0;
          const isSystemStart = iso === "2026-04-12";
          
          return (
            <div
              key={iso}
              title={`${iso}`}
              onClick={() => router.push(`/journal/${iso}`)}
              className={`w-full aspect-square rounded-[2px] cursor-pointer hover:ring-1 hover:ring-[#8C6D3F]/50 transition-all flex items-center justify-center text-[10px] font-semibold ${
                isSystemStart ? "ring-2 ring-red-500 ring-offset-1 relative z-10" : ""
              }`}
              style={{ 
                backgroundColor: colorScale[intensity] || colorScale[0],
                color: intensity > 2 ? "#ffffff" : "#a3997e"
              }}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}
