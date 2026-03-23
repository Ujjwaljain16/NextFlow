import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db/prisma";
import { z } from "zod";

// Proper Zod schemas for node and edge payloads instead of z.array(z.any())
const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const EdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string(),
  targetHandle: z.string(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

// GET /api/workflows — list all workflows for the authenticated user
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        nodes: true,
        edges: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { runs: true } },
      },
    });

    const hasMore = workflows.length > limit;
    const items = hasMore ? workflows.slice(0, limit) : workflows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const formattedItems = items.map(w => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      _count: w._count,
      nodeCount: Array.isArray(w.nodes) ? w.nodes.length : 0,
      nodes: (w.nodes as Array<{ id: string; position: { x: number; y: number } }>)?.map((n) => ({ id: n.id, position: n.position })),
      edges: (w.edges as Array<{ source: string; target: string; sourceHandle: string; targetHandle: string }>)?.map((e) => ({ source: e.source, target: e.target }))
    }));

    return NextResponse.json({ workflows: formattedItems, nextCursor });

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_LIST]", error);
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const { name, nodes, edges } = createWorkflowSchema.parse(body);

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodes: nodes as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edges: edges as any,
      },
    });

    return NextResponse.json({ id: workflow.id });
    
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_CREATE]", error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_DATA", details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
