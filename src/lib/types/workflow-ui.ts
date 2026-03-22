export type NodeValueType = "text" | "image" | "video" | "image_array" | "unknown";

export interface NodeHandleDescriptor {
  id: string;
  name: string;
  type: NodeValueType;
}

export type ConfigFieldType = "string" | "number" | "boolean" | "enum";

export interface ConfigFieldDescriptor {
  key: string;
  label: string;
  fieldType: ConfigFieldType;
  required: boolean;
  defaultValue?: string | number | boolean;
  enumValues?: string[];
}

export interface UINodeDefinition {
  id: string;
  name: string;
  description: string;
  inputs: NodeHandleDescriptor[];
  outputs: NodeHandleDescriptor[];
  configFields: ConfigFieldDescriptor[];
}

export interface NodeCatalogResponse {
  nodes: UINodeDefinition[];
}

export type ExecutionStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "IDLE";
