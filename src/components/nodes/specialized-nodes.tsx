"use client";

import { memo, useRef, useState, useCallback, useMemo } from "react";
import { Handle, Position, useEdges, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils/cn";
import type { WorkflowNodeData } from "@/store/workflow-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { NodeErrorBoundary } from "@/components/error-boundary";
import {
  STATUS_OUTLINE_CLASS_MAP,
  getHandleStyle
} from "./node-utils";
import { useNodeDefinition } from "./node-definition-context";


interface NodeShellProps {
  data: WorkflowNodeData;
  selected: boolean;
  connectedInputIds: Set<string>;
  children: React.ReactNode;
}
function NodeShell({ data, selected, children }: Omit<NodeShellProps, "connectedInputIds">) {
  const definition = useNodeDefinition(data.definitionId);

  if (!definition) {
    return (
      <div className="w-64 h-32 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
        <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative">

      <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-1 pb-1">
        <div className="flex size-3.5 items-center justify-center rounded-sm bg-[#111] border border-[#333]">
          <div className="size-1.5 rounded-full bg-[#fcc800]" />
        </div>
        <span className="text-[12px] font-medium text-[#A0A0A0] tracking-wide truncate">{definition.name}</span>
      </div>


      <div className={cn(
        "relative w-64 rounded-[14px] bg-[#1A1A1A] transition-all duration-300",
        "border-[0.5px] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        selected
          ? "outline outline-[1.6px] outline-white/25 ring-[5px] ring-white/[0.04]"
          : STATUS_OUTLINE_CLASS_MAP[data.status] || ""
      )}>

        <div className="relative flex h-8 items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2 relative">
            {definition.inputs?.map((input) => (
              <Handle
                key={input.id}
                type="target"
                position={Position.Left}
                id={input.id}
                style={getHandleStyle(input.type)}
                className="absolute -left-[22px] top-1/2 -translate-y-1/2 rounded-full cursor-crosshair transition-transform duration-100 ease-out hover:scale-150 z-50"
              />
            ))}
            {(definition.inputs?.length ?? 0) > 0 && (
              <span className="text-[11px] font-normal text-zinc-500 select-none">Input</span>
            )}
          </div>
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
                className="absolute -right-[22px] top-1/2 -translate-y-1/2 rounded-full cursor-crosshair transition-transform duration-100 ease-out hover:scale-150 z-50"
              />
            ))}
          </div>
        </div>


        <div className="px-4 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
}


async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads/transloadit", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url as string;
}


interface CollapsibleSettingsProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}
function CollapsibleSettings({ children, defaultOpen = false }: CollapsibleSettingsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-2 flex flex-col">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-7 w-full items-center justify-start gap-1 px-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-200 outline-none select-none"
      >
        <span className="flex size-4 items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "transition-transform duration-200 ease-out",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
        <span className="truncate">Settings</span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out overflow-hidden"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-2.5 px-1 py-1.5 bg-black/20 rounded-lg mt-1 border border-white/[0.03]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


export const TextNodeComponent = memo(function TextNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);


  const value = (data.config?.text as string) ?? "";

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <textarea
          value={value}
          onChange={(e) => updateNode(id, { text: e.target.value })}
          placeholder="Enter text..."
          rows={4}
          className={cn(
            "w-full resize-none text-[12.5px] font-normal leading-relaxed text-zinc-300 mt-1",
            "bg-[#111111] rounded-md px-2 py-2 border border-white/[0.06]",
            "focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-200",
            "placeholder:text-zinc-600 scrollbar-thin overflow-y-hidden"
          )}
        />
      </NodeShell>
    </NodeErrorBoundary>
  );
});


export const UploadImageNodeComponent = memo(function UploadImageNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);


  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUrl = (data.config?.url as string) ?? "";

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      updateNode(id, { url });
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [id, updateNode]);

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
        
        {currentUrl ? (
          <div className="relative group mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Uploaded" className="w-full rounded-md object-cover max-h-40" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-white font-medium"
            >
              Replace Image
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full mt-1 flex flex-col items-center justify-center gap-2 py-6 rounded-xl",
              "border border-dashed border-white/15 hover:border-white/30 bg-[#111111] hover:bg-[#171717]",
              "text-zinc-500 hover:text-zinc-400 transition-all duration-150 cursor-pointer",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            {uploading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            )}
            <span className="text-[11px]">{uploading ? "Uploading..." : "Click to upload image"}</span>
            <span className="text-[10px] opacity-60">JPG, PNG, WEBP, GIF</span>
          </button>
        )}

        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </NodeShell>
    </NodeErrorBoundary>
  );
});


export const UploadVideoNodeComponent = memo(function UploadVideoNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);


  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUrl = (data.config?.url as string) ?? "";

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      updateNode(id, { url });
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [id, updateNode]);

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="hidden" onChange={handleFile} />
        
        {currentUrl ? (
          <div className="relative group mt-1">
            <video src={currentUrl} controls className="w-full rounded-md max-h-40 bg-black" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full mt-1 flex flex-col items-center justify-center gap-2 py-6 rounded-xl",
              "border border-dashed border-white/15 hover:border-white/30 bg-[#111111] hover:bg-[#171717]",
              "text-zinc-500 hover:text-zinc-400 transition-all duration-150 cursor-pointer",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            {uploading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-pink-400" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
            )}
            <span className="text-[11px]">{uploading ? "Uploading..." : "Click to upload video"}</span>
            <span className="text-[10px] opacity-60">MP4, MOV, WEBM</span>
          </button>
        )}

        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </NodeShell>
    </NodeErrorBoundary>
  );
});


const LLM_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-pro",
  "gemini-3.0-flash",
] as const;

export const LLMNodeComponent = memo(function LLMNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const edges = useEdges();
  const connectedInputIds = useMemo(
    () => new Set(edges.filter(e => e.target === id).map(e => e.targetHandle!)),
    [edges, id]
  );
  const model = (data.config?.model as string) ?? "gemini-2.5-flash";
  const lastOutputObj = data.lastOutput as { output: string } | undefined;
  const lastOutput = lastOutputObj?.output;
  const lastError = data.lastError;

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <CollapsibleSettings defaultOpen={true}>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Model</span>
            <select
              value={model}
              onChange={(e) => updateNode(id, { model: e.target.value })}
              className={cn(
                "w-full text-[12px] text-zinc-300 bg-[#111111] rounded-md px-2 py-1.5",
                "border border-white/[0.06] focus:ring-1 focus:ring-white/20 focus:outline-none",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              {LLM_MODELS.map((m) => (
                <option key={m} value={m} className="bg-[#111]">{m}</option>
              ))}
            </select>
          </div>


          <div className="flex flex-col gap-0.5">
            {useNodeDefinition(data.definitionId)?.inputs.map((inp) => {
              const isConnected = connectedInputIds.has(inp.id);
              return (
                <div key={inp.id} className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md text-[11px]",
                  isConnected ? "bg-[#0f1a0f] text-emerald-400" : "text-zinc-600"
                )}>
                  <span className={cn("size-1.5 rounded-full shrink-0", isConnected ? "bg-emerald-400" : "bg-zinc-700")} />
                  <span>{inp.name}</span>
                  {isConnected && <span className="ml-auto text-[10px] opacity-60">connected</span>}
                </div>
              );
            })}
          </div>
        </CollapsibleSettings>


        {(lastOutput || lastError) && (
          <div className={cn(
            "mt-3 rounded-md px-2 py-2 text-[11.5px] leading-relaxed max-h-48 overflow-y-auto scrollbar-none",
            lastError
              ? "bg-red-950/40 border border-red-700/30 text-red-300"
              : "bg-[#0d1a0d] border border-emerald-800/30 text-zinc-300"
          )}>
            {lastError ?? lastOutput}
          </div>
        )}
      </NodeShell>
    </NodeErrorBoundary>
  );
});


export const CropImageNodeComponent = memo(function CropImageNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const edges = useEdges();
  const connectedInputIds = useMemo(
    () => new Set(edges.filter(e => e.target === id).map(e => e.targetHandle!)),
    [edges, id]
  );

  const fields = ["x_percent", "y_percent", "width_percent", "height_percent"] as const;

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <CollapsibleSettings defaultOpen={true}>
          <div className="flex flex-col gap-2.5">
            {fields.map((key) => {
              const connectedInput = connectedInputIds.has(key);
              return (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">{key.replace(/_/g, " ")}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={connectedInput}
                    value={(data.config?.[key] as number) ?? (key.includes("width") || key.includes("height") ? 100 : 0)}
                    onChange={(e) => updateNode(id, { [key]: Number(e.target.value) })}
                    className={cn(
                      "w-full text-[12px] rounded-md px-2 py-1.5 border",
                      "focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-200",
                      connectedInput
                        ? "bg-[#0f1a0f] border-emerald-800/30 text-emerald-400/60 cursor-not-allowed"
                        : "bg-[#111111] border-white/[0.06] text-zinc-300"
                    )}
                    placeholder={connectedInput ? "from connection" : "0"}
                  />
                </div>
              );
            })}
          </div>
        </CollapsibleSettings>


        {Boolean(data.lastOutput) && typeof data.lastOutput === "object" && "output" in (data.lastOutput as Record<string, unknown>) && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(data.lastOutput as { output: string }).output} alt="Cropped" className="w-full rounded-md object-cover max-h-32 shadow-lg border border-white/5" />
          </div>
        )}
      </NodeShell>
    </NodeErrorBoundary>
  );
});


export const ExtractFrameNodeComponent = memo(function ExtractFrameNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const edges = useEdges();
  const connectedInputIds = useMemo(
    () => new Set(edges.filter(e => e.target === id).map(e => e.targetHandle!)),
    [edges, id]
  );
  const tsConnected = connectedInputIds.has("timestamp");

  return (
    <NodeErrorBoundary nodeId={id}>
      <NodeShell data={data} selected={selected}>
        <CollapsibleSettings defaultOpen={true}>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Timestamp</span>
            <input
              type="text"
              disabled={tsConnected}
              value={(data.config?.timestamp as string) ?? "00:00:01.000"}
              onChange={(e) => updateNode(id, { timestamp: e.target.value })}
              className={cn(
                "w-full text-[12px] rounded-md px-2 py-1.5 border",
                "focus:ring-1 focus:ring-white/20 focus:outline-none transition-all duration-200",
                tsConnected
                  ? "bg-[#0f1a0f] border-emerald-800/30 text-emerald-400/60 cursor-not-allowed"
                  : "bg-[#111111] border-white/[0.06] text-zinc-300"
              )}
              placeholder="00:00:01.000 or 50%"
            />
          </div>
        </CollapsibleSettings>

        {Boolean(data.lastOutput) && typeof data.lastOutput === "object" && "output" in (data.lastOutput as Record<string, unknown>) && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(data.lastOutput as { output: string }).output} alt="Frame" className="w-full rounded-md object-cover max-h-32 shadow-lg border border-white/5" />
          </div>
        )}
      </NodeShell>
    </NodeErrorBoundary>
  );
});
