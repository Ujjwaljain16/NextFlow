"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  draggable?: boolean;
}

export function SidebarItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  onDragStart,
  draggable = false,
}: SidebarItemProps) {
  return (
    <div className="relative group flex items-center">
      <button
        type="button"
        draggable={draggable}
        onClick={onClick}
        onDragStart={onDragStart}
        className={cn(
          "flex items-center rounded-lg transition-all duration-150 shrink-0 text-[#D4D4D4] cursor-pointer",
          collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full gap-3 px-3 py-2 h-10",
          "hover:bg-[#1A1A1A] hover:text-white",
          active && "bg-[#1A1A1A] text-white shadow-sm border border-[#333]"
        )}
      >
        {icon ? (
          <div className="size-5 shrink-0 flex items-center justify-center">{icon}</div>
        ) : (
          <div className="size-5 shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md shadow-sm" />
        )}

        {!collapsed && (
          <span className="truncate text-[13px] font-medium tracking-tight text-[#E5E5E5] group-hover:text-white transition-colors">{label}</span>
        )}
      </button>


      {collapsed && (
        <div className="absolute left-[56px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none drop-shadow-lg">

          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white rotate-45 rounded-sm" />


          <div className="bg-white text-black text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
