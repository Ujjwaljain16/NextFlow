import { z } from "zod";

export interface ExecutionContext {
  workflowRunId: string;
  nodeId: string;
}

export interface NodeHandle {
  id: string;
  name: string;
  type: string; // e.g., 'text', 'image', 'video'
}

// Highly generic interface leveraging Zod for strict type inference 
export interface NodeDefinition<
  TConfig extends z.ZodTypeAny = z.ZodTypeAny,
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
  id: string;
  name: string;
  description: string;
  
  inputs: NodeHandle[];
  outputs: NodeHandle[];
  
  configSchema: TConfig;
  inputSchema: TInput;
  outputSchema: TOutput;
  
  // The execute function infers exact input/config shapes directly from Zod
  execute: (
    inputs: z.infer<TInput>,
    config: z.infer<TConfig>,
    context: ExecutionContext
  ) => Promise<z.infer<TOutput>>;
}
