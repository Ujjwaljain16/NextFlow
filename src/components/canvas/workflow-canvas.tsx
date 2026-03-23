"use client";

import React, { useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ConnectionMode,
  type Connection,
  type Viewport,
  type Node as RFNode,
  type Edge as RFEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { useShallow } from "zustand/react/shallow";
import { useWorkflowStore } from "@/store/workflow-store";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";
import { CanvasToolbar } from "./canvas-toolbar";
import { CanvasEmptyState } from "./canvas-empty-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { NodePicker } from "./node-picker";
import { CanvasErrorBoundary } from "@/components/error-boundary";
import { useState, useRef } from "react";
import { NodeContextMenu } from "./node-context-menu";
import { NodeDefinitionProvider } from "@/components/nodes/node-definition-context";

interface WorkflowCanvasProps {
  definitions: UINodeDefinition[];
}

// Node and edge types are defined outside the component to ensure total reference stability
import { nodeTypesGlobal, edgeTypesGlobal } from "./flow-types";

export function WorkflowCanvas({ definitions }: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const lastClickTime = useRef<number>(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useKeyboardShortcuts({
      onAddNode: () => {
        setPickerPos({ x: mousePos.current.x, y: mousePos.current.y });
      }
  });

  const { nodes, edges, onNodesChange, onEdgesChange, connectNodes, setSelectedNode, removeNode, addNode, canvasMode } = useWorkflowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      connectNodes: state.connectNodes,
      setSelectedNode: state.setSelectedNode,
      removeNode: state.removeNode,
      addNode: state.addNode,
      canvasMode: state.canvasMode,
    })),
  );

  // In cut mode: clicking an edge removes it
  const removeEdge = useWorkflowStore((s) => s.removeEdge);

  const definitionMap = useMemo(() => {
    return Object.fromEntries(definitions.map((definition) => [definition.id, definition]));
  }, [definitions]);

  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return false;
      }

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      const sourceDef = definitionMap[sourceNode.data.definitionId];
      const targetDef = definitionMap[targetNode.data.definitionId];

      if (!sourceDef || !targetDef) {
        return false;
      }

      const sourceHandle = sourceDef.outputs.find((handle) => handle.id === connection.sourceHandle);
      const targetHandle = targetDef.inputs.find((handle) => handle.id === connection.targetHandle);

      if (!sourceHandle || !targetHandle) {
        return false;
      }

      if (sourceHandle.type === targetHandle.type) {
        // ── DAG cycle check ──────────────────────────────────────────────────
        // DFS from target along existing edges to prevent cycles
        const buildAdj = () => {
          const adj: Record<string, string[]> = {};
          for (const n of nodes) adj[n.id] = [];
          for (const e of edges) {
            if (e.source && e.target) {
              adj[e.source] = adj[e.source] ?? [];
              adj[e.source].push(e.target);
            }
          }
          return adj;
        };
        const adj = buildAdj();
        const reachableFromTarget = new Set<string>();
        const dfs = (nodeId: string) => {
          if (reachableFromTarget.has(nodeId)) return;
          reachableFromTarget.add(nodeId);
          for (const neighbour of (adj[nodeId] ?? [])) dfs(neighbour);
        };
        dfs(connection.target);
        if (reachableFromTarget.has(connection.source)) {
          return false; // Would create a cycle
        }
        return true;
      }

      return sourceHandle.type === "image" && targetHandle.type === "image_array";
    },
    [definitionMap, edges, nodes],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      type: "custom",
      style: {
        stroke: "rgb(168, 85, 247)", // purple-500 — per PRD spec
        strokeWidth: 2,
      },
    }),
    [],
  );

  const defaultViewport = useMemo<Viewport>(
    () => ({
      x: 0,
      y: 0,
      zoom: 1.2,
    }),
    [],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const definitionId = event.dataTransfer.getData("application/x-nextflow-node");
      if (!definitionId) return;

      const definition = definitions.find((item) => item.id === definitionId);
      if (!definition) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(definition, position);
    },
    [definitions, screenToFlowPosition, addNode],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      if (canvasMode === "cut") {
        removeNode(node.id);
        return;
      }
      setSelectedNode(node.id);
    },
    [setSelectedNode, canvasMode, removeNode],
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(null);
    setPickerPos({ x: event.clientX, y: event.clientY });
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode) => {
    event.preventDefault();
    setPickerPos(null);
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    const now = Date.now();
    setContextMenu(null);
    if (now - lastClickTime.current < 300) {
      // Double click
      setPickerPos({ x: event.clientX, y: event.clientY });
    } else {
      setSelectedNode(null);
    }
    lastClickTime.current = now;
  }, [setSelectedNode]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: RFEdge) => {
      if (canvasMode === "cut") {
        removeEdge(edge.id);
      }
    },
    [canvasMode, removeEdge]
  );

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    mousePos.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onNodeSelect = (definition: UINodeDefinition) => {
    if (pickerPos) {
      const position = screenToFlowPosition({
        x: pickerPos.x,
        y: pickerPos.y,
      });
      addNode(definition, position);
    }
    setPickerPos(null);
  };

  const nodeTypes = useMemo(() => nodeTypesGlobal, []);
  const edgeTypes = useMemo(() => edgeTypesGlobal, []);

  return (
    <div
      className="relative h-full w-full bg-[#0b0b0f]"
      style={{ cursor: canvasMode === "cut" ? "crosshair" : "default" }}
      onMouseMove={onMouseMove}
    >
      <NodeDefinitionProvider definitions={definitions}>
        <CanvasErrorBoundary>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={defaultViewport}
          fitView
          panOnDrag={canvasMode === "pan"}
          selectionOnDrag={canvasMode === "select"}
          panOnScroll={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connectNodes}
          isValidConnection={isValidConnection}
          deleteKeyCode={["Backspace", "Delete"]}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onEdgeClick={onEdgeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodesDelete={(deleted) => deleted.forEach((node) => removeNode(node.id))}
          defaultEdgeOptions={defaultEdgeOptions}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          connectionMode={ConnectionMode.Loose}
        >
          {/* Subtle background dot grid matching Krea */}
          <Background variant={BackgroundVariant.Dots} color="#333333" gap={20} size={1.5} />

          {/* Mini map - styled to match dark theme */}
          <MiniMap
            pannable
            zoomable
            className="bg-[#111]! border-[#333]! rounded-xl!"
            nodeColor="#333"
            nodeStrokeColor="#222"
            maskColor="rgba(0,0,0,0.5)"
          />

          {/* Hide default controls - use custom floating controls instead */}
          <Controls style={{ display: "none" }} />
        </ReactFlow>
      </CanvasErrorBoundary>
    </NodeDefinitionProvider>


      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}


      {pickerPos && (
        <NodePicker
          x={pickerPos.x}
          y={pickerPos.y}
          definitions={definitions}
          onSelect={onNodeSelect}
          onClose={() => setPickerPos(null)}
        />
      )}


      {nodes.length === 0 && <CanvasEmptyState />}


      <CanvasToolbar />
    </div>
  );
}
