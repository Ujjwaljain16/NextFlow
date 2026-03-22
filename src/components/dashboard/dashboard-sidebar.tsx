"use client";

import { useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { 
  Home, 
  Workflow, 
  Library, 
  LayoutGrid, 
  LogOut,
  User
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

import { SidebarItem } from "@/components/sidebar/sidebar-item";

export function DashboardSidebar() {
  const [activeTab, setActiveTab] = useState("node-editor");
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-[#1A1A1A] bg-[#000000] font-sans select-none transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-64"
    )}>
      {/* Brand & Collapse Toggle */}
      <div className={cn("flex flex-col border-b border-[#1A1A1A] shrink-0", isCollapsed ? "py-[14px]" : "p-4 gap-4")}>
        <div className="flex w-full items-center gap-3 px-[2px]">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-8 items-center justify-center rounded-md hover:bg-[#1A1A1A] text-[#888888] hover:text-white transition-colors cursor-pointer shrink-0"
            style={{ width: isCollapsed ? "100%" : "32px" }}
          >
            <svg aria-label="Krea Logo" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={cn(isCollapsed ? "text-white" : "text-[#888888]")}>
              <path d="M8.34 1.266c1.766-.124 3.324 1.105 3.551 2.802.216 1.612-.887 3.171-2.545 3.536-.415.092-.877.066-1.317.122a4.63 4.63 0 0 0-2.748 1.34l-.008.004-.01-.001-.006-.005-.003-.009q0-.009.005-.016a.04.04 0 0 0 .007-.022 438 438 0 0 1-.01-4.541c.003-1.68 1.33-3.086 3.085-3.21"></path>
              <path d="M8.526 15.305c-2.247-.018-3.858-2.23-3.076-4.3a3.31 3.31 0 0 1 2.757-2.11c.384-.04.845-.03 1.215-.098 1.9-.353 3.368-1.806 3.665-3.657.066-.41.031-.9.128-1.335.449-2.016 2.759-3.147 4.699-2.236 1.011.476 1.69 1.374 1.857 2.447q.051.33.034.818c-.22 5.842-5.21 10.519-11.279 10.47m2.831.93a.04.04 0 0 1-.021-.02 l-.001-.006.002-.006q0-.003.003-.004l.006-.003q3.458-.792 5.992-3.185.045-.042.083.007c.27.357.554.74.78 1.106a10.6 10.6 0 0 1 1.585 4.89q.037.53.023.819c-.084 1.705-1.51 3.08-3.31 3.09-1.592.01-2.992-1.077-3.294-2.597-.072-.36-.05-.858-.11-1.238q-.282-1.755-1.715-2.84zm-3.369 6.64c-1.353-.235-2.441-1.286-2.684-2.593a5 5 0 0 1-.05-.817V15.14q0-.021.016-.007c.884.786 1.814 1.266 3.028 1.346l.326.01c1.581.051 2.92 1.087 3.229 2.592.457 2.225-1.557 4.195-3.865 3.793"></path>
            </svg>
          </button>
          
          {!isCollapsed && (
            <div className="flex flex-col leading-tight">
               <h1 className="text-sm font-black tracking-tight text-white uppercase">NextFlow</h1>
               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Enterprise AI</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1 p-2 mt-4">
        {!isCollapsed && (
          <div className="px-2 mb-2">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">Explore</span>
          </div>
        )}
        <SidebarItem icon={<Home size={18} />} label="Home" onClick={() => setActiveTab("home")} active={activeTab === "home"} collapsed={isCollapsed} />
        <SidebarItem icon={<Workflow size={18} />} label="Flow Library" onClick={() => setActiveTab("library")} active={activeTab === "library"} collapsed={isCollapsed} />
        <SidebarItem icon={<LayoutGrid size={18} />} label="Node Editor" onClick={() => setActiveTab("node-editor")} active={activeTab === "node-editor"} collapsed={isCollapsed} />
        <SidebarItem icon={<Library size={18} />} label="Assets" onClick={() => setActiveTab("assets")} active={activeTab === "assets"} collapsed={isCollapsed} />
      </nav>

      <div className="my-4 border-t border-[#1A1A1A]" />

      {/* Sessions / Workflows */}
      <div className="flex-1 overflow-y-auto p-2" />

      {/* Footer / User */}
      <div className="mt-auto border-t border-[#1A1A1A] p-2 shrink-0">
        <SidebarUserButton collapsed={isCollapsed} />
      </div>
    </aside>
  );
}

function SidebarUserButton({ collapsed }: { collapsed: boolean }) {
  const { user, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !user) return null;

  return (
    <div className="relative">
      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-[#333333] bg-[#0A0A0A] p-1 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#666666]">
            Account
          </div>
          
          <div className="space-y-0.5">
             <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#AAAAAA] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer text-left">
                <User size={14} />
                Profile
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
          </>
        )}
      </button>
    </div>
  );
}
