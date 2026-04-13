"use client";

import { ReactNode, useState } from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { SaveChip } from "@/components/ui/SaveChip";
import type { SaveStatus } from "@/lib/useAutosave";

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  summary?: string;
  icon: LucideIcon;
  status: SaveStatus;
  filled: boolean;
  children: ReactNode;
  /** If true, card opens by default (used by Journal). */
  alwaysOpen?: boolean;
}

/**
 * Collapsible section card.
 *
 * Tapping the whole row toggles expand/collapse. When filled, the row shows
 * a brief summary string. A filled badge on the left swaps icon background
 * so you can see at a glance what's been logged.
 */
export function SectionCard({
  title,
  subtitle,
  summary,
  icon: Icon,
  status,
  filled,
  children,
  alwaysOpen = false,
}: SectionCardProps) {
  const [open, setOpen] = useState<boolean>(alwaysOpen || filled);

  return (
    <section className="diary-card">
      <button
        type="button"
        onClick={() => !alwaysOpen && setOpen((v) => !v)}
        className="section-row"
        aria-expanded={open}
      >
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 34,
            height: 34,
            background: filled ? "#8C6D3F" : "#F0E4C7",
          }}
        >
          <Icon className="w-4 h-4" style={{ color: filled ? "white" : "#8C6D3F" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[15px] leading-tight"
            style={{ color: "#8C6D3F", fontFamily: "var(--font-playfair), serif" }}
          >
            {title}
          </div>
          <div
            className="text-[11px] italic truncate"
            style={{ color: filled ? "#7d8b63" : "#b7ad92" }}
          >
            {filled && summary ? summary : subtitle ?? "tap to log"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SaveChip status={status} />
          {!alwaysOpen && (
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                color: "#8C6D3F",
                transform: open ? "rotate(180deg)" : "none",
              }}
            />
          )}
        </div>
      </button>
      {open && <div className="section-body pt-3">{children}</div>}
    </section>
  );
}
