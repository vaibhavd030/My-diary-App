"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LogOut,
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
import { JournalSection } from "@/components/sections/JournalSection";
import { getDay, DayOut, EntryType } from "@/lib/api";
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
    const id = setInterval(() => setRefetchKey((k) => k + 1), 15000);
    return () => clearInterval(id);
  }, []);

  function navigate(iso: string) {
    if (isFuture(iso)) return;
    setCalendarOpen(false);
    router.push(`/journal/${iso}`);
  }

  const user = typeof window !== "undefined" ? getUser() : null;
  const firstName = user?.first_name ?? "friend";

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
                onClick={() => setCalendarOpen((v) => !v)}
                className="lg:hidden w-9 h-9 rounded-full bg-white border border-[#e6dece] text-[#8C6D3F] flex items-center justify-center hover:bg-[#F0E4C7]"
                aria-label="Open calendar"
              >
                <CalendarDays className="w-4 h-4" />
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
                      />
                      <CleaningSection
                        key={`cle-${date}`}
                        date={date}
                        initial={extract(day, "cleaning")}
                      />
                      <SittingSection
                        key={`sit-${date}`}
                        date={date}
                        initial={extract(day, "sitting")}
                      />
                      <GroupMeditationSection
                        key={`grp-${date}`}
                        date={date}
                        initial={extract(day, "group_meditation")}
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
                      />
                      <GymSection
                        key={`gym-${date}`}
                        date={date}
                        initial={extract(day, "gym")}
                      />
                      <ActivitySection
                        key={`act-${date}`}
                        date={date}
                        initial={extract(day, "activity")}
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
