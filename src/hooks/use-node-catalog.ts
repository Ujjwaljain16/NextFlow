"use client";

import { useEffect, useState } from "react";
import { fetchNodeCatalog } from "@/lib/api/workflow-client";
import type { UINodeDefinition } from "@/lib/types/workflow-ui";

export const useNodeCatalog = () => {
  const [nodes, setNodes] = useState<UINodeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetchNodeCatalog();
        if (!active) {
          return;
        }

        setNodes(response.nodes);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load node catalog");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  return { nodes, isLoading, error };
};
