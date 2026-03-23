"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";
import { useWorkflowStore } from "@/store/workflow-store";
import { SidebarItem } from "./sidebar-item";
import { cn } from "@/lib/utils/cn";

interface NodeLibraryProps {
  definitions: UINodeDefinition[];
}


function getNodeIcon(id: string) {
  if (id.includes("text")) return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>;
  if (id.includes("llm") || id.includes("ai")) return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
  if (id.includes("image")) return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  if (id.includes("video")) return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
}

export function NodeLibrary({ definitions }: NodeLibraryProps) {
  const addNode = useWorkflowStore((s) => s.addNode);
  const { sidebarCollapsed, toggleSidebar } = useWorkflowStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      toggleSidebar: state.toggleSidebar,
    }))
  );
  
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    // Exclude internal/dev nodes from the sidebar
    const HIDDEN_NODE_IDS = new Set(["core.test_chaos"]);
    const visible = definitions.filter((d) => !HIDDEN_NODE_IDS.has(d.id));

    const q = query.trim().toLowerCase();
    if (!q) return visible;

    return visible.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }, [definitions, query]);

  return (
    <div className={cn(
      "h-full shrink-0 border-r border-[#1A1A1A] bg-[#000000] flex flex-col pointer-events-auto transition-all duration-300 z-30",
      sidebarCollapsed ? "w-[60px]" : "w-56 shadow-2xl overflow-x-hidden"
    )}>


      <div className={cn("flex flex-col border-b border-[#1A1A1A] shrink-0", sidebarCollapsed ? "py-[14px]" : "py-3 gap-3")}>
        <div className="flex w-full items-center gap-2 px-[10px]">
          <button 
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 items-center justify-center rounded-md hover:bg-[#1A1A1A] text-[#888888] hover:text-white transition-colors cursor-pointer"
            style={{ width: sidebarCollapsed ? "100%" : "32px" }}
            title={sidebarCollapsed ? "Expand nodes" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          
          {!sidebarCollapsed && (
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#666666] mt-[1px]">
              Nodes
            </h2>
          )}
        </div>


        {!sidebarCollapsed && (
          <div className="w-full px-[10px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search nodes..."
              className="w-full rounded-md border border-[#333333] bg-[#111111] px-3 py-1.5 text-xs text-white outline-none placeholder:text-[#666666] focus:border-[#555555] focus:ring-1 focus:ring-[#555555] transition-all"
            />
          </div>
        )}
      </div>


      <div className={cn(
        "flex-1 scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-transparent",
        sidebarCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
      )}>
        <div className="space-y-1 p-2">

          {!sidebarCollapsed && (
            <div className="px-2 pb-1 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                Quick Access
              </span>
            </div>
          )}
          {filtered.length > 0 ? (
            filtered.map((definition) => (
              <SidebarItem
                key={definition.id}
                label={definition.name}
                icon={getNodeIcon(definition.id)}
                collapsed={sidebarCollapsed}
                onClick={() => addNode(definition, { x: 220, y: 120 })}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "application/x-nextflow-node",
                    definition.id,
                  );
                  event.dataTransfer.effectAllowed = "move";
                }}
              />
            ))
          ) : (
            <p className="px-4 py-4 text-xs text-[#666666] text-center">
              No nodes match.
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-[#1A1A1A] p-2 shrink-0">
        <SidebarUserButton collapsed={sidebarCollapsed} />
      </div>
    </div>
  );
}

import { useUser, SignOutButton } from "@clerk/nextjs";
import { ChevronUp, LogOut, Settings, CreditCard, User } from "lucide-react";
import Image from "next/image";

function SidebarUserButton({ collapsed }: { collapsed: boolean }) {
  const { user, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !user) return null;

  return (
    <div className="relative">

      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-[#333333] bg-[#0A0A0A] p-1 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#666666]">
            Account
          </div>
          
          <div className="space-y-0.5">
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#AAAAAA] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer">
              <User size={14} />
              Profile
            </button>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#AAAAAA] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer">
              <Settings size={14} />
              Settings
            </button>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#AAAAAA] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer">
              <CreditCard size={14} />
              Billing
            </button>
          </div>

          <div className="my-1 border-t border-[#1A1A1A]" />
          
          <SignOutButton>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left">
              <LogOut size={14} />
              Log out
            </button>
          </SignOutButton>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-start transition-all hover:bg-[#1A1A1A] group/user-btn cursor-pointer",
          collapsed ? "justify-center" : "px-3"
        )}
      >
        <div className="relative flex shrink-0 overflow-hidden size-8 rounded-lg border border-[#333333] bg-[#111111]">
          {user.imageUrl ? (
            <Image
              src={user.imageUrl} 
              alt={user.fullName ?? "User"} 
              width={32}
              height={32}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-zinc-800 text-[10px] font-bold">
              {user.firstName?.charAt(0) ?? "U"}
            </div>
          )}
        </div>

        {!collapsed && (
          <>
            <div className="grid flex-1 text-start leading-tight">
              <span className="truncate text-sm font-medium text-white">
                {user.fullName || user.username || "User"}
              </span>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Free Plan
              </span>
            </div>
            <ChevronUp size={14} className="text-zinc-500 transition-transform group-hover/user-btn:translate-y-[-2px] group-hover/user-btn:text-zinc-300" />
          </>
        )}
      </button>
    </div>
  );
}
