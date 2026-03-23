import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "reactflow";
import type { ExecutionStatus, UINodeDefinition } from "@/lib/types/workflow-ui";

export interface WorkflowNodeData {
  definitionId: string;
  label: string;
  config: Record<string, unknown>;
  status: ExecutionStatus;
  lastOutput?: unknown;
  lastError?: string;
  disabled?: boolean;
}

export interface SerializableWorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: XYPosition;
}

interface WorkflowState {
  nodes: Array<Node<WorkflowNodeData>>;
  edges: Edge[];
  selectedNodeId: string | null;
  workflowId: string | null;
  workflowName: string;
  currentRunId: string | null;
  currentRunStatus: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELED" | null;
  canUndo: boolean;
  canRedo: boolean;
  addNode: (definition: UINodeDefinition, position: XYPosition) => void;
  updateNode: (nodeId: string, patch: Partial<WorkflowNodeData["config"]>) => void;
  renameNode: (nodeId: string, newLabel: string) => void;
  duplicateNode: (nodeId: string) => void;
  toggleNodeDisabled: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
  connectNodes: (connection: Connection) => void;
  setSelectedNode: (nodeId: string | null) => void;
  removeEdge: (edgeId: string) => void;
  setWorkflowMeta: (workflowId: string | null, workflowName: string) => void;
  setCurrentRun: (runId: string | null) => void;
  setCurrentRunStatus: (status: WorkflowState["currentRunStatus"]) => void;
  rightPanelTab: "history" | "hidden";
  setRightPanelTab: (tab: "history" | "hidden") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  canvasMode: "select" | "pan" | "cut";
  setCanvasMode: (mode: "select" | "pan" | "cut") => void;
  setNodeStatuses: (
    nodeRuns: Array<{
      nodeId: string;
      status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
      outputs?: unknown;
      error?: string | null;
    }>,
  ) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  loadWorkflow: (
    payload: {
      id?: string;
      name?: string;
      nodes: Array<{ id: string; type: string; data?: Record<string, unknown>; position?: XYPosition }>;
      edges: Edge[];
    },
    registryMap?: Record<string, UINodeDefinition>,
  ) => void;
  serializeWorkflow: () => { name: string; nodes: SerializableWorkflowNode[]; edges: Edge[] };
  resetWorkflow: () => void;
  _past: WorkflowSnapshot[];
  _future: WorkflowSnapshot[];
}

const DEFAULT_NODE_STATUS: ExecutionStatus = "IDLE";
const MAX_HISTORY = 80;

interface WorkflowSnapshot {
  nodes: Array<Node<WorkflowNodeData>>;
  edges: Edge[];
}

const makeNodeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `node-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  workflowId: null,
  workflowName: "Untitled Workflow",
  currentRunId: null,
  currentRunStatus: null,
  canUndo: false,
  canRedo: false,
  rightPanelTab: "hidden",
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  canvasMode: "select",
  setCanvasMode: (mode) => set({ canvasMode: mode }),

  _past: [],
  _future: [],

      addNode: (definition, position) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        const newNode: Node<WorkflowNodeData> = {
          id: makeNodeId(),
          type: "workflowNode",
          position,
          data: {
            definitionId: definition.id,
            label: definition.name,
            config: {},
            status: DEFAULT_NODE_STATUS,
            lastOutput: undefined,
            lastError: undefined,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
          selectedNodeId: newNode.id,
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      updateNode: (nodeId, patch) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  ...patch,
                },
              },
            };
          }),
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      removeNode: (nodeId) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      renameNode: (nodeId, newLabel) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, label: newLabel } }
              : node
          ),
          _past: nextPast,
          _future: [],
          canUndo: true,
          canRedo: false,
        }));
      },

      duplicateNode: (nodeId) => {
        const state = get();
        const sourceNode = state.nodes.find((n) => n.id === nodeId);
        if (!sourceNode) return;

        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);
        const newNode: Node<WorkflowNodeData> = {
          ...sourceNode,
          id: makeNodeId(),
          position: {
            x: sourceNode.position.x + 40,
            y: sourceNode.position.y + 40,
          },
          selected: true,
        } as Node<WorkflowNodeData>;

        set((state) => ({
          nodes: (state.nodes.map((n) => ({ ...n, selected: false })) as Node<WorkflowNodeData>[]).concat([newNode]),
          selectedNodeId: newNode.id,
          _past: nextPast,
          _future: [],
          canUndo: true,
          canRedo: false,
        }));
      },

      toggleNodeDisabled: (nodeId) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, disabled: !node.data.disabled } }
              : node
          ),
          _past: nextPast,
          _future: [],
          canUndo: true,
          canRedo: false,
        }));
      },

      connectNodes: (connection) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        // PRD specifies animated purple edges
        const EDGE_COLOR = "rgb(168, 85, 247)";

        set((state) => ({
          edges: addEdge(
            {
              ...connection,
              animated: true,
              type: "custom",
              style: { stroke: EDGE_COLOR, strokeWidth: 2 },
            },
            state.edges,
          ),
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      setSelectedNode: (nodeId) => set({
        selectedNodeId: nodeId,
        rightPanelTab: nodeId ? "history" : "hidden",
      }),

      removeEdge: (edgeId) => {
        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);
        set({
          edges: state.edges.filter((e) => e.id !== edgeId),
          _past: nextPast,
          _future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      setWorkflowMeta: (workflowId, workflowName) => set({ workflowId, workflowName }),

      setCurrentRun: (runId) => set({ currentRunId: runId }),

      setCurrentRunStatus: (status) => set({ currentRunStatus: status }),

      setNodeStatuses: (nodeRuns) => {
        const statusMap = new Map(nodeRuns.map((run) => [run.nodeId, run.status]));
        const outputMap = new Map(nodeRuns.map((run) => [run.nodeId, run.outputs]));
        const errorMap = new Map(nodeRuns.map((run) => [run.nodeId, run.error]));

        set((state) => ({
          nodes: state.nodes.map((node) => {
            const status = statusMap.get(node.id);
            if (!status) return { ...node, data: { ...node.data, status: "IDLE" } };
            return {
              ...node,
              data: {
                ...node.data,
                status,
                lastOutput: outputMap.get(node.id) ?? node.data.lastOutput,
                lastError: errorMap.get(node.id) ?? undefined,
              },
            };
          }),
        }));
      },

      onNodesChange: (changes) => {
        const meaningful = changes.some((change) => change.type !== "select");
        if (!meaningful) {
          set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes),
          }));
          return;
        }

        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      onEdgesChange: (changes) => {
        const meaningful = changes.some((change) => change.type !== "select");
        if (!meaningful) {
          set((state) => ({
            edges: applyEdgeChanges(changes, state.edges),
          }));
          return;
        }

        const state = get();
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
          _past: nextPast,
          _future: [],
          canUndo: nextPast.length > 0,
          canRedo: false,
        }));
      },

      undo: () => {
        const state = get();
        const past = state._past;
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const rest = past.slice(0, -1);
        const future = [{ nodes: state.nodes, edges: state.edges }, ...state._future].slice(0, MAX_HISTORY);

        set({
          nodes: previous.nodes,
          edges: previous.edges,
          _past: rest,
          _future: future,
          canUndo: rest.length > 0,
          canRedo: future.length > 0,
        });
      },

      redo: () => {
        const state = get();
        const future = state._future;
        if (future.length === 0) return;

        const next = future[0];
        const remaining = future.slice(1);
        const past = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);

        set({
          nodes: next.nodes,
          edges: next.edges,
          _past: past,
          _future: remaining,
          canUndo: past.length > 0,
          canRedo: remaining.length > 0,
        });
      },

      clearCanvas: () => {
        const state = get();
        if (state.nodes.length === 0) return;
        
        const nextPast = [...state._past, { nodes: state.nodes, edges: state.edges }].slice(-MAX_HISTORY);
        
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          _past: nextPast,
          _future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      loadWorkflow: (payload) => {
        const nodes = payload.nodes
          .map((node) => ({
            id: node.id,
            type: "workflowNode",
            position: node.position ?? { x: 100, y: 100 },
            data: {
              definitionId: node.type,
              label: node.id,
              config: (node.data ?? {}) as Record<string, unknown>,
              status: "IDLE",
              lastOutput: undefined,
              lastError: undefined,
            },
          } as Node<WorkflowNodeData>))
          .filter((node): node is Node<WorkflowNodeData> => node !== null);

        // PRD specifies animated purple edges
        const EDGE_COLOR = "rgb(168, 85, 247)";
        const edges = payload.edges.map((edge) => ({
          ...edge,
          animated: true,
          type: "custom",
          style: { stroke: EDGE_COLOR, strokeWidth: 2 },
        }));

        set({
          workflowId: payload.id ?? null,
          workflowName: payload.name ?? "Untitled Workflow",
          nodes,
          edges,
          selectedNodeId: null,
          currentRunId: null,
          currentRunStatus: null,
          canUndo: false,
          canRedo: false,
          _past: [],
          _future: [],
        });
      },

      serializeWorkflow: () => {
        const state = get();

        return {
          name: state.workflowName,
          nodes: state.nodes.map((node) => ({
            id: node.id,
            type: node.data.definitionId,
            data: node.data.config,
            position: node.position,
          })),
          edges: state.edges,
        };
      },

      resetWorkflow: () => {
        set({
          workflowId: null,
          workflowName: "Untitled Workflow",
          nodes: [],
          edges: [],
          selectedNodeId: null,
          currentRunId: null,
          currentRunStatus: null,
          canUndo: false,
          canRedo: false,
          _past: [],
          _future: [],
        });
      },
    }),
    {
      name: "nextflow-workflow-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        sidebarCollapsed: state.sidebarCollapsed,
        canvasMode: state.canvasMode,
        currentRunId: state.currentRunId,
      }),
    }
  )
);
