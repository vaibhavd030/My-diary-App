"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Moon, 
  Sunrise, 
  Dumbbell, 
  CheckCircle2, 
  PieChart,
  Download,
  Settings as SettingsIcon,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { MiniHeatmap } from "@/components/analytics/MiniHeatmap";
import { YearHeatmap } from "@/components/analytics/YearHeatmap";
import { getAnalytics, getAnnualAnalytics, AnalyticsMonthOut, exportDiary } from "@/lib/api";
import { format } from "date-fns";
import { todayISO } from "@/lib/dates";

const SLEEP_COLORS = ["#f8f9fa", "#e6f4ea", "#ceead6", "#81c995", "#1e8e3e"];
const MED_COLORS = ["#f8f9fa", "#fef3c7", "#fde68a", "#fbbf24", "#d97706"];
const RE_COLORS = ["#f8f9fa", "#e0e7ff", "#c7d2fe", "#818cf8", "#4f46e5"];
const PW_COLORS = ["#f8f9fa", "#fee2e2", "#fecaca", "#f87171", "#dc2626"];

export default function AnalyticsPage() {
  const router = useRouter();
  const [now] = useState(new Date());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<AnalyticsMonthOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "year">("month");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    
    // Diagnostic logging
    console.log(`[Analytics] Fetching ${view} view for ${year}${view === 'month' ? `/${month}` : ''}`);

    const fetcher = view === "month" 
        ? getAnalytics(year, month)
        : getAnnualAnalytics(year);

    fetcher
      .then((res) => {
        if (alive) {
          console.log(`[Analytics] Success: Recieved stats for ${Object.keys(res.stats).length} categories`);
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (alive) {
          console.error(`[Analytics] Error:`, err);
          setData(null);
          setLoading(false);
          // Show detailed alert for debugging
          const msg = err.response?.data?.detail 
            ? JSON.stringify(err.response.data.detail)
            : err.message;
          if (view === "year") {
            alert(`Yearly analytics failed to load.\nStatus: ${err.response?.status}\nError: ${msg}`);
          }
        }
      });

    return () => { alive = false; };
  }, [year, month, view]);

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <AuthGuard>
      <main className="min-h-screen relative bg-[#F5F1E6] text-[#3E3E3E] pb-12">
        <div className="paper-pattern absolute inset-0 opacity-10 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-8">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/journal/${todayISO()}`)}
                className="group flex items-center gap-2 text-[#8C6D3F] hover:text-[#5c4d37] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#e6dece] flex items-center justify-center group-hover:bg-[#F0E4C7] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">Back to Journal</span>
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-serif text-[#8C6D3F] flex items-center gap-2 justify-center">
                <PieChart className="w-6 h-6" />
                Visual Insights
              </h1>
              <p className="text-[10px] text-[#b7ad92] uppercase tracking-[0.2em] mt-1">Your journey in numbers</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => exportDiary().catch(() => alert("Export failed."))}
                className="w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] transition-all shadow-sm"
                aria-label="Export all entries as JSON"
                title="Export all entries as JSON"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push("/settings")}
                className="w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] transition-all shadow-sm"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              <div className="flex bg-[#FDFBF5] border border-[#e6dece] rounded-lg p-1">
                <button
                  onClick={() => setView("month")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    view === "month" 
                      ? "bg-[#8C6D3F] text-white shadow-sm" 
                      : "text-[#b7ad92] hover:text-[#8C6D3F]"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView("year")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    view === "year" 
                      ? "bg-[#8C6D3F] text-white shadow-sm" 
                      : "text-[#b7ad92] hover:text-[#8C6D3F]"
                  }`}
                >
                  Year
                </button>
              </div>

              <div className="flex items-center bg-[#FDFBF5] border border-[#e6dece] rounded-xl px-2 py-1">
                <button 
                  onClick={() => {
                    if (view === "month") {
                      if (month === 1) { setYear(y => y - 1); setMonth(12); }
                      else setMonth(m => m - 1);
                    } else {
                      setYear(y => y - 1);
                    }
                  }}
                  className="p-1 hover:bg-[#ede7d7] rounded-lg text-[#8C6D3F]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-3 text-center min-w-[90px]">
                  <span className="text-[11px] font-bold text-[#8C6D3F] tracking-wider uppercase whitespace-nowrap">
                    {view === "month" ? format(new Date(year, month - 1), "MMM yyyy") : year}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    if (view === "month") {
                      if (month === 12) { setYear(y => y + 1); setMonth(1); }
                      else setMonth(m => m + 1);
                    } else {
                      setYear(y => y + 1);
                    }
                  }}
                  className="p-1 hover:bg-[#ede7d7] rounded-lg text-[#8C6D3F]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="diary-card h-64 skeleton opacity-50" />
               ))}
            </div>
          ) : data ? (
            <div className={`space-y-12 ${view === "year" ? "max-w-5xl mx-auto" : ""}`}>
              {/* SADHANA */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                  <h3 className="text-sm font-semibold text-[#8C6D3F] uppercase tracking-[0.2em]">Sadhana</h3>
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                </div>
                <div className={`grid gap-6 ${view === "month" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                  <StatCard 
                    title="Meditation" 
                    icon={Sunrise} 
                    stat={data.stats.meditation} 
                    colors={MED_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                  <StatCard 
                    title="Cleaning" 
                    icon={CheckCircle2} 
                    stat={data.stats.cleaning} 
                    colors={MED_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                  <StatCard 
                    title="Sitting" 
                    icon={CheckCircle2} 
                    stat={data.stats.sitting} 
                    colors={MED_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                </div>
              </section>

              {/* WELLBEING */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                  <h3 className="text-sm font-semibold text-[#8C6D3F] uppercase tracking-[0.2em]">Wellbeing</h3>
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                </div>
                <div className={`grid gap-6 ${view === "month" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                  <StatCard 
                    title="Sleep" 
                    icon={Moon} 
                    stat={data.stats.sleep} 
                    colors={SLEEP_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                  <StatCard 
                    title="Gym" 
                    icon={Dumbbell} 
                    stat={data.stats.gym} 
                    colors={RE_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                  <StatCard 
                    title="Activity" 
                    icon={Dumbbell} 
                    stat={data.stats.activity} 
                    colors={RE_COLORS}
                    year={year}
                    month={month}
                    view={view}
                  />
                </div>
              </section>

              {/* HABITS */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                  <h3 className="text-sm font-semibold text-[#8C6D3F] uppercase tracking-[0.2em]">Habits</h3>
                  <div className="h-px flex-1 bg-[#ede7d7]" />
                </div>
                <div className={`grid gap-6 ${view === "month" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                  {["got_angry", "mtb", "scrolled_phone", "junk_food", "watched_movie", "slept_late"].map(key => (
                    data.stats[key] && (
                      <StatCard 
                        key={key}
                        title={data.stats[key].label}
                        icon={CheckCircle2}
                        stat={data.stats[key]}
                        colors={PW_COLORS}
                        year={year}
                        month={month}
                        view={view}
                      />
                    )
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </AuthGuard>
  );
}

function StatCard({ title, icon: Icon, stat, colors, year, month, view }: any) {
  if (!stat) return null;
  return (
    <div className="diary-card p-5 group hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-[#8C6D3F] text-lg flex items-center gap-2">
            <Icon className="w-4 h-4 opacity-70" />
            {title}
          </h3>
          <p className="text-[10px] text-[#b7ad92] uppercase tracking-wider font-semibold">
            {view === "month" ? "Monthly Consistency" : "Annual Performance"}
          </p>
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className={`font-serif text-[#5c4d37] dark:text-[#e5e5e5] transition-all duration-500 ${view === 'year' ? 'text-4xl' : 'text-2xl'}`}>
                {stat.value}
              </span>
              <span className="text-[10px] text-[#b7ad92] uppercase font-bold tracking-tighter">{stat.unit}</span>
            </div>
            {stat.secondary_value !== undefined && (
              <div className="text-[12px] font-bold text-[#8C6D3F] dark:text-[#c5a065] items-center flex gap-1">
                <span className="opacity-60 tabular-nums">{stat.secondary_value}</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold">{stat.secondary_unit}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-[#FDFBF5] dark:bg-[#1a1a1a] p-3 rounded-xl border border-[#ede7d7] dark:border-[#404040]">
        {view === "month" ? (
          <MiniHeatmap 
            year={year} 
            month={month} 
            data={stat.heatmap_data} 
            colorScale={colors}
          />
        ) : (
          <YearHeatmap
            year={year}
            data={stat.heatmap_data}
            colorScale={colors}
          />
        )}
      </div>
    </div>
  );
}
