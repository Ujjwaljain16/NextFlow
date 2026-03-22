"use client";

export function CanvasEmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-zinc-400">Add a node</p>
        <p className="text-sm text-zinc-600">Double click, right click, or press N</p>
      </div>
    </div>
  );
}
