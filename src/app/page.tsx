import { auth } from "@clerk/nextjs/server";
import { AppContainer } from "@/components/app/app-container";
import { LandingSignInButton } from "@/components/app/sign-in-button";
import Image from "next/image";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    return <AppContainer />;
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0A0A0A] text-zinc-100 antialiased font-sans">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/landing-bg.png"
          alt="NextFlow Background"
          fill
          className="animate-pulse-slow object-cover opacity-20 brightness-50 contrast-125"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/60 to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)]" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {/* Logo and Brand */}
        <div className="mb-10 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="relative rounded-3xl bg-white/5 p-5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)]">
              <svg aria-label="NextFlow Logo" width="56" height="56" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M8.34 1.266c1.766-.124 3.324 1.105 3.551 2.802.216 1.612-.887 3.171-2.545 3.536-.415.092-.877.066-1.317.122a4.63 4.63 0 0 0-2.748 1.34l-.008.004-.01-.001-.006-.005-.003-.009q0-.009.005-.016a.04.04 0 0 0 .007-.022 438 438 0 0 1-.01-4.541c.003-1.68 1.33-3.086 3.085-3.21"></path>
                <path d="M8.526 15.305c-2.247-.018-3.858-2.23-3.076-4.3a3.31 3.31 0 0 1 2.757-2.11c.384-.04.845-.03 1.215-.098 1.9-.353 3.368-1.806 3.665-3.657.066-.41.031-.9.128-1.335.449-2.016 2.759-3.147 4.699-2.236 1.011.476 1.69 1.374 1.857 2.447q.051.33.034.818c-.22 5.842-5.21 10.519-11.279 10.47m2.831.93a.04.04 0 0 1-.021-.02l-.001-.006.002-.006q0-.003.003-.004l.006-.003q3.458-.792 5.992-3.185.045-.042.083.007c.27.357.554.74.78 1.106a10.6 10.6 0 0 1 1.585 4.89q.037.53.023.819c-.084 1.705-1.51 3.08-3.31 3.09-1.592.01-2.992-1.077-3.294-2.597-.072-.36-.05-.858-.11-1.238q-.282-1.755-1.715-2.84zm-3.369 6.64c-1.353-.235-2.441-1.286-2.684-2.593a5 5 0 0 1-.05-.817V15.14q0-.021.016-.007c.884.786 1.814 1.266 3.028 1.346l.326.01c1.581.051 2.92 1.087 3.229 2.592.457 2.225-1.557 4.195-3.865 3.793"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-6xl font-black tracking-tight text-white lg:text-8xl drop-shadow-2xl">
            NextFlow
          </h1>
          <p className="max-w-xl text-lg text-zinc-400 lg:text-2xl font-medium tracking-tight mt-4">
            High-performance AI orchestrations.
            <br />
            <span className="text-zinc-500">Pixel-perfect control, real-time execution.</span>
          </p>
        </div>

        {/* Glassmorphic Call to Action (Client Component) */}
        <LandingSignInButton />

        {/* Sub-footer features */}
        <div className="mt-32 grid grid-cols-1 gap-12 text-left sm:grid-cols-3 lg:gap-24 opacity-30 select-none pointer-events-none">
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Parallelized</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500 border-l-2 border-zinc-800/50 pl-5">Auto-concurrency graph engine powered by Trigger.dev V3</p>
            </div>
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Type-Safe</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500 border-l-2 border-zinc-800/50 pl-5">Deterministic AI pipelines with full Zod validation</p>
            </div>
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Pro-Grade</h3>
                <p className="text-[13px] leading-relaxed text-zinc-500 border-l-2 border-zinc-800/50 pl-5">Native FFmpeg processing and Transloadit integration</p>
            </div>
        </div>
      </div>
    </main>
  );
}
