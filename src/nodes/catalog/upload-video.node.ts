import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";

const configSchema = z.object({
  url: z.string().optional(),
});

const inputSchema = z.object({});

const outputSchema = z.object({
  video_url: z.string(),
});

export const UploadVideoNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.upload_video",
  name: "Upload Video",
  description: "Upload a video file and output its URL.",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [],
  outputs: [{ id: "video_url", name: "Video URL", type: "video" }],

  execute: async (inputs, config) => {
    const url = config.url || "";
    if (!url) {
      throw new Error("No video URL provided. Upload a video first.");
    }
    return { video_url: url };
  },
};

Registry.register(UploadVideoNode);
