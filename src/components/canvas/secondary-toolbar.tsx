"use client";

import { useShallow } from "zustand/react/shallow";
import { useWorkflowStore } from "@/store/workflow-store";
import { buildSampleWorkflow } from "@/lib/sample-workflow";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SecondaryToolbarProps {
  definitions: UINodeDefinition[];
}

export function SecondaryToolbar({ definitions }: SecondaryToolbarProps) {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    loadWorkflow,
    setWorkflowMeta,
    rightPanelTab,
    setRightPanelTab,
  } = useWorkflowStore(
    useShallow((s) => ({
      undo: s.undo,
      redo: s.redo,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      loadWorkflow: s.loadWorkflow,
      setWorkflowMeta: s.setWorkflowMeta,
      rightPanelTab: s.rightPanelTab,
      setRightPanelTab: s.setRightPanelTab,
    })),
  );

  const [busy, setBusy] = useState(false);

  const handleLoadSample = () => {
    try {
      setBusy(true);
      const registryMap = Object.fromEntries(definitions.map((d) => [d.id, d]));
      const sample = buildSampleWorkflow(definitions);
      loadWorkflow(
        {
          id: undefined,
          name: sample.name,
          nodes: sample.nodes,
          edges: sample.edges,
        },
        registryMap,
      );
      setWorkflowMeta(null, sample.name);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = () => {
    setRightPanelTab(rightPanelTab === "history" ? "hidden" : "history");
  };

  return (
    <div className="flex flex-row items-center gap-2 pointer-events-auto">

      <TooltipWrapper label="Undo" shortcuts={["⌘", "Z"]}>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="bg-[#1A1A1B] border border-white/5 hover:bg-[#333333] flex h-9 w-9 items-center justify-center rounded-lg shadow-xl transition-[transform,background-color] duration-75 ease-out active:scale-[0.96] cursor-pointer text-[#D4D4D4] hover:text-white disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-undo-2">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        </button>
      </TooltipWrapper>


      <TooltipWrapper label="Redo" shortcuts={["⌘", "⇧", "Z"]}>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="bg-[#1A1A1B] border border-white/5 hover:bg-[#333333] flex h-9 w-9 items-center justify-center rounded-lg shadow-xl transition-[transform,background-color] duration-75 ease-out active:scale-[0.96] cursor-pointer text-[#D4D4D4] hover:text-white disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-redo-2">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
          </svg>
        </button>
      </TooltipWrapper>


      <TooltipWrapper label="Sample Template">
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={busy}
          className="bg-[#1A1A1B] border border-white/5 hover:bg-[#333333] flex items-center gap-2 rounded-lg px-3 shadow-xl transition-[transform,background-color,scale] duration-75 ease-out active:scale-[0.98] h-9 cursor-pointer text-[#D4D4D4] hover:text-white disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden text-xs xl:block">Sample</span>
        </button>
      </TooltipWrapper>


      <TooltipWrapper label="Toggle History">
        <button
          type="button"
          onClick={toggleHistory}
          className={cn(
            "bg-[#1A1A1B] border flex items-center gap-2 rounded-lg px-3 shadow-xl transition-[transform,background-color,scale] duration-75 ease-out active:scale-[0.98] h-9 cursor-pointer",
            rightPanelTab === "history"
              ? "bg-white text-black border-white hover:bg-gray-200"
              : "border-white/5 hover:bg-[#333333] text-[#D4D4D4] hover:text-white"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
          <span className="hidden text-xs xl:block">History</span>
        </button>
      </TooltipWrapper>
    </div>
  );
}

function TooltipWrapper({ children, label, shortcuts }: { children: React.ReactNode; label: string; shortcuts?: string[] }) {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 delay-75 z-[100] pointer-events-none drop-shadow-xl flex justify-center bottom-[calc(100%+8px)]">
        <div className="bg-white text-black px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium flex items-center gap-1.5 whitespace-nowrap shadow-2xl tracking-tight">
          <span>{label}</span>
          {shortcuts && (
            <div className="flex items-center gap-1 ml-1 opacity-70">
              {shortcuts.map((s, i) => (
                <span key={i} className="border border-black/20 rounded-[4px] px-1.5 py-[1px] text-[10px] font-bold bg-black/5 shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-white" />
      </div>
    </div>
  );
}
