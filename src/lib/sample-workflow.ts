import type { Edge } from "reactflow";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";

interface SampleNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface SampleWorkflowPayload {
  name: string;
  nodes: SampleNode[];
  edges: Edge[];
}

const requireNode = (definitions: UINodeDefinition[], id: string): UINodeDefinition => {
  const node = definitions.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Missing node definition: ${id}`);
  }

  return node;
};

export const buildSampleWorkflow = (definitions: UINodeDefinition[]): SampleWorkflowPayload => {
  requireNode(definitions, "core.text");
  requireNode(definitions, "core.upload_image");
  requireNode(definitions, "core.upload_video");
  requireNode(definitions, "core.crop_image");
  requireNode(definitions, "core.extract_frame");
  requireNode(definitions, "core.llm");

  const nodes: SampleNode[] = [
    {
      id: "upload-image-1",
      type: "core.upload_image",
      position: { x: 100, y: 140 },
      data: { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80" },
    },
    {
      id: "crop-image-1",
      type: "core.crop_image",
      position: { x: 380, y: 140 },
      data: { x_percent: 10, y_percent: 10, width_percent: 80, height_percent: 80 },
    },
    {
      id: "text-system-1",
      type: "core.text",
      position: { x: 80, y: 20 },
      data: { text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description." },
    },
    {
      id: "text-user-1",
      type: "core.text",
      position: { x: 80, y: 300 },
      data: { text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design." },
    },
    {
      id: "llm-branch-a",
      type: "core.llm",
      position: { x: 690, y: 160 },
      data: { model: "gemini-2.5-flash" },
    },
    {
      id: "upload-video-1",
      type: "core.upload_video",
      position: { x: 110, y: 520 },
      data: { url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    },
    {
      id: "extract-frame-1",
      type: "core.extract_frame",
      position: { x: 390, y: 520 },
      data: { timestamp: "00:00:01.000" },
    },
    {
      id: "text-system-2",
      type: "core.text",
      position: { x: 860, y: 20 },
      data: { text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame." },
    },
    {
      id: "llm-final",
      type: "core.llm",
      position: { x: 1050, y: 300 },
      data: { model: "gemini-2.5-flash" },
    },
  ];

  const edges: Edge[] = [
    { id: "e1", source: "upload-image-1", target: "crop-image-1", sourceHandle: "image_url", targetHandle: "image_url", animated: true },
    { id: "e2", source: "crop-image-1", target: "llm-branch-a", sourceHandle: "output", targetHandle: "images", animated: true },
    { id: "e3", source: "text-system-1", target: "llm-branch-a", sourceHandle: "text", targetHandle: "system_prompt", animated: true },
    { id: "e4", source: "text-user-1", target: "llm-branch-a", sourceHandle: "text", targetHandle: "user_message", animated: true },
    { id: "e5", source: "upload-video-1", target: "extract-frame-1", sourceHandle: "video_url", targetHandle: "video_url", animated: true },
    { id: "e6", source: "crop-image-1", target: "llm-final", sourceHandle: "output", targetHandle: "images", animated: true },
    { id: "e7", source: "extract-frame-1", target: "llm-final", sourceHandle: "output", targetHandle: "images", animated: true },
    { id: "e8", source: "text-system-2", target: "llm-final", sourceHandle: "text", targetHandle: "system_prompt", animated: true },
    { id: "e9", source: "llm-branch-a", target: "llm-final", sourceHandle: "output", targetHandle: "user_message", animated: true },
  ];

  return {
    name: "Sample: Product Marketing Kit Generator",
    nodes,
    edges,
  };
};
