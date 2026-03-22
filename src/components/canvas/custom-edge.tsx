"use client";

import { memo } from "react";
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from "reactflow";
import { useWorkflowStore } from "@/store/workflow-store";

export const CustomEdge = memo(function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const canvasMode = useWorkflowStore((s) => s.canvasMode);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.5, // slightly more curve for a premium feel
  });

  const isCutMode = canvasMode === "cut";
  const isActive = selected || isCutMode;

  // Extract stroke color from style to compute glow
  const strokeColor = (style?.stroke as string) ?? "rgb(255,200,0)";

  return (
    <>
      {/* Subtle soft glow layer — barely visible, adds depth */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeOpacity={isActive ? 0.12 : 0.06}
        style={{ filter: `blur(4px)`, transition: "stroke-opacity 0.15s ease" }}
        pointerEvents="none"
      />

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 2,
          opacity: isActive ? 0.9 : 0.35,
          cursor: isCutMode ? "crosshair" : "pointer",
          transition: "opacity 0.12s ease, stroke-width 0.1s ease",
        }}
        markerEnd={markerEnd}
      />

      {/* Wide invisible click/hover target */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={28}
        fill="none"
        className="react-flow__edge-interaction"
      />

      {/* Midpoint delete dot — shown on selected or cut mode */}
      <EdgeLabelRenderer>
        {isActive && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEdge(id);
              }}
              className="group flex items-center justify-center w-6 h-6 rounded-full border-2 border-white/60 bg-black/90 hover:bg-red-500 hover:border-red-300 transition-all duration-150 shadow-xl"
              title="Delete connection"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});
