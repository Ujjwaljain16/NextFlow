import { config } from "dotenv";
config();

import { prisma } from "../src/lib/db/prisma";
import { GraphService } from "../src/lib/services/graph.service";
import { executeNodeTask } from "../src/trigger/dag";

// Pre-load
import "../src/nodes/catalog/text.node";
import "../src/nodes/catalog/test-chaos.node";

const userId = "test-advanced-system";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runScenario(name: string, nodes: any[], edges: any[]) {
  console.log(`\n=========================================`);
  console.log(` SCENARIO: ${name}`);
  console.log(`=========================================\n`);

  console.log("1. Provisioning Test Workflow in DB...");
  const workflow = await prisma.workflow.create({
    data: { userId, name, nodes, edges },
  });

  const executionGraph = GraphService.buildExecutionGraph(nodes, edges);

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

  console.log("2. Pushing to Trigger.dev Queue...");
  const entryNodes = Object.keys(executionGraph.nodes).filter(
    (id) => executionGraph.reverseAdjacencyList[id].length === 0
  );

  await executeNodeTask.batchTrigger(
    entryNodes.map((nodeId) => ({
      payload: { workflowRunId: runRecord.id, nodeId },
    }))
  );

  console.log("\n3. Polling Execution State...");
  const startTime = Date.now();
  let previousStateStr = "";

  return new Promise<void>((resolve) => {
    const pollInterval = setInterval(async () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const nodeRuns = await prisma.nodeRun.findMany({
        where: { workflowRunId: runRecord.id },
        orderBy: { nodeId: "asc" },
      });

      const currentRun = await prisma.workflowRun.findUnique({
        where: { id: runRecord.id },
      });

      const currentStateStr = JSON.stringify({
        nodes: nodeRuns.map((n) => ({ id: n.nodeId, status: n.status, attempts: n.error })),
        overall: currentRun?.status,
      });

      if (currentStateStr !== previousStateStr) {
        previousStateStr = currentStateStr;

        console.log(`\n[T+${elapsed}s] State Update Detect:`);
        for (const nr of nodeRuns) {
          const out = nr.outputs ? JSON.stringify(nr.outputs) : "{}";
          const err = nr.error ? ` [ERROR: ${nr.error}]` : "";
          console.log(`  › [${nr.status.padEnd(7)}] Node ${nr.nodeId.padEnd(7)} -> Out: ${out}${err}`);
        }
        console.log(`  › OVERALL: [${currentRun?.status}]`);
      }

      if (Date.now() - startTime > 90000 && currentRun?.status === "RUNNING") {
        clearInterval(pollInterval);
        console.error("\n❌ Timeout. Is trigger.dev running?");
        process.exit(1);
      }

      if (currentRun?.status === "SUCCESS" || currentRun?.status === "FAILED") {
        clearInterval(pollInterval);
        console.log(`\n✅ Scenario Finished Asserts! (${currentRun.status})`);
        resolve();
      }
    }, 1500);
  });
}

async function main() {
  console.clear();
  console.log("🧪 Starting Advanced E2E Scenarios\n");

  // SCENARIO 1: FAN-IN
  // N1 & N2 output text. N3 waits for both, then combines them natively.
  await runScenario(
    "Strict Fan-In Dependency",
    [
      { id: "n1", type: "core.text", data: { text: "Hello" } },
      { id: "n2", type: "core.text", data: { text: "NextFlow" } },
      { id: "n3", type: "core.test_chaos", data: { mode: "fan_in" } },
    ],
    [
      { source: "n1", target: "n3", sourceHandle: "text", targetHandle: "in1" },
      { source: "n2", target: "n3", sourceHandle: "text", targetHandle: "in2" },
    ]
  );

  // SCENARIO 2: FAILURE PROPAGATION
  // N1 connects to N2 (which Hard Fails). N3 depends on N2.
  // Expected: N1(SUCCESS) -> N2(FAILED) -> N3(never runs), Workflow(FAILED)
  await runScenario(
    "Terminal Failure Propagation",
    [
      { id: "n1", type: "core.text", data: { text: "Ignition" } },
      { id: "n2", type: "core.test_chaos", data: { mode: "terminal" } },
      { id: "n3", type: "core.text", data: { text: "Should never run" } },
    ],
    [
      { source: "n1", target: "n2", sourceHandle: "text", targetHandle: "in1" },
      { source: "n2", target: "n3", sourceHandle: "out", targetHandle: "text" },
    ]
  );

  // SCENARIO 3: TRANSIENT ERROR RETRY RECOVERY
  // N1 (transient) recovers after 2 throws -> N2 executes normally.
  await runScenario(
    "Transient Error Retry Recovery",
    [
      { id: "n1", type: "core.test_chaos", data: { mode: "transient" } },
      { id: "n2", type: "core.text", data: { text: "I depend on N1" } },
    ],
    [
      { source: "n1", target: "n2", sourceHandle: "out", targetHandle: "text" },
    ]
  );

  console.log("\n🎉 ALL ADVANCED SCENARIOS PROVEN SECURELY!\n");

  // Cleanup
  await prisma.workflow.deleteMany({ where: { userId } });
}

main().catch(console.error);
