import { useEffect } from "react";
import { useReactFlow } from "reactflow";
import { useWorkflowStore } from "@/store/workflow-store";

export function useKeyboardShortcuts({ onAddNode }: { onAddNode?: (e: KeyboardEvent) => void } = {}) {
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const toggleSidebar = useWorkflowStore((state) => state.toggleSidebar);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") {
        return;
      }


      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (onAddNode) {
          onAddNode(e);
        } else {
          toggleSidebar();
        }
      }


      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        reactFlowInstance.fitView({ duration: 800 });
      }


      if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }


      if (
        (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key.toLowerCase() === "y" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, toggleSidebar, reactFlowInstance, onAddNode]);
}
