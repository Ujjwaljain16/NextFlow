"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";

interface NodePickerProps {
  x: number;
  y: number;
  definitions: UINodeDefinition[];
  onSelect: (definition: UINodeDefinition) => void;
  onClose: () => void;
}

// Icon mapper for categories using raw SVGs for consistency
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  recent: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  video: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  llm: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  other: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h3v18H16" /><path d="M8 21H5V3H8" />
    </svg>
  ),
};

export function NodePicker({ x, y, definitions, onSelect, onClose }: NodePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group nodes by category
  const categories = useMemo(() => {
    const groups: Record<string, UINodeDefinition[]> = {
      image: [],
      video: [],
      llm: [],
      other: [],
    };

    definitions.forEach((d) => {
      const id = d.id.toLowerCase();
      if (id.includes("image")) groups.image.push(d);
      else if (id.includes("video")) groups.video.push(d);
      else if (id.includes("llm") || id.includes("ai")) groups.llm.push(d);
      else groups.other.push(d);
    });

    return Object.entries(groups)
      .filter(([, nodes]) => nodes.length > 0)
      .map(([id, nodes]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), nodes }));
  }, [definitions]);

  // Flattened list for keyboard navigation
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    const items: UINodeDefinition[] = [];
    
    categories.forEach(cat => {
      cat.nodes.forEach(node => {
        if (node.name.toLowerCase().includes(q) || node.description.toLowerCase().includes(q)) {
          items.push(node);
        }
      });
    });
    
    return items;
  }, [categories, search]);

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredItems[selectedIndex]);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, filteredItems, selectedIndex, onSelect]);


  return (
    <div
      ref={containerRef}
      className="fixed z-[1000] w-72 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1B]/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-150 origin-top-left"
      style={{ left: x, top: y }}
    >
      {/* Search Header */}
      <div className="relative flex items-center p-2 border-b border-white/5">
        <div className="absolute left-4 size-4 text-zinc-500 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Search nodes..."
          className="w-full bg-transparent pl-9 pr-4 py-1.5 text-[13px] text-white placeholder:text-zinc-600 outline-none"
        />
      </div>

      {/* List Content */}
      <div className="max-h-[380px] overflow-y-auto pt-1 pb-2 scrollbar-none">
        {categories.map((cat) => {
          const catNodes = cat.nodes.filter(n => 
            n.name.toLowerCase().includes(search.toLowerCase()) || 
            n.description.toLowerCase().includes(search.toLowerCase())
          );
          
          if (catNodes.length === 0) return null;

          return (
            <div key={cat.id} className="px-1.5 py-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {CATEGORY_ICONS[cat.id] || <div className="size-3.5" />}
                {cat.label}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {catNodes.map((node) => {
                  const globalIndex = filteredItems.indexOf(node);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelect(node)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors group text-left",
                        isSelected ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="truncate flex-1">{node.name}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={cn("opacity-0 transition-all -translate-x-1", isSelected && "opacity-100 translate-x-0")}
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="text-[13px] text-zinc-500 font-medium">No nodes found</div>
            <div className="text-[11px] text-zinc-600 mt-1">Try a different search term</div>
          </div>
        )}
      </div>
    </div>
  );
}
