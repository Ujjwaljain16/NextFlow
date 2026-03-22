import type { Edge } from "reactflow";
import type { NodeCatalogResponse } from "@/lib/types/workflow-ui";

export interface WorkflowPayload {
  id: string;
  name: string;
  nodes: unknown;
  edges: unknown;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { runs: number };
  nodeCount: number;
  nodes?: Array<{ id: string; position: { x: number; y: number } }>;
  edges?: Array<{ source: string; target: string }>;
}

export interface WorkflowNodePayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowRunDetail {
  id: string;
  workflowId: string;
  startedAt?: string;
  completedAt?: string | null;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELED";
  nodeRuns: Array<{
    nodeId: string;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
    inputs?: unknown;
    outputs?: unknown;
    error?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
}

export interface WorkflowRunSummary {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELED";
  scope: string;
  startedAt: string;
  completedAt?: string | null;
  _count: {
    nodeRuns: number;
  };
}

const ensureSuccess = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    const fallback = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  return response;
};

export const fetchNodeCatalog = async (): Promise<NodeCatalogResponse> => {
  const response = await fetch("/api/nodes", {
    method: "GET",
    cache: "no-store",
  });

  await ensureSuccess(response);
  return (await response.json()) as NodeCatalogResponse;
};

export const createWorkflow = async (
  name: string,
  nodes: WorkflowNodePayload[],
  edges: Edge[],
): Promise<{ id: string }> => {
  const response = await fetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, nodes, edges }),
  });

  await ensureSuccess(response);
  return (await response.json()) as { id: string };
};

export const updateWorkflow = async (
  id: string,
  name: string,
  nodes: WorkflowNodePayload[],
  edges: Edge[],
): Promise<void> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, nodes, edges }),
  });

  await ensureSuccess(response);
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "DELETE",
  });

  await ensureSuccess(response);
};

export const renameWorkflow = async (id: string, name: string): Promise<void> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  await ensureSuccess(response);
};

export const getWorkflowById = async (id: string): Promise<WorkflowPayload> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  await ensureSuccess(response);
  return (await response.json()) as WorkflowPayload;
};

export const getWorkflows = async (): Promise<WorkflowListItem[]> => {
  const response = await fetch("/api/workflows", {
    method: "GET",
    cache: "no-store",
  });

  await ensureSuccess(response);
  const data = await response.json();
  return data.workflows as WorkflowListItem[];
};

export const runWorkflow = async (id: string, selectedNodeIds?: string[], isolated?: boolean): Promise<{ runId: string }> => {
  const response = await fetch(`/api/workflows/${id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(selectedNodeIds && selectedNodeIds.length > 0 ? { selectedNodeIds } : {}),
      ...(isolated ? { isolated } : {}),
    }),
  });

  await ensureSuccess(response);
  return (await response.json()) as { runId: string };
};

export const getWorkflowRun = async (workflowId: string, runId: string): Promise<WorkflowRunDetail> => {
  const response = await fetch(`/api/workflows/${workflowId}/runs/${runId}`, {
    method: "GET",
    cache: "no-store",
  });

  await ensureSuccess(response);
  return (await response.json()) as WorkflowRunDetail;
};

export const getWorkflowRuns = async (workflowId: string, limit = 30): Promise<WorkflowRunSummary[]> => {
  const response = await fetch(`/api/workflows/${workflowId}/runs?limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });

  await ensureSuccess(response);
  const body = (await response.json()) as { runs: WorkflowRunSummary[] };
  return body.runs;
};

export const importWorkflow = async (payload: {
  name: string;
  nodes: WorkflowNodePayload[];
  edges: Edge[];
}): Promise<{ id: string }> => {
  const response = await fetch("/api/workflows/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await ensureSuccess(response);
  return (await response.json()) as { id: string };
};

export const exportWorkflowJson = async (id: string): Promise<Blob> => {
  const response = await fetch(`/api/workflows/${id}/export`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Export failed with ${response.status}`);
  }

  return await response.blob();
};

export const uploadAssetToTransloadit = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/transloadit", {
    method: "POST",
    body: formData,
  });

  await ensureSuccess(response);
  const body = (await response.json()) as { url: string };
  return body.url;
};
