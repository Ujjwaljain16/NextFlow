"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  createWorkflow,
  exportWorkflowJson,
  getWorkflowById,
  importWorkflow,
  runWorkflow,
  updateWorkflow,
} from "@/lib/api/workflow-client";


import { WorkflowListModal } from "@/components/panel/workflow-list-modal";

export function WorkflowTopBar({ onBackAction }: { onBackAction?: () => void }) {
  const {
    workflowId,
    workflowName,
    setWorkflowMeta,
    loadWorkflow,
    serializeWorkflow,
    setCurrentRun,
    nodes,
    selectedNodeId,
  } = useWorkflowStore(
    useShallow((state) => ({
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      setWorkflowMeta: state.setWorkflowMeta,
      loadWorkflow: state.loadWorkflow,
      serializeWorkflow: state.serializeWorkflow,
      setCurrentRun: state.setCurrentRun,
      nodes: state.nodes,
      selectedNodeId: state.selectedNodeId,
    })),
  );

  const [busy, setBusy] = useState<"save" | "load" | "run" | "sample" | "import" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);



  const handleSave = async () => {
    try {
      setBusy("save");
      setError(null);
      setSuccess(null);

      const payload = serializeWorkflow();

      if (!workflowId) {
        const created = await createWorkflow(payload.name, payload.nodes, payload.edges);
        setWorkflowMeta(created.id, payload.name);
      } else {
        await updateWorkflow(workflowId, payload.name, payload.nodes, payload.edges);
      }
      
      setSuccess("Workflow saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workflow");
    } finally {
      setBusy(null);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      setBusy("load");
      setError(null);
      setIsListModalOpen(false);

      const workflow = await getWorkflowById(id);
      loadWorkflow(
        {
          id: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes as Array<{ id: string; type: string; data?: Record<string, unknown>; position?: { x: number; y: number } }>,
          edges: (workflow.edges as Array<{
            id?: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
          }>).map((edge, index) => ({
            ...edge,
            id:
              edge.id ??
              `${edge.source}:${edge.sourceHandle ?? "source"}->${edge.target}:${edge.targetHandle ?? "target"}:${index}`,
          })),
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workflow");
    } finally {
      setBusy(null);
    }
  };

  const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
  const effectiveSelection = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];

  const handleRun = async (scope: "full" | "selected") => {
    if (!workflowId) {
      setError("Save the workflow before running.");
      return;
    }

    try {
      setBusy("run");
      setError(null);

      const run = await runWorkflow(workflowId, scope === "selected" ? effectiveSelection : undefined);
      setCurrentRun(run.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run workflow");
    } finally {
      setBusy(null);
    }
  };



  const handleExport = async () => {
    if (!workflowId) {
      setError("Save workflow before export.");
      return;
    }

    try {
      setBusy("export");
      setError(null);
      const blob = await exportWorkflowJson(workflowId);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${workflowName.replace(/\s+/g, "-").toLowerCase() || "workflow"}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export workflow");
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBusy("import");
      setError(null);

      const text = await file.text();
      const parsed = JSON.parse(text) as {
        name: string;
        nodes: Array<{ id: string; type: string; data: Record<string, unknown>; position: { x: number; y: number } }>;
        edges: Array<{ id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
      };

      const imported = await importWorkflow({
        name: parsed.name,
        nodes: parsed.nodes,
        edges: parsed.edges.map((edge, index) => ({
          ...edge,
          id:
            edge.id ??
            `${edge.source}:${edge.sourceHandle ?? "source"}->${edge.target}:${edge.targetHandle ?? "target"}:${index}`,
        })),
      });

      const workflow = await getWorkflowById(imported.id);
      loadWorkflow(
        {
          id: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes as Array<{ id: string; type: string; data?: Record<string, unknown>; position?: { x: number; y: number } }>,
          edges: (workflow.edges as Array<{
            id?: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
          }>).map((edge, index) => ({
            ...edge,
            id:
              edge.id ??
              `${edge.source}:${edge.sourceHandle ?? "source"}->${edge.target}:${edge.targetHandle ?? "target"}:${index}`,
          })),
        }
      );
      setWorkflowMeta(workflow.id, workflow.name);
      event.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import workflow");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex w-full items-start justify-between p-4 pointer-events-none relative z-50">

      <WorkflowListModal 
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onSelect={handleLoad}
      />


      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          handleImportFile(e);
          setIsMenuOpen(false);
        }}
      />


      <div className="pointer-events-auto relative">
        <div className="bg-[#1A1A1B] border border-white/5 flex items-center rounded-xl py-1.5 pr-2.5 pl-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="hover:bg-white/10 flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors duration-150 text-[#DBDBDB] outline-none"
          >
            <svg aria-label="Krea Logo" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.34 1.266c1.766-.124 3.324 1.105 3.551 2.802.216 1.612-.887 3.171-2.545 3.536-.415.092-.877.066-1.317.122a4.63 4.63 0 0 0-2.748 1.34l-.008.004-.01-.001-.006-.005-.003-.009q0-.009.005-.016a.04.04 0 0 0 .007-.022 438 438 0 0 1-.01-4.541c.003-1.68 1.33-3.086 3.085-3.21"></path>
              <path d="M8.526 15.305c-2.247-.018-3.858-2.23-3.076-4.3a3.31 3.31 0 0 1 2.757-2.11c.384-.04.845-.03 1.215-.098 1.9-.353 3.368-1.806 3.665-3.657.066-.41.031-.9.128-1.335.449-2.016 2.759-3.147 4.699-2.236 1.011.476 1.69 1.374 1.857 2.447q.051.33.034.818c-.22 5.842-5.21 10.519-11.279 10.47m2.831.93a.04.04 0 0 1-.021-.02l-.001-.006.002-.006q0-.003.003-.004l.006-.003q3.458-.792 5.992-3.185.045-.042.083.007c.27.357.554.74.78 1.106a10.6 10.6 0 0 1 1.585 4.89q.037.53.023.819c-.084 1.705-1.51 3.08-3.31 3.09-1.592.01-2.992-1.077-3.294-2.597-.072-.36-.05-.858-.11-1.238q-.282-1.755-1.715-2.84zm-3.369 6.64c-1.353-.235-2.441-1.286-2.684-2.593a5 5 0 0 1-.05-.817V15.14q0-.021.016-.007c.884.786 1.814 1.266 3.028 1.346l.326.01c1.581.051 2.92 1.087 3.229 2.592.457 2.225-1.557 4.195-3.865 3.793"></path>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-0.5 transition-transform duration-150 ${isMenuOpen ? "rotate-180 opacity-100" : "opacity-50"}`}>
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>

          <div className="flex items-center ml-1 relative">
            <span className="invisible px-2 text-sm font-medium whitespace-pre pointer-events-none select-none">
              {workflowName || "Untitled Workflow"}
            </span>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowMeta(workflowId, e.target.value)}
              placeholder="Untitled Workflow"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-full font-medium hover:bg-white/5 focus:bg-white/10 rounded-md px-2 text-sm text-[#E0E0E0] placeholder:text-[#666666] bg-transparent outline-none transition-colors"
            />
          </div>
        </div>


        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-[calc(100%+8px)] left-0 w-[220px] z-50 bg-[#1A1A1B] border border-[#333333] rounded-xl shadow-2xl flex flex-col gap-1 px-2 py-3 cursor-default">


              <button
                type="button"
                className="hover:bg-[#2A2A2B] flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-[#E0E0E0]"
                onClick={() => { 
                   setIsMenuOpen(false); 
                   if (onBackAction) onBackAction();
                   else window.location.href = "/"; 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
                <span className="font-medium">Back to Sessions</span>
              </button>


              <button
                type="button"
                className="hover:bg-[#2A2A2B] disabled:opacity-40 flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-[#E0E0E0]"
                onClick={() => { setIsMenuOpen(false); setIsListModalOpen(true); }}
                disabled={busy !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="m3 15 3-3 3 3" />
                  <path d="M6 18v-6" />
                </svg>
                <span className="font-medium">Load Workflow</span>
              </button>


              <button
                type="button"
                className="hover:bg-[#2A2A2B] disabled:opacity-40 flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-[#E0E0E0]"
                onClick={() => { setIsMenuOpen(false); handleSave(); }}
                disabled={busy !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span className="font-medium">Save Workflow</span>
              </button>


              <button
                type="button"
                className="hover:bg-[#2A2A2B] disabled:opacity-40 flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-[#E0E0E0]"
                onClick={() => { importInputRef.current?.click(); }}
                disabled={busy !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" x2="12" y1="3" y2="15"></line>
                </svg>
                <span className="font-medium">Import JSON</span>
              </button>


              <button
                type="button"
                className="hover:bg-[#2A2A2B] disabled:opacity-40 flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-[#E0E0E0]"
                onClick={() => { setIsMenuOpen(false); handleExport(); }}
                disabled={busy !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                <span className="font-medium">Export JSON</span>
              </button>

              <div className="w-full h-px bg-[#333333] my-1" />


              <button
                type="button"
                className="hover:bg-[#2A2A2B] disabled:opacity-40 flex items-center w-full gap-2 rounded-md px-2 py-2.5 text-[13px] transition-colors duration-100 ease-out text-white bg-white/5 border border-white/10 mt-1"
                onClick={() => { setIsMenuOpen(false); handleRun(effectiveSelection.length > 0 ? "selected" : "full"); }}
                disabled={busy !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span className="font-medium">
                  {busy === "run" ? "Running..." : effectiveSelection.length > 0 ? "Run Selected" : "Run Workflow"}
                </span>
              </button>

            </div>
          </>
        )}
      </div>


      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy !== null}
          title="Save workflow"
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#1A1A1B] border border-white/5 px-3 py-2 text-[12px] font-medium text-zinc-300 hover:bg-[#252527] hover:text-white disabled:opacity-40 transition-all duration-150 shadow-xl"
        >
          {busy === "save" ? (
            <div className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
          )}
          Save
        </button>

        <button
          type="button"
          onClick={() => handleRun(effectiveSelection.length > 0 ? "selected" : "full")}
          disabled={busy !== null}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#fcc800] px-4 py-2 text-[12px] font-semibold text-black hover:bg-[#ffd633] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-[#fcc80033]"
        >
          {busy === "run" ? (
            <div className="size-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          {busy === "run" ? "Running..." : effectiveSelection.length > 0 ? "Run Selected" : "Run"}
        </button>
      </div>

      {error && <p className="absolute left-1/2 top-20 -translate-x-1/2 rounded-md bg-red-900/80 backdrop-blur-md px-4 py-2 text-[12px] text-red-100 shadow-xl border border-red-500/30 pointer-events-none">{error}</p>}
      {success && <p className="absolute left-1/2 top-20 -translate-x-1/2 rounded-md bg-emerald-900/80 backdrop-blur-md px-4 py-2 text-[12px] text-emerald-100 shadow-xl border border-emerald-500/30 pointer-events-none">{success}</p>}
    </div>
  );
}


