"use client";

import { ReactNode, useState } from "react";
import { LucideIcon, ChevronDown, Trash2 } from "lucide-react";
import { SaveChip } from "@/components/ui/SaveChip";
import type { SaveStatus } from "@/lib/useAutosave";
import { cn } from "@/lib/utils";

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
  onReset?: () => void;
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
  onReset,
}: SectionCardProps) {
  const [open, setOpen] = useState<boolean>(alwaysOpen || filled);

  return (
    <section className="diary-card">
      <div className="flex items-stretch overflow-hidden">
        <button
          type="button"
          onClick={() => !alwaysOpen && setOpen((v) => !v)}
          className="section-row group flex-1"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${title} section`}
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0 transition-colors"
            style={{
              width: 34,
              height: 34,
              background: filled
                ? "var(--color-bronze)"
                : "var(--color-gold-faint)",
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: filled ? "white" : "var(--color-bronze)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[15px] leading-tight transition-colors"
              style={{
                color: "var(--color-bronze)",
                fontFamily: "var(--font-serif), serif",
              }}
            >
              {title}
            </div>
            <div
              className={cn(
                "text-[11px] italic truncate transition-colors",
                filled ? "text-sage-dark" : "text-hint"
              )}
            >
              {filled && summary ? summary : subtitle ?? "tap to log"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <SaveChip status={status} />
            {!alwaysOpen && (
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  open && "rotate-180"
                )}
                style={{ color: "var(--color-bronze)" }}
              />
            )}
          </div>
        </button>
        {filled && onReset && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="px-3 hover:bg-red-50 text-[#b7ad92] hover:text-red-500 transition-colors border-l border-[#e6dece]/50 group"
            title="Reset section"
            aria-label={`Reset ${title} section`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="section-content" data-open={open}>
        <div className="section-content-inner">
          <div className="section-body pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
