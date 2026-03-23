import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";

/**
 * Robustly discovers the FFmpeg binary path at runtime.
 * Prioritizes:
 * 1. Environment variable FFMPEG_PATH (set by Trigger.dev in production)
 * 2. Runtime resolution of ffmpeg-static (avoiding build-time hardcoded paths)
 * 3. System PATH (fallback)
 */
let isInitialized = false;

export function setupFFmpeg() {
  if (isInitialized) return;
  
  // Check if FFMPEG_PATH is already set (e.g. by Trigger.dev extension in prod)
  if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    isInitialized = true;
    return;
  }

  // Try to use ffmpeg-static, but validate the path at runtime.
  if (ffmpegStatic) {
    if (fs.existsSync(ffmpegStatic)) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
      isInitialized = true;
      return;
    } else {
      // Attempt 2b: Try to find it relative to process.cwd()
      const altPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === 'win32' ? "ffmpeg.exe" : "ffmpeg");
      if (fs.existsSync(altPath)) {
        ffmpeg.setFfmpegPath(altPath);
        isInitialized = true;
        return;
      }
    }
  }

  // Fallback to system 'ffmpeg'. 
  isInitialized = true;
}
