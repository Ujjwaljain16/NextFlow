import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db/prisma";

type RouteProps = { params: Promise<{ id: string; runId: string }> };

// GET /api/workflows/[id]/runs/[runId] — full run detail with all node-level history
export async function GET(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id, runId } = await props.params;

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        nodeRuns: {
          orderBy: { startedAt: "asc" },
          select: {
            id: true,
            nodeId: true,
            status: true,
            inputs: true,
            outputs: true,
            error: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!run || run.workflowId !== id || run.userId !== userId) {
      return NextResponse.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(run);

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_RUN_GET]", error);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
