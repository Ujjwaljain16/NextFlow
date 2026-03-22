"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils/cn";
import { Copy, Edit2 } from "lucide-react";
import { type WorkflowNodeData } from "@/store/workflow-store";
import {
  STATUS_OUTLINE_CLASS_MAP,
  getHandleStyle
} from "./node-utils";

export interface BaseNodeProps extends NodeProps<WorkflowNodeData> {
  onConfigChange?: (key: string, value: unknown) => void;
}

function BaseNode({ data, selected, onConfigChange }: BaseNodeProps) {
  const definition = data.definition;

  if (!definition) return null;

  const handleConfigChange = (key: string, value: string) => {
    if (onConfigChange) onConfigChange(key, value);
  };

  return (
    <div className="relative">
      {/* Floating node label — brighter than before */}
      <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-1 pb-1">
        <div className="flex size-3.5 items-center justify-center rounded-sm bg-[#111] border border-[#333]">
          <div className="size-1.5 rounded-full bg-[#fcc800]" />
        </div>
        <span className="text-[12px] font-medium text-[#A0A0A0] tracking-wide truncate">
          {definition.name}
        </span>
      </div>

      {/* Node card */}
      <div
        className={cn(
          "relative w-64 rounded-[14px] bg-[#1A1A1A] transition-all duration-300 ease-out",
          "border-[0.5px] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
          selected
            ? "outline outline-[1.6px] outline-white/25 ring-[5px] ring-white/[0.04]"
            : STATUS_OUTLINE_CLASS_MAP[data.status] || ""
        )}
      >
        {/* ── Header row: Input / Output labels + handles ── */}
        <div className="relative flex h-8 items-center justify-between px-5 pt-5">

          {/* Left: Input handles + label */}
          <div className="flex items-center gap-2 relative">
            {definition.inputs?.map((input) => (
              <Handle
                key={input.id}
                type="target"
                position={Position.Left}
                id={input.id}
                style={getHandleStyle(input.type)}
                className={cn(
                  "absolute -left-[22px] top-1/2 -translate-y-1/2",
                  "rounded-full cursor-crosshair",
                  "transition-transform duration-100 ease-out hover:scale-150 z-50"
                )}
              />
            ))}
            {(definition.inputs?.length ?? 0) > 0 && (
              <span className="text-[11px] font-normal text-zinc-500 select-none">Input</span>
            )}
          </div>

          {/* Right: Output label + handles */}
          <div className="flex items-center gap-2 relative">
            {(definition.outputs?.length ?? 0) > 0 && (
              <span className="text-[11px] font-normal text-zinc-500 select-none">Output</span>
            )}
            {definition.outputs?.map((output) => (
              <Handle
                key={output.id}
                type="source"
                position={Position.Right}
                id={output.id}
                style={getHandleStyle(output.type)}
                className={cn(
                  "absolute -right-[22px] top-1/2 -translate-y-1/2",
                  "rounded-full cursor-crosshair",
                  "transition-transform duration-100 ease-out hover:scale-150 z-50"
                )}
              />
            ))}
          </div>
        </div>

        {/* ── Action row ── */}
        <div className="flex justify-between items-center px-5 pt-4 pb-1.5">
          <div className="flex size-5 items-center justify-center rounded-[4px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
            <Edit2 className="size-[11px]" />
          </div>
          <button
            className="flex size-6 items-center justify-center rounded-sm text-zinc-600 hover:bg-white/10 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Copy"
          >
            <Copy className="size-[11px]" />
          </button>
        </div>

        {/* ── Content area ── */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {definition.configFields?.map((field) => {
            if (field.fieldType === "string") {
              const value = (data.config?.[field.key] as string) || "";
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  {field.label && (
                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                      {field.label}
                    </span>
                  )}
                  <textarea
                    className={cn(
                      "w-full resize-none text-[12.5px] font-normal leading-relaxed text-zinc-300",
                      "bg-[#111111] rounded-md px-2 py-2",
                      "border border-white/[0.06]",
                      "focus:ring-1 focus:ring-white/20 focus:border-white/10 focus:outline-none",
                      "transition-all ease-in-out duration-200",
                      "placeholder:text-zinc-600 scrollbar-thin overflow-y-hidden"
                    )}
                    rows={4}
                    value={value}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    placeholder={field.label}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export const BaseNodeComponent = memo(BaseNode);
