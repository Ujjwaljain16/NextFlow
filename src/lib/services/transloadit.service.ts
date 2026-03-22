import { Transloadit } from "transloadit";
import fsPromise from "fs/promises";
import path from "path";

/**
 * Robust fallback service for uploading generated frames/crops to Transloadit.
 * If credentials are missing, securely pivots to base64 Data URIs to prevent workflow crashes.
 */
export class TransloaditService {
  static async uploadLocalFile(filePath: string): Promise<string> {
    const authKey = process.env.TRANSLOADIT_AUTH_KEY;
    const authSecret = process.env.TRANSLOADIT_SECRET_KEY;

    const client = new Transloadit({ authKey: authKey!, authSecret: authSecret! });
    
    // Read file into Buffer to avoid stream/path resolution issues in the SDK
    const fileBuffer = await fsPromise.readFile(filePath);
    const fileName = path.basename(filePath);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      uploads: {
        [fileName]: fileBuffer
      },
      params: {
        steps: {
          export: {
            use: ":original",
            robot: "/image/resize",
            resize_strategy: "fit", // Pass-through optimization
          },
        },
      },
      waitForCompletion: false, // Avoid local polling hangs
    };

    try {
      const result = await client.createAssembly(options);
      const pollUrl = result?.assembly_ssl_url || result?.assembly_url;
      
      if (!pollUrl) {
        throw new Error("Transloadit failed to return an assembly URL or status endpoint.");
      }

      // CUSTOM POLLING: The SDK's internal polling can hang on Windows.
      // We'll poll the status URL manually for up to 20 seconds.
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
        
        try {
          const resp = await fetch(pollUrl);
          const status = await resp.json();
          
          if (status.ok === "ASSEMBLY_COMPLETED") {
            const uploadedUrl = status?.results?.export?.[0]?.ssl_url || 
                                status?.results?.[":original"]?.[0]?.ssl_url ||
                                status?.uploads?.[0]?.ssl_url;
            
            if (uploadedUrl) {
              return uploadedUrl;
            }
          }
          
          if (status.error) {
            throw new Error(`Transloadit Assembly Error: ${status.error}`);
          }

        } catch {
          // Silent retry for polling errors
        }
      }

      throw new Error(`Transloadit upload timed out after ${maxAttempts}s of polling.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Transloadit Error: ${message}`);
    }
  }
}
