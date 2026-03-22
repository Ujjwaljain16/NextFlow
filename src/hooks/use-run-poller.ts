"use client";

import { useEffect } from "react";
import { getWorkflowRun } from "@/lib/api/workflow-client";
import { useWorkflowStore } from "@/store/workflow-store";

const TERMINAL_STATUSES = new Set(["SUCCESS", "FAILED", "PARTIAL", "CANCELED"]);
const POLL_INTERVAL = 2000;

export const useRunPoller = () => {
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const currentRunId = useWorkflowStore((s) => s.currentRunId);
  const setNodeStatuses = useWorkflowStore((s) => s.setNodeStatuses);
  const setCurrentRunStatus = useWorkflowStore((s) => s.setCurrentRunStatus);
  const setCurrentRun = useWorkflowStore((s) => s.setCurrentRun);

  useEffect(() => {
    if (!workflowId || !currentRunId) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;

      try {
        const run = await getWorkflowRun(workflowId, currentRunId);
        if (cancelled) return;

        setCurrentRunStatus(run.status);
        setNodeStatuses(
          run.nodeRuns.map((nodeRun) => ({
            nodeId: nodeRun.nodeId,
            status: nodeRun.status,
            outputs: nodeRun.outputs,
            error: nodeRun.error,
          })),
        );

        // Stop polling once the run reaches a terminal state
        if (TERMINAL_STATUSES.has(run.status)) {
          setCurrentRun(null); // Clear the run to stop polling
          return;
        }
      } catch (error) {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("[useRunPoller] Poll error:", error);
        }
        // If the run is not found (404), stop polling
        if (error instanceof Error && (error.message.includes("404") || error.message.includes("NOT_FOUND"))) {
          setCurrentRun(null);
          return;
        }
      }

      // Schedule next poll only if still active and not terminal
      if (!cancelled) {
        timeoutId = setTimeout(poll, POLL_INTERVAL);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [workflowId, currentRunId, setNodeStatuses, setCurrentRunStatus, setCurrentRun]);
};
