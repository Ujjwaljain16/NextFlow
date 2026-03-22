import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";

const configSchema = z.object({
  text: z.string().optional(),
});

const inputSchema = z.object({
  text: z.string().optional(),
});

const outputSchema = z.object({
  text: z.string(),
});

export const TextNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.text",
  name: "Text Node",
  description: "Provide or pass through raw text data.",
  inputs: [{ id: "text", name: "Text Input", type: "text" }],
  outputs: [{ id: "text", name: "Text Output", type: "text" }],
  configSchema,
  inputSchema,
  outputSchema,
  execute: async (inputs, config) => {
    // Gives priority to graph-fed inputs, otherwise falls back to static manual configuration.
    const finalString = inputs.text ?? config.text ?? "";
    return { text: finalString };
  },
};

// Auto-register upon import
Registry.register(TextNode);
