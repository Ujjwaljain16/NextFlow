"use client";

import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { cn } from "@/lib/utils/cn";

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ControlButton({ icon, label, onClick, active = false }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
        "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
        active && "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700",
      )}
    >
      {icon}
    </button>
  );
}

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, includeHiddenNodes: false });
  }, [fitView]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
      <div className="flex items-center gap-2 rounded-xl bg-zinc-900/95 border border-zinc-800/50 px-3 py-2 backdrop-blur-sm shadow-lg">
        {/* Zoom Out */}
        <ControlButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          }
          label="Zoom out"
          onClick={handleZoomOut}
        />

        {/* Fit View */}
        <div className="w-px h-6 bg-zinc-700/30" />
        <ControlButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"
              />
            </svg>
          }
          label="Fit to view"
          onClick={handleFitView}
        />

        {/* Zoom In */}
        <div className="w-px h-6 bg-zinc-700/30" />
        <ControlButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          label="Zoom in"
          onClick={handleZoomIn}
        />
      </div>
    </div>
  );
}
