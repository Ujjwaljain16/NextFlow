import { prisma } from "../db/prisma";
import { Registry } from "../../nodes/core/registry";

export interface ExecutionGraph {
  nodes: Record<string, { type: string; data: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; sourceHandle: string; targetHandle: string }>;
  adjacencyList: Record<string, string[]>;
  reverseAdjacencyList: Record<string, string[]>;
}

export class ResolverService {
  /**
   * Orchestrates the fetching, mapping, and Zod-validation of all parent outputs.
   * If this function throws, the Orchestrator MUST catch the error and execute:
   * `prisma.nodeRun.update({ status: 'FAILED', error: e.message })`
   */
  static async resolveInputs(
    workflowRunId: string,
    targetNodeId: string,
    graph: ExecutionGraph
  ): Promise<Record<string, unknown>> {
    

    const targetNodeMetadata = graph.nodes[targetNodeId];
    if (!targetNodeMetadata) {
      throw new Error(`Graph Violation: Target node ${targetNodeId} not found in execution graph payload.`);
    }
    const nodeDefinition = Registry.get(targetNodeMetadata.type);

    const parentNodeIds = graph.reverseAdjacencyList[targetNodeId] || [];


    const parentRuns = await prisma.nodeRun.findMany({
      where: {
        workflowRunId,
        nodeId: { in: parentNodeIds },
      },
    });

    if (parentRuns.length !== parentNodeIds.length) {
      throw new Error(`DAG Violation: Expected ${parentNodeIds.length} dependencies, found ${parentRuns.length}.`);
    }

    const failedParents = parentRuns.filter((r) => r.status === "FAILED");
    if (failedParents.length > 0) {
      const failedIds = failedParents.map((n) => n.nodeId).join(", ");
      throw new Error(`Cascading Failure: Upstream nodes [${failedIds}] failed execution.`);
    }

    const parentOutputsMap = new Map<string, Record<string, unknown>>();
    parentRuns.forEach((run) => {
      parentOutputsMap.set(run.nodeId, (run.outputs as Record<string, unknown>) || {});
    });

    const rawInputs: Record<string, unknown> = {};
    

    // Sort incoming edges deterministically by source node ID to guarantee identical array ordering across runs
    const incomingEdges = graph.edges
      .filter((e) => e.target === targetNodeId)
      .sort((a, b) => a.source.localeCompare(b.source));


    for (const edge of incomingEdges) {
      const inputHandleDef = nodeDefinition.inputs.find(i => i.id === edge.targetHandle);
      if (!inputHandleDef) {
        throw new Error(`Validation Error: Target node ${targetNodeId} has no input handle named '${edge.targetHandle}'.`);
      }

      const parentOutput = parentOutputsMap.get(edge.source);
      if (!parentOutput) continue;

      const mappedValue = parentOutput[edge.sourceHandle];
      

      if (mappedValue === undefined || mappedValue === null) {
        throw new Error(`Missing Data: Upstream node ${edge.source} succeeded but returned null/undefined for handle '${edge.sourceHandle}'.`);
      }

      const isArrayType = inputHandleDef.type.includes("array");

      if (rawInputs[edge.targetHandle] !== undefined) {
        if (!isArrayType) {
           throw new Error(`Graph Violation: Multiple connections attempting to feed into singular input handle '${edge.targetHandle}' on node ${targetNodeId}.`);
        }
        if (Array.isArray(rawInputs[edge.targetHandle])) {
          (rawInputs[edge.targetHandle] as unknown[]).push(mappedValue);
        }
      } else {
        // Initialize as an array if the schema explicitly expects an array format, even for the first item
        rawInputs[edge.targetHandle] = isArrayType ? [mappedValue] : mappedValue;
      }
    }

    // ZOD VALIDATION (Mathematical Type Inference enforcement)
    try {
      const validatedInputs = nodeDefinition.inputSchema.parse(rawInputs);
      return validatedInputs as Record<string, unknown>;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Input Resolution Failed for node ${targetNodeId}: ${msg}`);
    }
  }
}
