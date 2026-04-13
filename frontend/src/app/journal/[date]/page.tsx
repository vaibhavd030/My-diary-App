"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LogOut,
  LineChart,
  Search,
  Moon,
  Sun,
  X,
  Download,
  Settings as SettingsIcon,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { MeditationSection } from "@/components/sections/MeditationSection";
import { CleaningSection } from "@/components/sections/CleaningSection";
import { SittingSection } from "@/components/sections/SittingSection";
import { GroupMeditationSection } from "@/components/sections/GroupMeditationSection";
import { SleepSection } from "@/components/sections/SleepSection";
import { GymSection } from "@/components/sections/GymSection";
import { ActivitySection } from "@/components/sections/ActivitySection";
import { PersonalWatchSection } from "@/components/sections/PersonalWatchSection";
import { JournalSection } from "@/components/sections/JournalSection";
import { getDay, DayOut, EntryType, searchEntries, EntryOut, exportDiary } from "@/lib/api";
import {
  addDaysISO,
  formatLong,
  isFuture,
  isToday,
  todayISO,
} from "@/lib/dates";
import { clearAuth, getUser } from "@/lib/auth";

function extract<T>(day: DayOut | null, key: EntryType): T | null {
  const entry = day?.entries[key];
  return (entry?.data as T) ?? null;
}

function SectionSkeleton() {
  return (
    <div className="diary-card p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="flex-1">
          <div className="skeleton h-4 w-40 mb-2" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const date = params.date;

  const [day, setDay] = useState<DayOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntryOut[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    if (saved) {
      setTheme(saved);
      if (saved === "dark") document.documentElement.classList.add("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const id = setTimeout(() => {
      setIsSearching(true);
      searchEntries(searchQuery)
        .then(setSearchResults)
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDay(date)
      .then((d) => alive && setDay(d))
      .catch(() => alive && setDay({ date, entries: {} }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  useEffect(() => {
    // Refresh data whenever the window/tab regains focus
    const onFocus = () => setRefetchKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function navigate(iso: string) {
    if (isFuture(iso)) return;
    setCalendarOpen(false);
    router.push(`/journal/${iso}`);
  }

  const user = typeof window !== "undefined" ? getUser() : null;
  const firstName = user?.first_name ?? "friend";

  const handleDataChange = () => setRefetchKey((k) => k + 1);

  return (
    <AuthGuard>
      <main className="min-h-screen relative bg-[#F5F1E6] text-[#3E3E3E]">
        <div className="paper-pattern absolute inset-0 opacity-10 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <header className="flex items-center justify-between mb-6">
            <div>
              <p
                className="leading-none"
                style={{
                  fontFamily: "var(--font-pinyon), cursive",
                  fontSize: 30,
                  color: "#8C6D3F",
                }}
              >
                My Diary
              </p>
              <p className="text-[11px] text-[#b7ad92] italic mt-0.5">
                Good to see you, {firstName}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-white dark:bg-[#262626] border border-[#e6dece] dark:border-[#404040] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] dark:hover:bg-[#3f3f3f] transition-colors"
                aria-label="Search entries"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full bg-white dark:bg-[#262626] border border-[#e6dece] dark:border-[#404040] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] dark:hover:bg-[#3f3f3f] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCalendarOpen((v) => !v)}
                className="lg:hidden w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7]"
                aria-label="Open calendar"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/analytics")}
                className="w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] transition-colors"
                aria-label="View analytics"
                title="View analytics"
              >
                <LineChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/settings")}
                className="w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7] transition-colors"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  clearAuth();
                  router.replace("/login");
                }}
                className="w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7]"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => navigate(addDaysISO(date, -1))}
              className="w-8 h-8 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] hover:bg-[#F0E4C7] flex items-center justify-center"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h1
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: 24,
                  color: "#8C6D3F",
                  lineHeight: 1.1,
                }}
              >
                {formatLong(date)}
              </h1>
              {isToday(date) ? (
                <p className="text-[11px] text-[#7d8b63] italic">Today</p>
              ) : (
                <button
                  onClick={() => navigate(todayISO())}
                  className="text-[11px] text-[#8C6D3F] italic hover:underline"
                >
                  back to today
                </button>
              )}
            </div>
            <button
              onClick={() => navigate(addDaysISO(date, 1))}
              disabled={isFuture(addDaysISO(date, 1))}
              className="w-8 h-8 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] hover:bg-[#F0E4C7] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {searchOpen && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="diary-card p-2 flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b7ad92]" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search your journey..."
                    className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-[#3E3E3E] dark:text-[#e5e5e5]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b7ad92] hover:text-[#8C6D3F]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="border-t border-[#e6dece] dark:border-[#404040] max-h-64 overflow-y-auto mt-1">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => {
                          navigate(res.entry_date);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-3 hover:bg-[#FDFBF5] dark:hover:bg-[#2d2d2d] border-b border-[#f5f1e6] dark:border-[#262626] last:border-0 transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[#8C6D3F]">{formatLong(res.entry_date)}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[#b7ad92]">{res.type.replace("_", " ")}</span>
                        </div>
                        <p className="text-xs text-[#5c4d37] dark:text-[#a3a3a3] line-clamp-1 mt-0.5">
                          {JSON.stringify(res.data)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-[#b7ad92] italic">No matches found</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
            <div className="space-y-5 min-w-0">
              {loading ? (
                <>
                  <SectionSkeleton />
                  <SectionSkeleton />
                  <SectionSkeleton />
                  <SectionSkeleton />
                </>
              ) : (
                <>
                  <div>
                    <div className="group-label">Practice</div>
                    <div className="space-y-2">
                      <MeditationSection
                        key={`med-${date}`}
                        date={date}
                        initial={extract(day, "meditation")}
                        onDataChange={handleDataChange}
                      />
                      <CleaningSection
                        key={`cle-${date}`}
                        date={date}
                        initial={extract(day, "cleaning")}
                        onDataChange={handleDataChange}
                      />
                      <SittingSection
                        key={`sit-${date}`}
                        date={date}
                        initial={extract(day, "sitting")}
                        onDataChange={handleDataChange}
                      />
                      <GroupMeditationSection
                        key={`grp-${date}`}
                        date={date}
                        initial={extract(day, "group_meditation")}
                        onDataChange={handleDataChange}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="group-label">Body</div>
                    <div className="space-y-2">
                      <SleepSection
                        key={`slp-${date}`}
                        date={date}
                        initial={extract(day, "sleep")}
                        onDataChange={handleDataChange}
                      />
                      <GymSection
                        key={`gym-${date}`}
                        date={date}
                        initial={extract(day, "gym")}
                        onDataChange={handleDataChange}
                      />
                      <ActivitySection
                        key={`act-${date}`}
                        date={date}
                        initial={extract(day, "activity")}
                        onDataChange={handleDataChange}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="group-label">Habits</div>
                    <div className="space-y-2">
                      <PersonalWatchSection
                        key={`pw-${date}`}
                        date={date}
                        initial={extract(day, "personal_watch")}
                        onDataChange={handleDataChange}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="group-label">Reflection</div>
                    <JournalSection
                      key={`jnl-${date}`}
                      date={date}
                      initial={
                        (day?.entries.journal_note?.data as { body?: string })
                          ?.body ?? ""
                      }
                      onDataChange={handleDataChange}
                    />
                  </div>
                </>
              )}
            </div>

            <aside className="hidden lg:block sticky top-6 self-start">
              <MonthGrid
                selectedDate={date}
                onSelect={navigate}
                refetchKey={refetchKey}
              />
            </aside>
          </div>
        </div>

        {calendarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-sm flex items-end"
            onClick={() => setCalendarOpen(false)}
          >
            <div
              className="w-full bg-[#F5F1E6] rounded-t-2xl p-4 pb-8 max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#e6dece] rounded-full mx-auto mb-3" />
              <MonthGrid
                selectedDate={date}
                onSelect={navigate}
                refetchKey={refetchKey}
              />
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
