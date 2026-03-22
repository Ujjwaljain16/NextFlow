import useSWR from "swr";
import { getWorkflows } from "@/lib/api/workflow-client";

export function useWorkflows() {
  return useSWR("workflows", getWorkflows, {
    dedupingInterval: 30000,
  });
}
