import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db/prisma";

type RouteProps = { params: Promise<{ id: string }> };

// GET /api/workflows/[id]/export — export workflow as JSON (Fix 3.2)
export async function GET(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await props.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
      select: { name: true, nodes: true, edges: true },
    });

    if (!workflow) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    const exportPayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      exportedAt: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="workflow-${id}.json"`,
      },
    });

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_EXPORT]", error);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
