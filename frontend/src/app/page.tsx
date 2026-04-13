"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isAuthed } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/login");
    } else {
      router.replace(`/journal/${todayISO()}`);
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F1E6]">
      <Loader2 className="w-5 h-5 animate-spin text-[#8C6D3F]" />
    </main>
  );
}
