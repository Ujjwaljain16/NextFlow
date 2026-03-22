import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";

const configSchema = z.object({
  url: z.string().optional(),
});

const inputSchema = z.object({});

const outputSchema = z.object({
  image_url: z.string(),
});

export const UploadImageNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.upload_image",
  name: "Upload Image",
  description: "Upload an image file and output its URL.",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [],
  outputs: [{ id: "image_url", name: "Image URL", type: "image" }],

  execute: async (inputs, config) => {
    // URL is provided via node config (set by UI after Transloadit upload)
    const url = config.url || "";
    if (!url) {
      throw new Error("No image URL provided. Upload an image first.");
    }
    return { image_url: url };
  },
};

Registry.register(UploadImageNode);
