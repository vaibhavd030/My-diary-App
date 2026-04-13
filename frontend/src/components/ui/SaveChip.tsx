"use client";

import { Check, CloudUpload, AlertCircle } from "lucide-react";
import type { SaveStatus } from "@/lib/useAutosave";

export function SaveChip({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="chip-saving">
        <CloudUpload className="w-3 h-3" /> saving
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="chip-saved">
        <Check className="w-3 h-3" /> saved
      </span>
    );
  }
  return (
    <span className="chip-error">
      <AlertCircle className="w-3 h-3" /> retry
    </span>
  );
}
