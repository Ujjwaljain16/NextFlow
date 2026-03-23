import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { z } from "zod";

// POST /api/workflows/import — import a workflow from JSON
const importSchema = z.object({
  name: z.string().min(1).max(200),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.string(), z.unknown()).optional().default({}),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  })),
  edges: z.array(z.object({
    id: z.string().optional(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string(),
    targetHandle: z.string(),
  })),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json();
    const { name, nodes, edges } = importSchema.parse(body);

    const workflow = await prisma.workflow.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { userId, name: `${name} (imported)`, nodes: nodes as any, edges: edges as any },
      });
    return NextResponse.json({ id: workflow.id }, { status: 201 });

  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_IMPORT]", error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_DATA", details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
