import { prisma } from "../db/prisma";
import { tasks } from "@trigger.dev/sdk";
import { ExecutionGraph } from "./resolver.service";
import type { executeNodeTask } from "../../trigger/dag";

export class OrchestratorService {

  /**
   * 5. IDEMPOTENCY OF THE ORCHESTRATOR ITSELF:
   * Contract: `handleNodeCompletion` can run multiple times safely for the same node.
   * Duplicate completion events (or concurrent orchestrator calls) inherently fail safely during the INSERT step.
   */
  static async handleNodeCompletion(
    workflowRunId: string,
    completedNodeId: string,
    graph: ExecutionGraph
  ): Promise<void> {
    const downstreamNodeIds = graph.adjacencyList[completedNodeId] || [];

    for (const downstreamId of downstreamNodeIds) {
      const dependencies = graph.reverseAdjacencyList[downstreamId] || [];

      if (dependencies.length === 0) {
        // Fallback safety if somehow an entry node fell into the downstream loop
        await this.safelyQueueNode(workflowRunId, downstreamId);
        continue;
      }

      // 2. USE THE RIGHT INDEX
      // Leveraging @@index([workflowRunId, nodeId]) ensures this hot path executes efficiently.
      const dependencyRuns = await prisma.nodeRun.findMany({
        where: {
          workflowRunId,
          nodeId: { in: dependencies },
        },
        select: { nodeId: true, status: true },
      });

      // 1. "ALL DEPENDENCIES SATISFIED" MUST BE EXACT
      // - Must find strictly matching row count to avoid missing rows returning empty arrays incorrectly as "ready".
      // - Must strictly check that every single dependency is "SUCCESS".
      const isReady =
        dependencyRuns.length === dependencies.length &&
        dependencyRuns.every((run: { nodeId: string; status: string }) => run.status === "SUCCESS");

      if (isReady) {
        // The read is advisory. The INSERT dictates the single source of truth.
        await this.safelyQueueNode(workflowRunId, downstreamId);
      } else {
        // 6. FAILURE PROPAGATION (Define it explicitly)
        // If an upstream dependency is FAILED, there is zero possibility of recovery. Propagate failure.
        const hasFailedDeps = dependencyRuns.some((run: { nodeId: string; status: string }) => run.status === "FAILED");
        if (hasFailedDeps) {
          // Explicit UI hinting rule indicating this downstream node will never run.
          await this.markNodeFailedGracefully(workflowRunId, downstreamId, "Skipped due to upstream dependency failure.", graph);
        }
      }
    }

    // After processing downstream nodes, check if the entire run is complete
    await this.finalizeRunIfComplete(workflowRunId, graph);
  }

  /**
   * 3. MAKE THE INSERT THE SINGLE SOURCE OF TRUTH
   * The atomic DB transaction that guarantees race-condition safety.
   */
  private static async safelyQueueNode(workflowRunId: string, nodeId: string): Promise<void> {
    try {
      // FIX 2.2: Advisory check to reduce Prisma "Unique constraint failed" noise in logs.
      // While the catch block below is the definitive safety net, checking first prevents
      // the terminal from being flooded with Prisma error stack traces during high concurrency.
      const existing = await prisma.nodeRun.findUnique({
        where: { workflowRunId_nodeId: { workflowRunId, nodeId } }
      });

      if (existing) {
        return;
      }

      await prisma.nodeRun.create({
        data: {
          workflowRunId,
          nodeId,
          status: "PENDING",
        },
      });

      // Success guarantees we own the definitive right to execute the trigger payload.
      await tasks.trigger<typeof executeNodeTask>("execute-node", {
        workflowRunId,
        nodeId,
      });
      
    } catch (error: unknown) {
      // Definitive safety net for race conditions between the findUnique and create.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
        return;
      }
      throw error;
    }
  }

  /**
   * Explicitly seals a downstream node to FAILED status while enforcing idempotency guarantees.
   * After marking the node failed, recursively propagates failure to ITS downstream dependents
   * so multi-level failure cascades terminate correctly and finalizeRunIfComplete fires.
   */
  private static async markNodeFailedGracefully(
    workflowRunId: string,
    nodeId: string,
    reason: string,
    graph: ExecutionGraph
  ): Promise<void> {
    try {
      const existing = await prisma.nodeRun.findUnique({
        where: { workflowRunId_nodeId: { workflowRunId, nodeId } }
      });

      if (existing) {
        // If it already exists, only update if it's currently PENDING or RUNNING
        await prisma.nodeRun.updateMany({
          where: {
            workflowRunId,
            nodeId,
            status: { in: ["PENDING", "RUNNING"] }
          },
          data: {
            status: "FAILED",
            error: reason,
            completedAt: new Date(),
          }
        });
      } else {
        await prisma.nodeRun.create({
          data: {
            workflowRunId,
            nodeId,
            status: "FAILED",
            error: reason,
            completedAt: new Date(),
          },
        });
      }
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
        // Node already failed or cancelled by a concurrent process.
        // Still recurse — handleNodeCompletion is idempotent and may have more work to do downstream.
        await this.handleNodeCompletion(workflowRunId, nodeId, graph);
        return;
      }
      throw error;
    }

    // CRITICAL (Fix 2.1): Recursively propagate failure through this node's own downstream chain.
    await this.handleNodeCompletion(workflowRunId, nodeId, graph);
  }

  /**
   * Checks if all nodes in the execution graph have reached a terminal state (SUCCESS or FAILED).
   * If so, finalizes the WorkflowRun status accordingly.
   * Idempotent: uses WHERE status = 'RUNNING' so already-finalized runs are never overwritten.
   */
  private static async finalizeRunIfComplete(workflowRunId: string, graph: ExecutionGraph): Promise<void> {
    const totalNodeCount = Object.keys(graph.nodes).length;
    if (totalNodeCount === 0) return;

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { workflowRunId },
      select: { status: true },
    });

    // Not all nodes have been created yet — run is still in progress
    if (nodeRuns.length < totalNodeCount) return;

    const hasRunningOrPending = nodeRuns.some(
      (r: { status: string }) => r.status === "PENDING" || r.status === "RUNNING"
    );
    if (hasRunningOrPending) return;

    // All nodes are in terminal state (SUCCESS or FAILED)
    const allSuccess = nodeRuns.every((r: { status: string }) => r.status === "SUCCESS");
    const finalStatus = allSuccess ? "SUCCESS" : "FAILED";

    // Conditional update: only transition from RUNNING → final state (idempotent under concurrency)
    await prisma.workflowRun.updateMany({
      where: { id: workflowRunId, status: "RUNNING" },
      data: { status: finalStatus, completedAt: new Date() },
    });
  }
}
