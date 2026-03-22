"use client";

import { useWorkflowStore } from "@/store/workflow-store";
import { cn } from "@/lib/utils/cn";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

export function CanvasToolbar() {
  const toggleSidebar = useWorkflowStore((s) => s.toggleSidebar);
  const canvasMode = useWorkflowStore((s) => s.canvasMode);
  const setCanvasMode = useWorkflowStore((s) => s.setCanvasMode);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex flex-row items-center gap-1 rounded-xl border-[0.5px] border-white/10 p-1 shadow-md bg-[#1A1A1B]/90 backdrop-blur-xl">

        {/* Add Node Action */}
        <TooltipWrapper label="New Node" shortcuts={["N"]}>
          <ToolbarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            }
            label="New Node"
            onClick={toggleSidebar}
          />
        </TooltipWrapper>

        {/* Select Mode */}
        <TooltipWrapper label="Select Mode">
          <ToolbarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-2">
                <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
              </svg>
            }
            label="Select Mode"
            active={canvasMode === "select"}
            onClick={() => setCanvasMode("select")}
          />
        </TooltipWrapper>

        {/* Pan Mode */}
        <TooltipWrapper label="Pan Mode">
          <ToolbarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hand">
                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            }
            label="Pan Mode"
            active={canvasMode === "pan"}
            onClick={() => setCanvasMode("pan")}
          />
        </TooltipWrapper>

        {/* Cut Mode */}
        <TooltipWrapper label="Cut Mode">
          <ToolbarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scissors">
                <circle cx="6" cy="6" r="3" />
                <path d="M8.12 8.12 12 12" />
                <path d="M20 4 8.12 15.88" />
                <circle cx="6" cy="18" r="3" />
                <path d="M14.8 14.8 20 20" />
              </svg>
            }
            label="Scissor Mode"
            active={canvasMode === "cut"}
            onClick={() => setCanvasMode("cut")}
          />
        </TooltipWrapper>

        {/* Presets Action */}
        <TooltipWrapper label="Presets">
          <ToolbarButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-workflow">
                <rect width="8" height="8" x="3" y="3" rx="2" />
                <path d="M7 11v4a2 2 0 0 0 2 2h4" />
                <rect width="8" height="8" x="13" y="13" rx="2" />
              </svg>
            }
            label="Presets"
            onClick={() => {}}
          />
        </TooltipWrapper>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, onClick, active = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // title={label} - We remove native title so it doesn't overlap the custom tooltip
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg p-1 transition-[transform,background-color] duration-75 ease-out active:scale-[0.96] cursor-pointer",
        active
          ? "bg-white/10 text-white shadow-sm"
          : "text-[#D4D4D4] hover:bg-white/10 hover:text-white"
      )}
    >
      {icon}
    </button>
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
