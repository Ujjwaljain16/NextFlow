import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { TransloaditService } from "../../lib/services/transloadit.service";

import { setupFFmpeg } from "../../lib/utils/ffmpeg-path";

const configSchema = z.object({
  timestamp: z.string().default("00:00:01.000"), // Standard FFmpeg time format
});

const inputSchema = z.object({
  video_url: z.string().url(),
  timestamp: z.string().optional(),
});

const outputSchema = z.object({
  output: z.string(), // Returns a base64 Data URI string to avoid ephemeral storage issues natively without Cloudinary
});

export const ExtractFrameNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.extract_frame",
  name: "Extract Frame from Video",
  description: "Extracts a single frame from a video URL at a given timestamp using FFmpeg.",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [
    { id: "video_url", name: "Video URL", type: "video" },
    { id: "timestamp", name: "Timestamp", type: "text" },
  ],
  outputs: [{ id: "output", name: "Extracted Frame (Base64)", type: "image" }],

  execute: async (inputs, config) => {

    setupFFmpeg();

    const videoUrl = inputs.video_url;
    if (!videoUrl) {
      throw new Error("No video URL provided for frame extraction.");
    }

    const ts = inputs.timestamp ?? config.timestamp;
    
    // We must write the extracted frame to a temporary location before converting to base64
    const tempDir = os.tmpdir();
    const tempFilename = `frame_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const tempFilePath = path.join(tempDir, tempFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(videoUrl)
        .seekInput(ts)
        .frames(1)
        .output(tempFilePath)
        .on('end', async () => {
          try {
            const finalUrl = await TransloaditService.uploadLocalFile(tempFilePath);
            
            // Clean up the ephemeral temp file from Trigger.dev worker container
            await fs.unlink(tempFilePath).catch(() => {});
            
            resolve({ output: finalUrl });
          } catch (err: unknown) {
            reject(new Error(`Failed to process extracted frame via Transloadit: ${err instanceof Error ? err.message : String(err)}`));
          }
        })
        .on('error', (err: unknown) => {
          reject(new Error(`FFmpeg Extraction Error: ${err instanceof Error ? err.message : String(err)}`));
        })
        .run();
    });
  },
};

Registry.register(ExtractFrameNode);
