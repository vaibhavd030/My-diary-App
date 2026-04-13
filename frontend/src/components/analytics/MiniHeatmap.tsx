"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from "date-fns";

interface Props {
  year: number;
  month: number;
  data: Record<string, number>; // ISO date -> intensity (0-4)
  colorScale?: string[]; // 5 colors from 0 to 4
}

const DEFAULT_COLORS = ["#f8f9fa", "#e6f4ea", "#ceead6", "#81c995", "#1e8e3e"];

export function MiniHeatmap({ year, month, data, colorScale = DEFAULT_COLORS }: Props) {
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
          const intensity = data[iso] ?? 0;
          return (
            <div
              key={iso}
              title={`${iso}: level ${intensity}`}
              className="w-full aspect-square rounded-[2px] transition-colors"
              style={{ backgroundColor: colorScale[intensity] || colorScale[0] }}
            />
          );
        })}
      </div>
    </div>
  );
}
