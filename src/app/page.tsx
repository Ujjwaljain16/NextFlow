import { Show, SignInButton } from "@clerk/nextjs";
import { WorkflowBuilder } from "@/components/app/workflow-builder";

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <WorkflowBuilder />
      </Show>

      <Show when="signed-out">
        <main className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] px-4 text-zinc-100 z-50">
          <div className="rounded-xl border border-zinc-800/50 bg-[#1A1A1B]/80 backdrop-blur-md p-8 text-center shadow-xl">
            <p className="mb-4 text-sm text-zinc-300">Sign in to access NextFlow.</p>
            <SignInButton mode="modal">
              <button className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/20 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </main>
      </Show>
    </>
  );
}
