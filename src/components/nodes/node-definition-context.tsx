"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";

interface NodeDefinitionContextValue {
  definitions: UINodeDefinition[];
  getDefinition: (id: string) => UINodeDefinition | undefined;
}

const NodeDefinitionContext = createContext<NodeDefinitionContextValue | null>(null);

export function NodeDefinitionProvider({ 
  definitions, 
  children 
}: { 
  definitions: UINodeDefinition[]; 
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({
    definitions,
    getDefinition: (id: string) => definitions.find(d => d.id === id)
  }), [definitions]);

  return (
    <NodeDefinitionContext.Provider value={value}>
      {children}
    </NodeDefinitionContext.Provider>
  );
}

export function useNodeDefinition(id: string) {
  const context = useContext(NodeDefinitionContext);
  if (!context) {
    throw new Error("useNodeDefinition must be used within a NodeDefinitionProvider");
  }
  return context.getDefinition(id);
}
