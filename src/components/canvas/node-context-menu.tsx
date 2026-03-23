"use client";

import React, { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { 
  Play, 
  Download, 
  Copy, 
  Files, 
  Pencil, 
  EyeOff, 
  Eye, 
  Trash2,
  Check
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { runWorkflow } from "@/lib/api/workflow-client";

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

export function NodeContextMenu({ x, y, nodeId, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  
  const { 
    nodes, 
    removeNode, 
    duplicateNode, 
    toggleNodeDisabled, 
    renameNode,
    workflowId,
    setCurrentRun
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useWorkflowStore(useShallow((s: any) => ({
    nodes: s.nodes,
    removeNode: s.removeNode,
    duplicateNode: s.duplicateNode,
    toggleNodeDisabled: s.toggleNodeDisabled,
    renameNode: s.renameNode,
    workflowId: s.workflowId,
    setCurrentRun: s.setCurrentRun
  })));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = nodes.find((n: any) => n.id === nodeId);
  if (!node) return null;

  const isDisabled = node.data.disabled;

  const handleRunNode = async () => {
    if (!workflowId) return;
    try {
      const run = await runWorkflow(workflowId, [nodeId], true);
      setCurrentRun(run.runId);
    } catch (err) {
      console.error("Failed to run node:", err);
    }
    onClose();
  };

  const handleRename = () => {
    renameNode(nodeId, newName || node.data.label);
    setIsRenaming(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") setIsRenaming(false);
  };

  const handleDownload = async () => {
    if (!node?.data?.lastOutput) return;
    
    try {
      const output = node.data.lastOutput;
      let downloadContent = "";
      let isUrl = false;
      let filename = `result-${nodeId}.txt`;

      if (typeof output === "object" && output !== null) {
         const values = Object.values(output);
         const urlValue = values.find(v => typeof v === "string" && v.startsWith("http"));
         if (urlValue) {
           downloadContent = urlValue as string;
           isUrl = true;
           filename = (urlValue as string).split("/").pop()?.split("?")[0] || `download-${nodeId}`;
         } else {
           downloadContent = JSON.stringify(output, null, 2);
           filename = `result-${nodeId}.json`;
         }
      } else {
         downloadContent = String(output);
      }

      if (isUrl) {
        try {
           const response = await fetch(downloadContent);
           if (!response.ok) throw new Error("Fetch failed");
           const blob = await response.blob();
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement("a");
           a.href = url;
           a.download = filename;
           document.body.appendChild(a);
           a.click();
           a.remove();
           window.URL.revokeObjectURL(url);
        } catch {
           const a = document.createElement("a");
           a.href = downloadContent;
           a.download = filename;
           a.target = "_blank";
           a.rel = "noreferrer";
           document.body.appendChild(a);
           a.click();
           a.remove();
        }
      } else {
         const blob = new Blob([downloadContent], { type: "text/plain" });
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         a.remove();
         window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download result:", err);
    }
    
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 overflow-hidden rounded-xl border border-primary-150 bg-primary-0 p-1 shadow-[0_4px_10px_0_rgba(0,0,0,0.08)] backdrop-blur-2xl outline-none dark:border-primary-850 dark:bg-primary-975"
      style={{ left: x, top: y }}
      role="menu"
    >
      {isRenaming ? (
        <div className="flex items-center gap-2 p-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={node.data.label}
            className="w-full rounded bg-primary-100 px-2 py-1 text-sm outline-none dark:bg-primary-900"
          />
          <button onClick={handleRename} className="text-emerald-500 hover:text-emerald-400">
            <Check size={16} />
          </button>
        </div>
      ) : (
        <>

          <button
            onClick={handleRunNode}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none dark:hover:bg-primary-850"
          >
            <Play className="size-4 text-primary-1000 dark:text-primary-0" />
            <span>Run Node</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">⌘</span>
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">↵</span>
            </div>
          </button>

          <div className="-mx-1 my-1.5 h-px bg-primary-150 dark:bg-primary-850" />


          <button
            disabled={!node.data.lastOutput}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none disabled:opacity-30 dark:hover:bg-primary-850"
            onClick={handleDownload}
          >
            <Download className="size-4 text-primary-1000 dark:text-primary-0" />
            <span>Download Result</span>
          </button>

          <div className="-mx-1 my-1.5 h-px bg-primary-150 dark:bg-primary-850" />

          {/* Copy - Placeholder for system clipboard or internal copy */}
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none dark:hover:bg-primary-850"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(node.data.config));
              onClose();
            }}
          >
            <Copy className="size-4 text-primary-1000 dark:text-primary-0" />
            <span>Copy Config</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">⌘</span>
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">C</span>
            </div>
          </button>


          <button
            onClick={() => { duplicateNode(nodeId); onClose(); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none dark:hover:bg-primary-850"
          >
            <Files className="size-4 text-primary-1000 dark:text-primary-0" />
            <span>Duplicate</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">⌘</span>
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">D</span>
            </div>
          </button>


          <button
            onClick={() => { setIsRenaming(true); setNewName(node.data.label); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none dark:hover:bg-primary-850"
          >
            <Pencil className="size-4 text-primary-1000 dark:text-primary-0" />
            <span>Rename</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-primary-300 bg-primary-150 px-0.5 text-xxs font-medium text-primary-500 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-200">R</span>
            </div>
          </button>


          <button
            onClick={() => { toggleNodeDisabled(nodeId); onClose(); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-primary-150 outline-none dark:hover:bg-primary-850"
          >
            {isDisabled ? (
              <>
                <Eye className="size-4 text-primary-1000 dark:text-primary-0" />
                <span>Enable Node</span>
              </>
            ) : (
              <>
                <EyeOff className="size-4 text-primary-1000 dark:text-primary-0" />
                <span>Disable Node</span>
              </>
            )}
          </button>

          <div className="-mx-1 my-1.5 h-px bg-primary-150 dark:bg-primary-850" />


          <button
            onClick={() => { removeNode(nodeId); onClose(); }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-200 outline-none dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <Trash2 className="size-4 text-red-600 dark:text-red-400" />
            <span>Delete</span>
            <div className="ml-auto flex items-center gap-1">
              <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded border border-red-300 bg-red-100 px-0.5 text-xxs font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400">⌫</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
}
