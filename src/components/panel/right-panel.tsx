"use client";

import { useWorkflowStore } from "@/store/workflow-store";
import { HistoryPanel } from "@/components/panel/history-panel";

export function RightPanel() {

  const rightPanelTab = useWorkflowStore((s) => s.rightPanelTab);

  if (rightPanelTab === "hidden") return null;

  return (
    <aside className="absolute right-4 top-20 bottom-24 w-[300px] shrink-0 border border-white/5 bg-[#1A1A1B]/95 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden transition-all duration-300">
      <div className="p-3 border-b border-white/5">
        <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-widest px-2">History</h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent p-4">
        <HistoryPanel />
      </div>
    </aside>
  );
}
