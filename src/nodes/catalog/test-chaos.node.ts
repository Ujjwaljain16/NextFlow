import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";

const configSchema = z.object({
  mode: z.enum(["fan_in", "terminal", "transient"]),
});

const inputSchema = z.object({
  in1: z.string().optional(),
  in2: z.string().optional(),
});

const outputSchema = z.object({
  out: z.string(),
});

// A global scoped counter spanning Trigger.dev task executions in the local worker
let globalRetryCount = 0;

export const TestChaosNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.test_chaos",
  name: "Chaos Engine Testing Node",
  description: "Advanced scenario validation for the orchestrator.",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [
    { id: "in1", name: "In 1", type: "text" },
    { id: "in2", name: "In 2", type: "text" },
  ],
  outputs: [{ id: "out", name: "Output", type: "text" }],

  execute: async (inputs, config) => {
    // Determine context safely
    if (config.mode === "fan_in") {
      return { out: `COMBINED: ${inputs.in1} AND ${inputs.in2}` };
    }

    if (config.mode === "terminal") {
      // By using "Missing Data", we map cleanly to dag.ts' internal terminal catch logic (transient = false)
      throw new Error("Missing Data: Intentional Terminal Failure Simulation");
    }

    if (config.mode === "transient") {
      globalRetryCount++;
      // Fails on attempt 1 and 2, but miraculously succeeds on attempt 3
      if (globalRetryCount <= 2) {
        throw new Error(`[Transient Error] Simulated network drop (Attempt ${globalRetryCount})`);
      }
      globalRetryCount = 0; // Reset safely
      return { out: "Success after recovering from 2 retries" };
    }

    return { out: "Unknown mode" };
  },
};

Registry.register(TestChaosNode);
