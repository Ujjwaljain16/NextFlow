import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db/prisma";
import { GraphService, GraphValidationError } from "../../../../../lib/services/graph.service";
import { executeNodeTask } from "../../../../../trigger/dag";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const RunWorkflowSchema = z.object({
  selectedNodeIds: z.array(z.string()).optional(),
  isolated: z.boolean().optional(),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await props.params;

    const body = await req.json().catch(() => ({}));
    const { selectedNodeIds, isolated } = RunWorkflowSchema.parse(body);

    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }

    const nodes = (workflow.nodes || []) as Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    const edges = (workflow.edges || []) as Array<{ source: string; target: string; sourceHandle: string; targetHandle: string }>;

    const graphService = new GraphService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullGraph = GraphService.buildExecutionGraph(nodes as any, edges as any);
    
    let executionGraph: typeof fullGraph;
    let entryNodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
    let runScope: "full" | "partial" | "single";

    if (!selectedNodeIds || selectedNodeIds.length === 0) {
      executionGraph = fullGraph;
      const entryNodeIds = Object.keys(fullGraph.nodes).filter(
        (nid) => fullGraph.reverseAdjacencyList[nid].length === 0
      );
      entryNodes = entryNodeIds.map(nid => ({ id: nid, ...fullGraph.nodes[nid] }));
      runScope = "full";
    } else {
      // Selective run — compute full downstream subgraph or isolate to just selected nodes
      let subgraphNodes;
      if (isolated) {
        subgraphNodes = selectedNodeIds
          .filter(id => fullGraph.nodes[id])
          .map(id => ({ id, type: fullGraph.nodes[id].type, data: fullGraph.nodes[id].data }));
      } else {
        subgraphNodes = graphService.getDownstreamSubgraph(fullGraph, selectedNodeIds);
      }
      
      if (subgraphNodes.length === 0) {
        return NextResponse.json({ error: "INVALID_SELECTION" }, { status: 400 });
      }

      const subgraphNodeIds = new Set(subgraphNodes.map((n) => n.id));
      const subgraphEdges = fullGraph.edges.filter(
        (e) => subgraphNodeIds.has(e.source) && subgraphNodeIds.has(e.target)
      );

      const graphNodesMap: Record<string, { type: string; data: Record<string, unknown> }> = {};
      subgraphNodes.forEach(n => {
        graphNodesMap[n.id] = { type: n.type, data: n.data || {} };
      });

      const adjacencyList: Record<string, string[]> = {};
      const reverseAdjacencyList: Record<string, string[]> = {};
      
      subgraphNodes.forEach(n => {
        adjacencyList[n.id] = fullGraph.adjacencyList[n.id]?.filter(id => subgraphNodeIds.has(id)) || [];
        reverseAdjacencyList[n.id] = fullGraph.reverseAdjacencyList[n.id]?.filter(id => subgraphNodeIds.has(id)) || [];
      });

      executionGraph = {
        nodes: graphNodesMap,
        edges: subgraphEdges,
        adjacencyList,
        reverseAdjacencyList,
      };

      // Entry nodes are selected nodes that have no in-subgraph predecessors
      entryNodes = graphService.getSubgraphEntryNodes(fullGraph, subgraphNodeIds);
      runScope = (selectedNodeIds.length === 1 || isolated) ? "single" : "partial";
    }

    if (entryNodes.length === 0) {
      return NextResponse.json({ error: "NO_ENTRY_NODES" }, { status: 400 });
    }

    // Transaction Boundary
    const runRecord = await prisma.$transaction(async (tx) => {
      const run = await tx.workflowRun.create({
        data: {
          workflowId: id,
          userId,
          status: "RUNNING",
          scope: runScope,
          executionGraph: executionGraph as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.nodeRun.createMany({
        data: entryNodes.map(node => ({
          workflowRunId: run.id,
          nodeId: node.id,
          status: "PENDING"
        }))
      });

      return run;
    });

    // Execution (The Single Point of Trigger)
    try {
      await executeNodeTask.batchTrigger(
        entryNodes.map(node => ({
          payload: { 
            workflowRunId: runRecord.id, 
            nodeId: node.id 
          }
        }))
      );
    } catch (triggerError) {
      await prisma.workflowRun.update({
        where: { id: runRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        { error: "TRIGGER_DISPATCH_FAILED", details: triggerError instanceof Error ? triggerError.message : "Failed to dispatch tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ runId: runRecord.id });
    
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[WORKFLOW_EXECUTE]", error);
    }
    
    if (error instanceof GraphValidationError) {
       return NextResponse.json({ error: "GRAPH_VALIDATION_ERROR", details: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_DATA", details: error.flatten() }, { status: 422 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
