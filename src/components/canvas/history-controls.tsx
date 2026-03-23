"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { useWorkflowStore } from "@/store/workflow-store";

interface HistoryButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function HistoryButton({ icon, label, onClick, disabled = false }: HistoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-100",
        "text-zinc-400 border border-zinc-700/30",
        !disabled && "hover:text-zinc-100 hover:bg-zinc-800/60",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {icon}
    </button>
  );
}

export function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useWorkflowStore();

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  return (
    <div className="absolute bottom-6 left-6 z-10 pointer-events-auto">
      <div className="flex items-center gap-1 rounded-xl bg-zinc-900/95 border border-zinc-800/50 px-1 py-1 backdrop-blur-sm shadow-lg">

        <HistoryButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V5m0 0L5 9m4-4l4 4" />
            </svg>
          }
          label="Undo"
          onClick={handleUndo}
          disabled={!canUndo}
        />


        <HistoryButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19V5m0 0l4 4m-4-4l-4 4" />
            </svg>
          }
          label="Redo"
          onClick={handleRedo}
          disabled={!canRedo}
        />
      </div>
    </div>
  );
}
