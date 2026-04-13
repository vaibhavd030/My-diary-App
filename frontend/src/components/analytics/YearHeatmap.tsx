import { useMemo } from "react";
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay } from "date-fns";
import { useRouter } from "next/navigation";

interface YearHeatmapProps {
  year: number;
  data: Record<string, number>;
  colorScale: string[];
}

export function YearHeatmap({ year, data, colorScale }: YearHeatmapProps) {
  const router = useRouter();
  
  const days = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    return eachDayOfInterval({ start, end });
  }, [year]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    let currentWeek: Date[] = [];
    
    days.forEach((day) => {
      const dayOfWeek = getDay(day);
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        w.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) w.push(currentWeek);
    return w;
  }, [days]);

  return (
    <div className="overflow-x-auto pb-4 scrollbar-hide select-none transition-all duration-500">
      <div className="flex gap-[3px] min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const day = week.find((d) => getDay(d) === dayIndex);
              if (!day) return <div key={dayIndex} className="w-[11px] h-[11px]" />;

              const dateStr = format(day, "yyyy-MM-dd");
              const intensity = data[dateStr] || 0;
              const bgColor = colorScale[intensity];

              return (
                <button
                  key={dateStr}
                  onClick={() => router.push(`/journal/${dateStr}`)}
                  title={`${format(day, "MMM d, yyyy")}: ${intensity} units`}
                  className="w-[11px] h-[11px] rounded-[2px] cursor-pointer hover:ring-2 hover:ring-[#8C6D3F] hover:ring-offset-1 dark:hover:ring-offset-[#1a1a1a] transition-all duration-200"
                  style={{ backgroundColor: bgColor }}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex mt-3 text-[10px] text-[#b7ad92] font-semibold uppercase tracking-widest opacity-60">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 text-center">
            {format(new Date(year, i, 1), "MMM")}
          </div>
        ))}
      </div>
    </div>
  );
}
