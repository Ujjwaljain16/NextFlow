import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.string(), z.unknown()).optional().default({}),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  })).optional(),
  edges: z.array(z.object({
    id: z.string().optional(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string(),
    targetHandle: z.string(),
  })).optional(),
});

type RouteProps = { params: Promise<{ id: string }> };

// GET /api/workflows/[id] — single workflow with recent runs summary
export async function GET(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await props.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            _count: { select: { nodeRuns: true } },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(workflow);

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_GET]", error);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PUT /api/workflows/[id] — update workflow name/nodes/edges
export async function PUT(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await props.params;
    const body = await req.json();
    const updates = updateWorkflowSchema.parse(body);

    const existing = await prisma.workflow.findUnique({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.nodes !== undefined ? { nodes: updates.nodes as unknown as Prisma.InputJsonValue } : {}),
        ...(updates.edges !== undefined ? { edges: updates.edges as unknown as Prisma.InputJsonValue } : {}),
      },
    });

    return NextResponse.json({ id: workflow.id, updatedAt: workflow.updatedAt });

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_UPDATE]", error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_DATA", details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/workflows/[id]
export async function DELETE(req: Request, props: RouteProps) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await props.params;

    const existing = await prisma.workflow.findUnique({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    await prisma.workflow.delete({ where: { id } });

    return NextResponse.json({ deleted: true });

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_DELETE]", error);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
