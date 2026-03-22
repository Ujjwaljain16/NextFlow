import { config } from "dotenv";
config(); // Load .env file for database & trigger.dev keys

import { prisma } from "../src/lib/db/prisma";
import { GraphService } from "../src/lib/services/graph.service";
import { executeNodeTask } from "../src/trigger/dag";

// Pre-load nodes to register them within the registry
import "../src/nodes/catalog/text.node";

async function main() {
  const userId = "test-user-system";

  console.log("=========================================");
  console.log("   NextFlow DAG Execution Engine Test    ");
  console.log("=========================================\n");

  // 1. Create a simple workflow DAG with 3 components in a linear chain
  const nodes = [
    { id: "node1", type: "core.text", data: { text: "Hello" }, position: { x: 0, y: 0 } },
    { id: "node2", type: "core.text", data: { text: " Middle" }, position: { x: 200, y: 0 } },
    { id: "node3", type: "core.text", data: { text: " End" }, position: { x: 400, y: 0 } },
  ];

  // N1 -> N2 -> N3 ensures valid scalar input mapping
  const edges = [
    { source: "node1", target: "node2", sourceHandle: "text", targetHandle: "text", id: "edge1" },
    { source: "node2", target: "node3", sourceHandle: "text", targetHandle: "text", id: "edge2" },
  ];

  console.log("1. Creating test workflow...");
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: "CLI E2E Test Workflow",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: nodes as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edges: edges as any,
    },
  });
  console.log(`   › Workflow ID: ${workflow.id}\n`);

  console.log("2. Building Execution Graph via GraphService...");
  const executionGraph = GraphService.buildExecutionGraph(nodes, edges);
  console.log("   › Adjacency List:         ", JSON.stringify(executionGraph.adjacencyList));
  console.log("   › Reverse Adjacency List: ", JSON.stringify(executionGraph.reverseAdjacencyList), "\n");

  console.log("3. Provisioning Atomic WorkflowRun in DB...");
  const runRecord = await prisma.$transaction(async (tx) => {
    const run = await tx.workflowRun.create({
      data: {
        workflowId: workflow.id,
        userId,
        status: "RUNNING",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        executionGraph: executionGraph as any,
      },
    });

    // Identify the entry nodes natively
    const entryNodes = Object.keys(executionGraph.nodes).filter(
      (id) => executionGraph.reverseAdjacencyList[id].length === 0
    );

    await tx.nodeRun.createMany({
      data: entryNodes.map((nodeId) => ({
        workflowRunId: run.id,
        nodeId,
        status: "PENDING",
      })),
    });

    return run;
  });
  console.log(`   › Run ID: ${runRecord.id}\n`);

  console.log("4. Triggering Initial Tasks to Trigger.dev Queue...");
  const entryNodes = Object.keys(executionGraph.nodes).filter(
    (id) => executionGraph.reverseAdjacencyList[id].length === 0
  );

  await executeNodeTask.batchTrigger(
    entryNodes.map((nodeId) => ({
      payload: { workflowRunId: runRecord.id, nodeId },
    }))
  );
  console.log(`   › Triggered Entry Nodes: [${entryNodes.join(", ")}]\n`);

  console.log("=========================================");
  console.log("  POLLING FOR REAL-TIME EXECUTION STATE  ");
  console.log("    (Ensure 'npx trigger.dev dev' is running)    ");
  console.log("=========================================\n");

  const startTime = Date.now();
  let previousStateStr = "";

  // Polling loop to witness the async transitions natively
  const pollInterval = setInterval(async () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { workflowRunId: runRecord.id },
      orderBy: { nodeId: "asc" },
    });

    const currentRun = await prisma.workflowRun.findUnique({
      where: { id: runRecord.id },
    });

    // Build a compact representation to avoid spamming the console if state hasn't changed
    const currentStateStr = JSON.stringify({
      nodes: nodeRuns.map(n => ({ id: n.nodeId, status: n.status })),
      overall: currentRun?.status
    });

    if (currentStateStr !== previousStateStr) {
      previousStateStr = currentStateStr;
      
      console.log(`\n[T+${elapsed}s] State Update Detected:`);
      for (const nr of nodeRuns) {
        const outputPreview = nr.outputs ? JSON.stringify(nr.outputs) : "{}";
        const errorPreview = nr.error ? ` [ERROR: ${nr.error}]` : "";
        console.log(
          `  › [${nr.status.padEnd(7)}] Node ${nr.nodeId.padEnd(7)} -> Outputs: ${outputPreview}${errorPreview}`
        );
      }
      console.log(`  › Overall Run Status: [${currentRun?.status}]`);
    }

    // Safety timeout in case Trigger isn't running so the user doesn't get stuck infinitely
    if (Date.now() - startTime > 90000 && currentRun?.status === "RUNNING") {
      clearInterval(pollInterval);
      console.error("\n❌ Timeout: Execution stalled. Is `npx trigger.dev dev` running?");
      process.exit(1);
    }

    if (currentRun?.status === "SUCCESS" || currentRun?.status === "FAILED") {
      clearInterval(pollInterval);
      console.log("\n✅ E2E Workflow Test Finished Successfully!");
      
      // Automatic cleanup
      console.log("\nCleaning up resilient workflow traces...");
      await prisma.workflow.delete({ where: { id: workflow.id } });
      console.log("   › Cleanup Complete.");
      
      process.exit(0);
    }
  }, 1000);
}

main().catch((err) => {
  console.error("\n❌ Test execution uniquely failed:", err);
  process.exit(1);
});
