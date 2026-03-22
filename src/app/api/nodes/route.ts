import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUINodeCatalog } from "@/lib/server/node-catalog";
import type { NodeCatalogResponse } from "@/lib/types/workflow-ui";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload: NodeCatalogResponse = {
      nodes: getUINodeCatalog(),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[NODE_CATALOG_GET]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
