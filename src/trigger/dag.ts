import { task } from "@trigger.dev/sdk";
import { prisma } from "../lib/db/prisma";
import { ResolverService, ExecutionGraph } from "../lib/services/resolver.service";
import { OrchestratorService } from "../lib/services/orchestrator.service";
import { Registry } from "../nodes/core/registry";
import { Prisma } from "@prisma/client";

import "../nodes/catalog/text.node";
import "../nodes/catalog/llm.node";
import "../nodes/catalog/upload-image.node";
import "../nodes/catalog/upload-video.node";
import "../nodes/catalog/crop-image.node";
import "../nodes/catalog/extract-frame.node";
import "../nodes/catalog/test-chaos.node";
import { GlobalErrorHandler, ErrorCategory } from "../lib/utils/error-handler";


import { queue, logger } from "@trigger.dev/sdk";

// Dedicated queue for LLM nodes to prevent Gemini quota 429s (Rate Limits)
const llmQueue = queue({
  name: "gemini-quota",
  concurrencyLimit: 1,
});

async function runNode(payload: { workflowRunId: string; nodeId: string }, isDelegatedTask: boolean = false) {
  const { workflowRunId, nodeId } = payload;

  const runRecord = await prisma.workflowRun.findUnique({
    where: { id: workflowRunId },
    select: { executionGraph: true },
  });

  if (!runRecord || !runRecord.executionGraph) {
    throw new Error(`Execution Failed: WorkflowRun ${workflowRunId} missing executionGraph JSON.`);
  }

  const graph = runRecord.executionGraph as unknown as ExecutionGraph;
  const targetNodeMetadata = graph.nodes[nodeId];

  // SKIP DISABLED NODES
  if (targetNodeMetadata.data?.disabled) {
    logger.info(`[runNode] Skipping node ${nodeId} as it is marked as disabled.`);
    
    // Mark as SUCCESS but with a 'disabled' flag/note in outputs if needed, 
    // or just mark as SUCCESS to continue the flow.
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId, nodeId } },
      data: {
        status: "SUCCESS",
        outputs: {},
        completedAt: new Date(),
      },
    });

    await orchestratorTask.trigger({
      workflowRunId,
      completedNodeId: nodeId,
    });

    return { success: true, skipped: true };
  }

  // RESOLVE INPUTS EARLY: Ensures they are visible in UI even if task is queued/delegated
  const resolvedInputs = await ResolverService.resolveInputs(workflowRunId, nodeId, graph);

  const isLlmNode = targetNodeMetadata.type.includes("llm");

  // 1. CONDITIONAL RUNNING TRANSITION (Idempotency Guard)
  // Ensures that ONLY PENDING nodes (or manually restarted FAILED nodes) execute.
  const transition = await prisma.nodeRun.updateMany({
    where: {
      workflowRunId,
      nodeId,
      status: { in: ['PENDING', 'FAILED'] }
    },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      inputs: resolvedInputs as unknown as Prisma.InputJsonValue, // Prisma Json compatibility
      error: null,
    }
  });

  if (transition.count === 0 && !isDelegatedTask) {
    logger.info(`[Task idempotency] Node ${nodeId} is already RUNNING or SUCCESS. Exiting early.`);
    return { success: true, note: "Skipped duplicate execution request" };
  }

  // 2. CONCURRENCY DELEGATION
  if (isLlmNode && !isDelegatedTask) {
    logger.info(`[runNode] Delegating LLM Node ${nodeId} to sequential queue.`);
    await executeLlmNodeTask.trigger(payload);
    return { delegated: true, to: "execute-llm-node" };
  }

  try {
    const nodeDefinition = Registry.get(targetNodeMetadata.type);
    const config = targetNodeMetadata.data || {};

    const rawOutputs = await nodeDefinition.execute(resolvedInputs, config, { workflowRunId, nodeId });

    // FIX 3.6: Validate outputs against the node's outputSchema to enforce the contract.
    const outputs = nodeDefinition.outputSchema.parse(rawOutputs ?? {});

    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId, nodeId } },
      data: {
        status: "SUCCESS",
        outputs: outputs as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // 2. ONLY TRIGGER ORCHESTRATOR ON DEFINITIVE SUCCESS
    await orchestratorTask.trigger({
      workflowRunId,
      completedNodeId: nodeId,
    });

    return { success: true, outputs };

  } catch (error: unknown) {
    // 3. SEPARATE TRANSIENT VS TERMINAL ERRORS
    const category = GlobalErrorHandler.categorize(error);
    const message = error instanceof Error ? error.message : String(error);

    if (category !== ErrorCategory.TERMINAL) {
      // Revert to PENDING so Trigger.dev's retry loop works
      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId },
        data: {
          status: "PENDING",
          error: message || "Transient error. Retrying...",
        }
      });
      logger.warn(`[runNode] Transient error for ${nodeId}, retrying...`, { error: message });
      throw error;
    }

    logger.error(`[runNode] Terminal failure for node ${nodeId}`, { error: message });
    // Terminal failure
    await prisma.nodeRun.update({
      where: { workflowRunId_nodeId: { workflowRunId, nodeId } },
      data: {
        status: "FAILED",
        error: message || "Unknown Terminal Execution Error",
        completedAt: new Date(),
      },
    });

    await orchestratorTask.trigger({
      workflowRunId,
      completedNodeId: nodeId,
    });

    return { success: false, error: message };
  }
}

const nodeFailureHandler = async ({ payload, error }: { payload: { workflowRunId: string; nodeId: string }; error: unknown }) => {
  const { workflowRunId, nodeId } = payload;
  logger.error(`[onFailure] Node ${nodeId} exhausted all retries. Sealing as FAILED.`, { error });

  try {
    await prisma.nodeRun.updateMany({
      where: {
        workflowRunId,
        nodeId,
        status: { in: ["PENDING", "RUNNING"] },
      },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "All retry attempts exhausted",
        completedAt: new Date(),
      },
    });

    await orchestratorTask.trigger({ workflowRunId, completedNodeId: nodeId });
  } catch (cleanupError) {
    logger.error(`[onFailure] Cleanup failed for node ${nodeId}:`, { cleanupError });
  }
};


export const executeNodeTask = task({
  id: "execute-node",
  retry: {
    maxAttempts: 3,
  },
  onFailure: nodeFailureHandler,
  run: async (payload: { workflowRunId: string; nodeId: string }) => {
    return await runNode(payload, false);
  },
});

export const executeLlmNodeTask = task({
  id: "execute-llm-node",
  queue: llmQueue,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 5000,
    factor: 2,
  },
  onFailure: nodeFailureHandler,
  run: async (payload: { workflowRunId: string; nodeId: string }) => {
    return await runNode(payload, true);
  },
});

export const orchestratorTask = task({
  id: "orchestrator",
  retry: {
    maxAttempts: 5,
  },
  onFailure: async ({ payload, error }) => {
    const { workflowRunId } = payload;
    const reason = error instanceof Error ? error.message : "Orchestrator failed after retries";

    try {
      await prisma.nodeRun.updateMany({
        where: {
          workflowRunId,
          status: { in: ["PENDING", "RUNNING"] },
        },
        data: {
          status: "FAILED",
          error: `Orchestrator failure: ${reason}`,
          completedAt: new Date(),
        },
      });

      await prisma.workflowRun.updateMany({
        where: { id: workflowRunId, status: "RUNNING" },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
    } catch (cleanupError) {
      logger.error(`[orchestrator:onFailure] Cleanup failed for run ${workflowRunId}:`, { cleanupError });
    }
  },
  run: async (payload: { workflowRunId: string; completedNodeId: string }) => {
    const { workflowRunId, completedNodeId } = payload;

    const runRecord = await prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      select: { executionGraph: true },
    });

    if (!runRecord || !runRecord.executionGraph) {
      throw new Error(`Execution Failed: WorkflowRun ${workflowRunId} missing executionGraph JSON.`);
    }

    const graph = runRecord.executionGraph as unknown as ExecutionGraph;
    // Orchestrator safely manages duplicate payloads independently 
    await OrchestratorService.handleNodeCompletion(workflowRunId, completedNodeId, graph);

    return { status: "Orchestration Evaluated" };
  },
});
