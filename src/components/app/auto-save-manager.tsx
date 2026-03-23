"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflow-store";
import { updateWorkflow } from "@/lib/api/workflow-client";
import { useShallow } from "zustand/react/shallow";

export function AutoSaveManager() {
  const { nodes, edges, workflowId, workflowName, serializeWorkflow } = useWorkflowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      workflowId: state.workflowId,
      workflowName: state.workflowName,
      serializeWorkflow: state.serializeWorkflow,
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const lastSavedJson = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {

    if (!workflowId) return;

    const payload = serializeWorkflow();
    const currentJson = JSON.stringify({
      name: payload.name,
      nodes: payload.nodes,
      edges: payload.edges,
    });


    if (currentJson === lastSavedJson.current) return;


    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }


    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await updateWorkflow(workflowId, payload.name, payload.nodes, payload.edges);
        lastSavedJson.current = currentJson;
        console.log("Auto-save successful");
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [nodes, edges, workflowName, workflowId, serializeWorkflow]);


  if (!isSaving) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/5 text-[10px] font-medium text-zinc-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
      Saving...
    </div>
  );
}
