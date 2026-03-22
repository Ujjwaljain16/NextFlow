import { z } from "zod";
import { prisma } from "../db/prisma";

export enum ErrorCategory {
  TERMINAL = "TERMINAL",
  TRANSIENT = "TRANSIENT",
  VALIDATION = "VALIDATION",
}

export class GlobalErrorHandler {
  static categorize(error: unknown): ErrorCategory {
    if (error instanceof z.ZodError) return ErrorCategory.VALIDATION;
    
    const message = error instanceof Error ? error.message : String(error);
    
    // 1. Terminal Errors (No retry possible)
    if (
      message.includes("Missing Data") || 
      message.includes("Cascading Failure") ||
      message.includes("DAG Violation") ||
      message.includes("Graph Violation") ||
      message.includes("GOOGLE_AI_API_KEY") ||
      message.includes("API key") ||
      message.includes("401") ||
      message.includes("403") ||
      message.includes("NOT_FOUND") ||
      message.includes("UNAUTHORIZED")
    ) {
      return ErrorCategory.TERMINAL;
    }

    // 2. Transient Errors (Retryable)
    if (
      message.includes("429") || 
      message.includes("quota") || 
      message.includes("timeout") ||
      message.includes("ECONNRESET") ||
      message.includes("ETIMEDOUT") ||
      message.includes("Simulated network drop")
    ) {
      return ErrorCategory.TRANSIENT;
    }

    return ErrorCategory.TRANSIENT;
  }

  static async handleNodeError(
    workflowRunId: string,
    nodeId: string,
    error: unknown,
    isFinalAttempt: boolean = false
  ) {
    const category = this.categorize(error);
    const message = error instanceof Error ? error.message : "Unknown execution error";

    console.error(`[GlobalErrorHandler] Node ${nodeId} Error (${category}): ${message}`);

    if (category === ErrorCategory.TERMINAL || isFinalAttempt) {
      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId, status: { in: ["PENDING", "RUNNING"] } },
        data: {
          status: "FAILED",
          error: message,
          completedAt: new Date(),
        },
      });
      return true; // Was handled as terminal
    }

    // For transient errors that aren't the final attempt, we reset to PENDING
    // so Trigger.dev's native retry logic can pick it up.
    await prisma.nodeRun.updateMany({
      where: { workflowRunId, nodeId, status: "RUNNING" },
      data: { status: "PENDING" },
    });
    
    return false; // Handled as transient
  }
}
