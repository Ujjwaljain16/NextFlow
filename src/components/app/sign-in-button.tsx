"use client";

import { SignInButton } from "@clerk/nextjs";

export function LandingSignInButton() {
  return (
    <div className="mt-16 group relative">
      <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-zinc-600 to-zinc-200 opacity-10 blur-2xl transition-all group-hover:opacity-30 group-hover:blur-3xl" />
      <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 backdrop-blur-3xl shadow-2xl transition-colors group-hover:bg-white/[0.04] group-hover:border-white/10">
        <SignInButton mode="modal">
          <button className="flex cursor-pointer items-center justify-center gap-4 rounded-xl bg-white px-12 py-5 text-[16px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
            Start Building →
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
