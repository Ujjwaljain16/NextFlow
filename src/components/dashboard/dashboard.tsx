"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Workflow, 
  ArrowRight,
  ChevronDown,
  EyeOff,
  MoreVertical,
  Edit2,
  Trash2
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { useWorkflows } from "@/hooks/use-workflows";
import { DashboardSidebar } from "./dashboard-sidebar";
import { mutate as globalMutate } from "swr";
import { deleteWorkflow, renameWorkflow, type WorkflowListItem } from "@/lib/api/workflow-client";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function Dashboard({ 
  onSelectWorkflowAction, 
  onNewWorkflowAction 
}: { 
  onSelectWorkflowAction: (id: string) => void;
  onNewWorkflowAction: () => void;
}) {
  const { data: workflows = [], isLoading} = useWorkflows();
  const [activeTab, setActiveTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkflows = (workflows as WorkflowListItem[]).filter((wf: WorkflowListItem) => 
    wf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await deleteWorkflow(id);
      await globalMutate("workflows");
    } catch (err) {
      console.error("Failed to delete workflow:", err);
      alert(`Failed to delete workflow: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await renameWorkflow(id, newName);
      await globalMutate("workflows");
    } catch (err) {
      console.error("Failed to rename workflow:", err);
      alert(`Failed to rename workflow: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] text-white font-sans overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Hero Banner */}
        <div className="relative w-full aspect-[21/9] min-h-[320px] max-h-[420px] flex flex-col justify-end p-8 @lg:p-14 overflow-hidden">
           <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 via-transparent to-transparent z-10" />
              <Image 
                src="https://s.krea.ai/nodesHeaderBannerBlurGradient.webp" 
                alt="Banner" 
                fill
                className="object-cover opacity-40 brightness-75 animate-pulse-slow"
                priority
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] z-10" />
           </div>

           <div className="relative z-20 space-y-6 max-w-2xl">
              <div className="flex items-center gap-4">
                 <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-center shadow-2xl">
                    <Workflow className="text-white" size={28} />
                 </div>
                 <h1 className="text-4xl font-black tracking-tight drop-shadow-2xl">Node Editor</h1>
              </div>
              
              <p className="text-lg text-zinc-400 font-medium leading-relaxed drop-shadow-md">
                 NextFlow is the most powerful way to orchestrate AI. 
                 Connect every tool and model into complex automated pipelines.
              </p>

              <button 
                onClick={onNewWorkflowAction}
                className="group flex items-center gap-3 rounded-full bg-white px-8 py-3.5 text-sm font-black text-black transition-all hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.4)]"
              >
                 New Workflow
                 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
           </div>
        </div>

        {/* content Area */}
        <div className="px-8 @lg:px-14 py-12 flex-1">
           {/* secondary Nav */}
           <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 pb-4 mb-8">
              <div className="flex gap-2">
                 {["projects", "apps", "examples", "templates"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200",
                        activeTab === tab 
                          ? "bg-white/10 text-white border border-white/5 shadow-inner" 
                          : "text-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      {tab}
                    </button>
                 ))}
              </div>

              <div className="flex items-center gap-3">
                 <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-white" />
                    <input 
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm outline-none w-64 focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-zinc-700"
                    />
                 </div>

                 <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-zinc-400 hover:bg-white/10 transition-colors">
                    Last viewed
                    <ChevronDown size={14} />
                 </button>

                 <button className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-600 hover:text-white transition-colors">
                    <EyeOff size={16} />
                 </button>
              </div>
           </div>

           {/* Workflow Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {/* New Workflow Card */}
              <button 
                onClick={onNewWorkflowAction}
                className="group flex flex-col gap-3 text-left w-full"
              >
                 <div className="aspect-[3/2] w-full rounded-2xl bg-white/5 border border-white/5 border-dashed flex items-center justify-center transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 group-hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.05)] active:scale-98">
                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-black shadow-xl transition-transform group-hover:scale-110">
                       <Plus size={20} />
                    </div>
                 </div>
                 <div className="px-1">
                    <h3 className="text-sm font-bold text-white mb-0.5">New Workflow</h3>
                    <p className="text-[11px] text-zinc-700 font-bold uppercase tracking-wider">Create a session</p>
                 </div>
              </button>

              {/* Workflow Cards */}
              {isLoading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3 animate-pulse">
                       <div className="aspect-[3/2] w-full rounded-2xl bg-white/5" />
                       <div className="h-4 w-2/3 bg-white/5 rounded mx-1" />
                    </div>
                 ))
              ) : (
                filteredWorkflows.map((workflow: WorkflowListItem) => (
                  <WorkflowCard 
                    key={workflow.id} 
                    workflow={workflow} 
                    onSelect={() => onSelectWorkflowAction(workflow.id)}
                    onDelete={() => handleDelete(workflow.id)}
                    onRename={(name) => handleRename(workflow.id, name)}
                  />
                ))
              )}
           </div>
        </div>
      </main>
    </div>
  );
}

function WorkflowCard({ 
  workflow, 
  onSelect, 
  onDelete, 
  onRename 
}: { 
  workflow: WorkflowListItem; 
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(workflow.name);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== workflow.name) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div className="group flex flex-col gap-3 text-left w-full relative">
       <div 
         onClick={onSelect}
         className="aspect-[3/2] w-full rounded-2xl bg-[#0F0F0F] border border-white/5 overflow-hidden transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.1)] active:scale-98 relative cursor-pointer"
       >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50" />
          
          <div className="relative h-full w-full flex flex-col justify-between">
              <WorkflowMiniMap nodes={workflow.nodes} edges={workflow.edges} />
              
              <div className="absolute bottom-4 right-4">
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-black text-zinc-600 uppercase tracking-widest backdrop-blur-sm">
                      {workflow.nodeCount} nodes
                  </div>
              </div>
          </div>

          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-tighter scale-90 group-hover:scale-100 transition-transform">
                  Open Session
              </span>
          </div>
       </div>

       {/* Management Menu Trigger */}
       <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:bg-black/80 transition-all cursor-pointer shadow-xl"
          >
             <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-40 rounded-xl bg-[#111] border border-white/10 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer text-left"
                >
                   <Edit2 size={14} />
                   Rename
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer text-left"
                >
                   <Trash2 size={14} />
                   Delete
                </button>
              </div>
            </>
          )}
       </div>

       <div className="px-1" onClick={onSelect}>
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="mb-0.5" onClick={(e) => e.stopPropagation()}>
              <input 
                autoFocus
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm font-bold text-white outline-none focus:border-white/40"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => setIsRenaming(false)}
              />
            </form>
          ) : (
            <h3 className="text-sm font-bold text-white mb-0.5 truncate">{workflow.name}</h3>
          )}
          <p className="text-[10px] text-zinc-600 font-medium" suppressHydrationWarning>
             Edited {formatRelativeTime(workflow.updatedAt)}
          </p>
       </div>
    </div>
  );
}

function WorkflowMiniMap({ nodes, edges }: { 
  nodes?: Array<{ id: string; position: { x: number; y: number } }>;
  edges?: Array<{ source: string; target: string }>;
}) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <Workflow size={48} className="text-white" />
      </div>
    );
  }

  // Calculate bounding box
  let minX = nodes[0].position.x;
  let minY = nodes[0].position.y;
  let maxX = nodes[0].position.x + 150;
  let maxY = nodes[0].position.y + 100;

  nodes.forEach(n => {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 150); 
    maxY = Math.max(maxY, n.position.y + 100);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = 40;
  
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

  return (
    <div className="absolute inset-0 p-6 flex items-center justify-center pointer-events-none opacity-40">
      <svg 
        viewBox={viewBox} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {edges?.map((edge, i) => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;
          
          const x1 = source.position.x + 150;
          const y1 = source.position.y + 50;
          const x2 = target.position.x;
          const y2 = target.position.y + 50;
          
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-white/20"
            />
          );
        })}
        
        {/* Nodes */}
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            width="150"
            height="100"
            rx="12"
            className="fill-white/10 stroke-white/20"
            strokeWidth="3"
          />
        ))}
      </svg>
    </div>
  );
}
