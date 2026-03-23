"use client";

import { useState } from "react";
import { getWorkflowRun, getWorkflowRuns, type WorkflowRunDetail } from "@/lib/api/workflow-client";
import { useWorkflowStore } from "@/store/workflow-store";
import useSWR from "swr";

const statusBadge: Record<string, string> = {
  PENDING: "bg-zinc-700 text-zinc-200",
  RUNNING: "bg-amber-700/60 text-amber-100",
  SUCCESS: "bg-emerald-700/60 text-emerald-100",
  FAILED: "bg-red-700/60 text-red-100",
  CANCELED: "bg-zinc-700 text-zinc-200",
};

const formatDuration = (start: string, end?: string | null): string => {
  if (!end) {
    return "-";
  }

  const delta = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  if (delta < 1000) {
    return `${delta}ms`;
  }

  return `${(delta / 1000).toFixed(1)}s`;
};

function FormattedPayload({ label, payload }: { label: string; payload: unknown }) {
  if (payload === undefined || payload === null) return null;
  const isObj = typeof payload === "object";
  if (isObj && Object.keys(payload).length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1 rounded bg-black/20 p-1.5 border border-white/[0.03]">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      {isObj ? (
        <div className="flex flex-col gap-1.5 mt-0.5">
          {Object.entries(payload).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-[10px] text-zinc-400/80 font-medium mb-0.5">{k}:</span>
              <span className="text-[11px] text-zinc-300 break-words whitespace-pre-wrap leading-relaxed">
                {typeof v === "string" && v.startsWith("http") ? (
                  <a href={v} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    {v.split("/").pop()?.split("?")[0] || "Link"}
                  </a>
                ) : typeof v === "object" ? (
                  JSON.stringify(v)
                ) : (
                  String(v)
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-zinc-300 break-words whitespace-pre-wrap mt-0.5 leading-relaxed">{String(payload)}</span>
      )}
    </div>
  );
}

export function HistoryPanel() {
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const currentRunId = useWorkflowStore((s) => s.currentRunId);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunDetail | null>(null);

  const { data: runs = [], isValidating: isLoading } = useSWR(
    workflowId ? ["workflow-runs", workflowId] : null,
    ([, id]) => getWorkflowRuns(id as string, 30),
    {
      refreshInterval: 2500,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      revalidateIfStale: false,
    }
  );


  const [prevId, setPrevId] = useState({ workflowId, currentRunId });
  if (prevId.workflowId !== workflowId || prevId.currentRunId !== currentRunId) {
    setSelectedRun(null);
    setPrevId({ workflowId, currentRunId });
  }

  const openRunDetail = async (runId: string) => {
    if (!workflowId) {
      return;
    }

    try {
      const detail = await getWorkflowRun(workflowId, runId);
      setSelectedRun(detail);
    } catch (error) {
      console.error("[HISTORY_RUN_DETAIL]", error);
    }
  };

  const SCOPE_LABELS: Record<string, string> = {
    full: "Full workflow",
    partial: "Selected nodes",
    single: "Single node",
  };

  if (!workflowId) {
    return <p className="text-xs text-zinc-500">Save a workflow to see run history.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Workflow History</h3>

      {isLoading && <p className="text-xs text-zinc-500">Refreshing history...</p>}

      <div className="max-h-[35vh] space-y-2 overflow-y-auto scrollbar-none">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => openRunDetail(run.id)}
            className="w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-900 p-2 text-left transition hover:border-zinc-700"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-300">{new Date(run.startedAt).toLocaleString()}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${statusBadge[run.status]}`}>{run.status}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{SCOPE_LABELS[run.scope] ?? run.scope}</span>
              <span>{formatDuration(run.startedAt, run.completedAt)}</span>
            </div>
          </button>
        ))}

        {!runs.length && !isLoading && <p className="text-xs text-zinc-500">No runs yet.</p>}
      </div>

      {selectedRun && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
          <p className="text-xs font-medium text-zinc-200">Run {selectedRun.id.slice(0, 8)}</p>
          <div className="mt-2 max-h-[45vh] space-y-1 overflow-y-auto scrollbar-none">
            {selectedRun.nodeRuns.map((nodeRun) => (
              <div key={nodeRun.nodeId} className="rounded border border-zinc-800 px-2 py-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">{nodeRun.nodeId}</span>
                  <span className={`rounded px-1.5 py-0.5 uppercase ${statusBadge[nodeRun.status]}`}>{nodeRun.status}</span>
                </div>
                {nodeRun.startedAt && (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    duration: {formatDuration(nodeRun.startedAt, nodeRun.completedAt)}
                  </p>
                )}
                <FormattedPayload label="Inputs" payload={nodeRun.inputs} />
                <FormattedPayload label="Outputs" payload={nodeRun.outputs} />
                {nodeRun.error && <p className="mt-1 text-[11px] text-red-300">{nodeRun.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
