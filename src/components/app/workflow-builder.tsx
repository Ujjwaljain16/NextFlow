"use client";

import { ReactFlowProvider } from "reactflow";
import { useNodeCatalog } from "@/hooks/use-node-catalog";
import { useRunPoller } from "@/hooks/use-run-poller";
import { NodeLibrary } from "@/components/sidebar/node-library";
import { WorkflowCanvas } from "@/components/canvas/workflow-canvas";
import { RightPanel } from "@/components/panel/right-panel";
import { WorkflowTopBar } from "@/components/topbar/workflow-topbar";
import { SecondaryToolbar } from "@/components/canvas/secondary-toolbar";

export function WorkflowBuilder() {
  const { nodes, isLoading, error } = useNodeCatalog();

  useRunPoller();

  if (isLoading) {
    return (
      <main className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] text-zinc-400">
        Loading node catalog...
      </main>
    );
  }

  if (error) {
    return (
      <main className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] text-red-300">
        {error}
      </main>
    );
  }

  return (
    <ReactFlowProvider>
      <main className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A0A0A] text-zinc-100 flex">
        
        {/* Left Sidebar Dock Layer (Pushes Canvas on desktop, Overlays on mobile) */}
        <div className="h-full z-30 shrink-0 absolute md:relative">
          <NodeLibrary definitions={nodes} />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative h-full">
          {/* Layer 0: Full Screen Canvas */}
          <div className="absolute inset-0 z-0">
            <WorkflowCanvas definitions={nodes} />
          </div>

          {/* Layer 1: Floating UI Elements */}
          
          {/* Topbar Layer */}
          <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <WorkflowTopBar definitions={nodes} />
            </div>
          </div>

          {/* Bottom Left: Secondary Toolbar */}
          <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <SecondaryToolbar definitions={nodes} />
            </div>
          </div>

          {/* Right Panel Layer (if active) */}
          <div className="absolute top-0 bottom-0 right-0 z-20 pointer-events-none">
            <div className="pointer-events-auto h-full">
              <RightPanel />
            </div>
          </div>
        </div>

      </main>
    </ReactFlowProvider>
  );
}
