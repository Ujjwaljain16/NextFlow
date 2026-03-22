import React from "react";

export const STATUS_OUTLINE_CLASS_MAP: Record<string, string> = {
  RUNNING:  "outline outline-2 outline-yellow-400/60 shadow-[0_0_16px_rgba(250,204,21,0.3)]",
  SUCCESS:  "outline outline-2 outline-green-400/60 shadow-[0_0_16px_rgba(74,222,128,0.3)]",
  FAILED:   "outline outline-2 outline-red-400/60 shadow-[0_0_16px_rgba(248,113,113,0.3)]",
  PENDING:  "",
  IDLE:     "",
};

export function getHandleStyle(color: string): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    backgroundColor: color,
    border: `1.5px solid ${color}`,
    boxShadow: `0 0 6px ${color}80`,
    borderRadius: "50%",
  };
}

export const INPUT_HANDLE_COLOR  = "#4A9EF5"; // Blueish
export const OUTPUT_HANDLE_COLOR = "#F5C842"; // Yellow/Orange
