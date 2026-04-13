"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getCalendar, CalendarCell } from "@/lib/api";
import { toISODate, todayISO, isFuture } from "@/lib/dates";

interface Props {
  selectedDate: string;
  onSelect: (iso: string) => void;
  /** Bump to refetch (e.g. after an entry is saved on the current day). */
  refetchKey?: number;
}

/** Map richness to a background fill & text colour. */
function fillFor(r: number): { bg: string; color: string; ring?: string } {
  if (r === 0) return { bg: "transparent", color: "#8c7d5b" };
  if (r === 1) return { bg: "#F0E4C7", color: "#8C6D3F" };
  if (r <= 3) return { bg: "#D4AF37", color: "#ffffff" };
  if (r <= 5) return { bg: "#8C6D3F", color: "#ffffff" };
  return { bg: "#8C6D3F", color: "#ffffff", ring: "#A3B18A" };
}

export function MonthGrid({ selectedDate, onSelect, refetchKey = 0 }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selectedDate);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [cells, setCells] = useState<CalendarCell[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCalendar(cursor.year, cursor.month)
      .then((data) => alive && setCells(data.cells))
      .catch(() => alive && setCells([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cursor.year, cursor.month, refetchKey]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarCell>();
    (cells ?? []).forEach((c) => m.set(c.date, c));
    return m;
  }, [cells]);

  const firstOfMonth = new Date(cursor.year, cursor.month - 1, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const todayIso = todayISO();

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  }

  const totals = useMemo(() => {
    const counts: Record<string, number> = {};
    (cells ?? []).forEach((c) => {
      c.types.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return counts;
  }, [cells]);

  return (
    <div className="diary-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shift(-1)}
          className="p-1.5 rounded hover:bg-[#F0E4C7] text-[#8C6D3F]"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-serif text-[15px] text-[#8C6D3F]" style={{ fontFamily: "var(--font-playfair), serif" }}>
          {monthLabel}
        </h3>
        <button
          onClick={() => shift(1)}
          className="p-1.5 rounded hover:bg-[#F0E4C7] text-[#8C6D3F]"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-[#b7ad92] text-center mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = toISODate(new Date(cursor.year, cursor.month - 1, day));
          const cell = byDate.get(iso);
          const future = isFuture(iso);
          const fill = fillFor(cell?.richness ?? 0);
          const isSelected = iso === selectedDate;
          const isTodayCell = iso === todayIso;

          const outline = isSelected
            ? "2px solid #8C6D3F"
            : isTodayCell
              ? "1px dashed #8C6D3F"
              : undefined;

          return (
            <button
              key={iso}
              disabled={future}
              onClick={() => onSelect(iso)}
              className="aspect-square rounded-md text-[12px] flex items-center justify-center transition-colors"
              style={{
                background: fill.bg,
                color: future ? "#d4cfc0" : fill.color,
                outline,
                outlineOffset: isSelected ? 1 : 0,
                boxShadow: fill.ring ? `0 0 0 1.5px ${fill.ring}` : undefined,
                cursor: future ? "not-allowed" : "pointer",
                opacity: future ? 0.4 : 1,
              }}
              title={
                cell && cell.richness > 0
                  ? `${cell.richness} ${cell.richness === 1 ? "entry" : "entries"}: ${cell.types.join(", ")}`
                  : undefined
              }
            >
              {day}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center mt-2">
          <Loader2 className="w-3 h-3 animate-spin text-[#8C6D3F]" />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-[#e6dece] flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#b7ad92]">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#F0E4C7" }} /> 1
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#D4AF37" }} /> 2–3
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#8C6D3F" }} /> 4–5
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#8C6D3F", boxShadow: "0 0 0 1px #A3B18A" }} /> 6+
        </span>
      </div>

      {Object.keys(totals).length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#e6dece]">
          <div className="text-[10px] text-[#b7ad92] uppercase tracking-wider mb-2">
            This month
          </div>
          {[
            ["meditation", "Meditations"],
            ["cleaning", "Cleanings"],
            ["sitting", "Sittings"],
            ["group_meditation", "Group meditations"],
            ["sleep", "Sleep logs"],
            ["gym", "Gym"],
            ["activity", "Activities"],
            ["journal_note", "Journal"],
          ].map(([key, label]) =>
            totals[key] ? (
              <div
                key={key}
                className="flex justify-between text-[12px] mb-0.5"
              >
                <span className="text-[#735e3b]">{label}</span>
                <span className="text-[#8C6D3F]">{totals[key]}</span>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
