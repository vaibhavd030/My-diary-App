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
  
  const months = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const days = eachDayOfInterval({
        start: new Date(year, i, 1),
        end: new Date(year, i + 1, 0)
      });
      
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
    });
  }, [year]);

  return (
    <div className="overflow-x-auto pb-4 scrollbar-hide select-none transition-all duration-500">
      <div className="flex gap-[8px] min-w-max">
        {months.map((weeks, monthIdx) => (
          <div 
            key={monthIdx} 
            className="flex flex-col border-r border-[#e6dece] pr-[8px] last:border-0 last:pr-0"
          >
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                    const day = week.find((d) => getDay(d) === dayIndex);
                    
                    if (!day) return <div key={dayIndex} className="w-[11px] h-[11px]" />;

                    const dateStr = format(day, "yyyy-MM-dd");
                    const intensity = data[dateStr] || 0;
                    const bgColor = colorScale[intensity];

                    const isSystemStart = dateStr === "2026-04-12";

                    return (
                      <button
                        key={dateStr}
                        onClick={() => router.push(`/journal/${dateStr}`)}
                        title={`${format(day, "MMM d, yyyy")}: ${intensity} units`}
                        className={`w-[11px] h-[11px] rounded-[2px] cursor-pointer hover:ring-2 hover:ring-[#8C6D3F] hover:ring-offset-1 transition-all duration-200 ${
                          isSystemStart ? "ring-2 ring-red-500 ring-offset-1 z-10" : ""
                        }`}
                        style={{ backgroundColor: bgColor }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-[#b7ad92] font-semibold uppercase tracking-widest opacity-60 text-center">
              {format(new Date(year, monthIdx, 1), "MMM")}
            </div>
          </div>
        ))}
      </div>
      

    </div>
  );
}
