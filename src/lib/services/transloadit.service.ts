import { Transloadit } from "transloadit";
import fsPromise from "fs/promises";
import path from "path";

/**
 * Service for uploading generated frames/crops to Transloadit.
 * Uses SDK's built-in waitForCompletion for reliable cloud assembly polling.
 */
export class TransloaditService {
  static async uploadLocalFile(filePath: string): Promise<string> {
    // Matches actual env var name in .env and Vercel: TRANSLOADIT_SECRET_KEY
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_SECRET_KEY;

    if (!authKey || !authSecret) {
      throw new Error("Transloadit credentials missing. Set TRANSLOADIT_AUTH_KEY and TRANSLOADIT_AUTH_SECRET.");
    }

    const client = new Transloadit({ authKey, authSecret });
    
    const fileBuffer = await fsPromise.readFile(filePath);
    const fileName = path.basename(filePath);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      uploads: {
        [fileName]: fileBuffer
      },
      params: {
        steps: {
          // Pass-through: store the original file as-is
          store: {
            use: ":original",
            robot: "/file/store",
          },
        },
      },
      // FIX: Use SDK's built-in polling — reliable in Trigger.dev cloud workers (no Windows hang issues)
      waitForCompletion: true,
    };

    try {
      const result = await client.createAssembly(options);

      // FIX: Correct step result key matches the 'store' step defined above
      const uploadedUrl =
        result?.results?.store?.[0]?.ssl_url ||
        result?.results?.[":original"]?.[0]?.ssl_url ||
        result?.uploads?.[0]?.ssl_url;

      if (!uploadedUrl) {
        throw new Error(
          `Transloadit assembly completed but no URL found. Status: ${result?.ok}, Error: ${result?.error}`
        );
      }

      return uploadedUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Transloadit Error: ${message}`);
    }
  }
}
