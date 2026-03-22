"use client";

import { memo } from "react";
import { type NodeProps } from "reactflow";
import { useWorkflowStore, type WorkflowNodeData } from "@/store/workflow-store";
import { BaseNodeComponent } from "./base-node";
import {
  TextNodeComponent,
  UploadImageNodeComponent,
  UploadVideoNodeComponent,
  LLMNodeComponent,
  CropImageNodeComponent,
  ExtractFrameNodeComponent,
} from "./specialized-nodes";

// Map definition ID → specialized renderer
const SPECIALIZED: Record<string, React.ComponentType<NodeProps<WorkflowNodeData>>> = {
  "core.text": TextNodeComponent,
  "core.upload_image": UploadImageNodeComponent,
  "core.upload_video": UploadVideoNodeComponent,
  "core.llm": LLMNodeComponent,
  "core.crop_image": CropImageNodeComponent,
  "core.extract_frame": ExtractFrameNodeComponent,
};

function NodeRenderer(props: NodeProps<WorkflowNodeData>) {
  const updateNode = useWorkflowStore((state) => state.updateNode);

  const handleConfigChange = (key: string, value: unknown) => {
    updateNode(props.id, { [key]: value });
  };

  const definitionId = props.data?.definitionId;
  const SpecializedComponent = definitionId ? SPECIALIZED[definitionId] : undefined;
  const isDisabled = props.data?.disabled;

  return (
    <div className={`transition-opacity duration-200 ${isDisabled ? "opacity-30 grayscale" : "opacity-100"}`}>
      {SpecializedComponent ? (
        <SpecializedComponent {...props} />
      ) : (
        <BaseNodeComponent {...props} onConfigChange={handleConfigChange} />
      )}
    </div>
  );
}

export const NodeRendererComponent = memo(NodeRenderer);
