"use client";

import { NodeRendererComponent } from "@/components/nodes/node-renderer";
import { CustomEdge } from "./custom-edge";
import type { EdgeTypes, NodeTypes } from "reactflow";

export const nodeTypesGlobal: NodeTypes = {
  workflowNode: NodeRendererComponent,
};

export const edgeTypesGlobal: EdgeTypes = {
  custom: CustomEdge,
};
