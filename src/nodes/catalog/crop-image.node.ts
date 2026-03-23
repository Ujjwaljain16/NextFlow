import { z } from "zod";
import { NodeDefinition } from "../core/types";
import { Registry } from "../core/registry";
import ffmpeg from "fluent-ffmpeg";
import { setupFFmpeg } from "../../lib/utils/ffmpeg-path";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { TransloaditService } from "../../lib/services/transloadit.service";

const configSchema = z.object({
  x_percent: z.number().min(0).max(100).default(0),
  y_percent: z.number().min(0).max(100).default(0),
  width_percent: z.number().min(0).max(100).default(100),
  height_percent: z.number().min(0).max(100).default(100),
});

const inputSchema = z.object({
  image_url: z.string().url("Must be a valid remote image URL"),
  x_percent: z.number().min(0).max(100).optional(),
  y_percent: z.number().min(0).max(100).optional(),
  width_percent: z.number().min(0).max(100).optional(),
  height_percent: z.number().min(0).max(100).optional(),
});

const outputSchema = z.object({
  output: z.string(), // Returns uploaded Transloadit URL or Base64 fallback
});

export const CropImageNode: NodeDefinition<typeof configSchema, typeof inputSchema, typeof outputSchema> = {
  id: "core.crop_image",
  name: "Crop Image",
  description: "Crops an image using percentage-based parameters via FFmpeg.",
  configSchema,
  inputSchema,
  outputSchema,
  inputs: [
    { id: "image_url", name: "Image URL", type: "image" },
    { id: "x_percent", name: "X %", type: "text" },
    { id: "y_percent", name: "Y %", type: "text" },
    { id: "width_percent", name: "Width %", type: "text" },
    { id: "height_percent", name: "Height %", type: "text" },
  ],
  outputs: [{ id: "output", name: "Cropped Image URL", type: "image" }],

  execute: async (inputs, config) => {

    setupFFmpeg();

    const imageUrl = inputs.image_url;
    if (!imageUrl) {
      throw new Error("No image URL provided for cropping.");
    }

    const px = Math.max(0, Math.min(100, inputs.x_percent ?? config.x_percent));
    const py = Math.max(0, Math.min(100, inputs.y_percent ?? config.y_percent));
    const pw = Math.max(0, Math.min(100, inputs.width_percent ?? config.width_percent));
    const ph = Math.max(0, Math.min(100, inputs.height_percent ?? config.height_percent));

    // Download image locally to process safely with FFmpeg
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    
    const inputTempFile = path.join(os.tmpdir(), `crop-in-${Date.now()}.jpg`);
    const outputTempFile = path.join(os.tmpdir(), `crop-out-${Date.now()}.jpg`);
    
    await fs.writeFile(inputTempFile, Buffer.from(arrayBuffer));

    // FFmpeg math: iw = input width, ih = input height.
    const cropFilter = `crop=iw*(${pw}/100):ih*(${ph}/100):iw*(${px}/100):ih*(${py}/100)`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputTempFile)
        .videoFilters(cropFilter)
        .frames(1) // Ensure single frame since it's an image
        .output(outputTempFile)
        .on("end", async () => {
          try {
            const finalUrl = await TransloaditService.uploadLocalFile(outputTempFile);
            

            await fs.unlink(inputTempFile).catch(() => {});
            await fs.unlink(outputTempFile).catch(() => {});
            
            resolve({ output: finalUrl });
          } catch (err: unknown) {
            reject(new Error(`Failed to process via Transloadit: ${err instanceof Error ? err.message : String(err)}`));
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("error", async (err: any) => {
          await fs.unlink(inputTempFile).catch(() => {});
          await fs.unlink(outputTempFile).catch(() => {});
          reject(new Error(`FFmpeg processing error: ${err.message}`));
        })
        .run();
    });
  },
};

Registry.register(CropImageNode);
