import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db/prisma";

type RouteProps = { params: Promise<{ id: string }> };

// GET /api/workflows/[id]/runs — list all runs for a workflow
export async function GET(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await props.params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    // Verify the user owns this workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
      select: { id: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        scope: true,
        startedAt: true,
        completedAt: true,
        _count: { select: { nodeRuns: true } },
      },
    });

    const hasMore = runs.length > limit;
    const items = hasMore ? runs.slice(0, limit) : runs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ runs: items, nextCursor });

  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[WORKFLOW_RUNS_LIST]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
