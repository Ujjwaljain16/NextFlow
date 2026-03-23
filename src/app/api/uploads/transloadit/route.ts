import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { TransloaditService } from "@/lib/services/transloadit.service";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm", "video/x-m4v",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".mp4", ".mov", ".webm", ".m4v",
]);
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "FILE_TOO_LARGE", maxSizeMB: 100 }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE", received: file.type }, { status: 400 });
    }

    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "INVALID_FILE_EXTENSION", received: ext }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const tempPath = path.join(os.tmpdir(), `nextflow-upload-${Date.now()}-${Math.round(Math.random() * 10000)}${ext}`);

    await fs.writeFile(tempPath, Buffer.from(bytes));
    const url = await TransloaditService.uploadLocalFile(tempPath);
    await fs.unlink(tempPath).catch(() => undefined);

    return NextResponse.json({ url });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[UPLOAD_TRANSLOADIT]", error);
    }
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}
