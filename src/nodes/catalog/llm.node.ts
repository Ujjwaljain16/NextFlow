import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";
import { GoogleGenerativeAI } from "@google/generative-ai";

const configSchema = z.object({
  model: z
    .enum([
      "gemini-2.5-flash",
      "gemini-3.1-pro",
      "gemini-3.0-flash",
    ])
    .default("gemini-2.5-flash"),
});

const inputSchema = z.object({
  system_prompt: z.string().optional(),
  user_message: z.string(),
  images: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  output: z.string(),
});

export const LLMNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.llm",
  name: "Run Any LLM",
  description: "Executes an LLM prompt via Google Gemini API",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [
    { id: "system_prompt", name: "System Prompt", type: "text" },
    { id: "user_message", name: "User Message", type: "text" },
    { id: "images", name: "Images", type: "image_array" },
  ],
  outputs: [{ id: "output", name: "LLM Output", type: "text" }],
  
  execute: async (inputs, config, _context) => {
    void _context;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: config.model,
      ...(inputs.system_prompt ? { systemInstruction: inputs.system_prompt } : {}),
    });

    // Rate limiting is handled by the gemini-quota queue (concurrency: 1) in dag.ts

    // Build content parts: text + optional images
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: inputs.user_message },
    ];

    if (inputs.images && inputs.images.length > 0) {
      for (const imageUrl of inputs.images) {
        // Fetch image and convert to inline data for Gemini
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        parts.push({
          inlineData: { data: base64, mimeType },
        });
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();

    return { output: text };
  },
};

// Auto-register upon import
Registry.register(LLMNode);
