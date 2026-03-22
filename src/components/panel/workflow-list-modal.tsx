"use client";

import { useEffect, useState } from "react";
import { getWorkflows, type WorkflowListItem } from "@/lib/api/workflow-client";
import { X } from "lucide-react";

interface WorkflowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function WorkflowListModal({ isOpen, onClose, onSelect }: WorkflowListModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    let mounted = true;
    // Removed redundant setLoading(true) to avoid cascading renders
    
    getWorkflows()
      .then((data) => {
        if (mounted) {
          setWorkflows(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load workflows");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    return () => { mounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#141415]">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">Load Workflow</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-700">
          {loading && (
            <div className="py-8 flex justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 p-2 bg-red-400/10 rounded border border-red-500/20">{error}</p>
          )}

          {!loading && !error && workflows.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">No workflows found.</p>
          )}

          {!loading && !error && workflows.length > 0 && (
            <div className="space-y-2">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => onSelect(wf.id)}
                  className="w-full text-left p-3 rounded-lg border border-white/5 bg-[#252527]/50 hover:bg-[#2A2A2B] hover:border-white/10 transition-colors group flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 mb-0.5">{wf.name || "Untitled"}</h3>
                    <p className="text-[11px] text-zinc-500 bg-transparent">
                      {new Date(wf.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-[10px] text-zinc-500 bg-black/20 px-2 py-1 rounded">
                    {wf._count.runs} runs
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
