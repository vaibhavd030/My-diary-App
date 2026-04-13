"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave with last-write-wins coalescing and one retry on error.
 *
 * - Skips the very first render so initial-state mounts don't write.
 * - Coalesces rapid edits: only the latest value is saved.
 * - On error, retries once after a short backoff before surfacing failure.
 *
 * @param value     The current value to be persisted.
 * @param saver     Async function that persists ``value``.
 * @param delayMs   Debounce delay before saving (default 800ms).
 */
export function useAutosave<T>(
  value: T,
  saver: (v: T) => Promise<void>,
  delayMs = 800,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaver = useRef(saver);
  latestSaver.current = saver;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      try {
        await latestSaver.current(value);
        setStatus("saved");
      } catch {
        // retry once after 1.2s
        await new Promise((r) => setTimeout(r, 1200));
        try {
          await latestSaver.current(value);
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delayMs]);

  return status;
}
