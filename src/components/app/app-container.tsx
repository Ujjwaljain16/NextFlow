"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Node, Edge } from "reactflow";
import { WorkflowBuilder } from "@/components/app/workflow-builder";
import { Dashboard } from "@/components/dashboard/dashboard";
import { useWorkflowStore } from "@/store/workflow-store";
import { getWorkflowById } from "@/lib/api/workflow-client";

function AppContainerInner() {
  const { workflowId, loadWorkflow, resetWorkflow } = useWorkflowStore();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"dashboard" | "builder">("dashboard");
  const isInitialized = useRef(false);

  const handleSelectWorkflow = useCallback(async (id: string) => {
    try {
      const workflow = await getWorkflowById(id);
      loadWorkflow({
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes as (Node & { type: string })[],
        edges: workflow.edges as Edge[],
      });
      setView("builder");
    } catch (err) {
      console.error("Failed to load workflow:", err);
    }
  }, [loadWorkflow]);

  const handleNewWorkflow = useCallback(() => {
    resetWorkflow();
    setView("builder");
    window.history.pushState({}, "", "/");
  }, [resetWorkflow]);

  const handleBackToDashboard = useCallback(() => {
    setView("dashboard");
    window.history.pushState({}, "", "/");
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    
    const id = searchParams.get("id");
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void handleSelectWorkflow(id);
    } else if (workflowId) {
       
      setView("dashboard");
    }
    
    isInitialized.current = true;
  }, [handleSelectWorkflow, workflowId, searchParams]);

  if (view === "builder") {
    return (
      <div className="relative h-screen w-full">
         <WorkflowBuilder onBackAction={handleBackToDashboard} />
      </div>
    );
  }

  return (
    <Dashboard 
      onSelectWorkflowAction={handleSelectWorkflow} 
      onNewWorkflowAction={handleNewWorkflow} 
    />
  );
}

export function AppContainer() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>}>
      <AppContainerInner />
    </Suspense>
  );
}
