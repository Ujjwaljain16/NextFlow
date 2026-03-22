"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[APP_ERROR]", error);
    }
  }, [error]);

  return (
    <main className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] text-zinc-100 px-4">
      <div className="rounded-xl border border-zinc-800/50 bg-[#1A1A1B]/80 backdrop-blur-md p-8 text-center shadow-xl max-w-sm w-full">
        <p className="text-5xl font-bold text-red-400 mb-2">500</p>
        <p className="text-sm text-zinc-400 mb-6">Something went wrong on our end.</p>
        <button
          onClick={reset}
          className="inline-flex items-center rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/20 transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
