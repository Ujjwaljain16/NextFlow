import { Registry } from "../../nodes/core/registry";
import { ExecutionGraph } from "./resolver.service";

// Pre-bootstrap explicit nodes to automatically register their definitions via module cache
import "../../nodes/catalog/text.node";
import "../../nodes/catalog/llm.node";
import "../../nodes/catalog/upload-image.node";
import "../../nodes/catalog/upload-video.node";
import "../../nodes/catalog/crop-image.node";
import "../../nodes/catalog/extract-frame.node";
import "../../nodes/catalog/test-chaos.node";

interface ReactFlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface ReactFlowEdge {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export class GraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphValidationError";
  }
}

export class GraphService {
  /**
   * Translates arbitrary React Flow JSON models into a rigidly structured DAG adjacency map.
   * Hard fails natively on cyclic intersections, broken handles, or missing context.
   */
  static buildExecutionGraph(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): ExecutionGraph {
    const graphNodes: Record<string, { type: string; data: Record<string, unknown> }> = {};
    const adjacencyList: Record<string, string[]> = {};
    const reverseAdjacencyList: Record<string, string[]> = {};

    nodes.forEach((n) => {

      try {
         Registry.get(n.type);
      } catch {
         throw new GraphValidationError(`Unregistered node type '${n.type}' on node '${n.id}'`);
      }

      if (graphNodes[n.id]) {
         throw new GraphValidationError(`Duplicate node identifier strictly forbidden: '${n.id}'`);
      }

      graphNodes[n.id] = { type: n.type, data: n.data || {} };
      adjacencyList[n.id] = [];
      reverseAdjacencyList[n.id] = [];
    });

    edges.forEach((e) => {
      if (!graphNodes[e.source]) throw new GraphValidationError(`Edge references missing source node: ${e.source}`);
      if (!graphNodes[e.target]) throw new GraphValidationError(`Edge references missing target node: ${e.target}`);


      const sourceDef = Registry.get(graphNodes[e.source].type);
      const targetDef = Registry.get(graphNodes[e.target].type);

      const sourceOutput = sourceDef.outputs.find((out) => out.id === e.sourceHandle);
      const targetInput = targetDef.inputs.find((inp) => inp.id === e.targetHandle);

      if (!sourceOutput) {
         throw new GraphValidationError(`Node '${e.source}' has no known output handle '${e.sourceHandle}'`);
      }
      if (!targetInput) {
         throw new GraphValidationError(`Node '${e.target}' has no known input handle '${e.targetHandle}'`);
      }

      const sourceType = sourceOutput.type;
      const targetType = targetInput.type;

      if (sourceType !== targetType) {
        // Exception: An image_array can legitimately accept multiple singular image connections
        if (!(sourceType === "image" && targetType === "image_array")) {
          throw new GraphValidationError(`Type mismatch constraint violation: Cannot connect output type '${sourceType}' to input type '${targetType}'`);
        }
      }

      if (!adjacencyList[e.source].includes(e.target)) {
        adjacencyList[e.source].push(e.target);
      }
      if (!reverseAdjacencyList[e.target].includes(e.source)) {
        reverseAdjacencyList[e.target].push(e.source);
      }
    });

    // Deterministic Sorting Guarantee
    // Orders outputs dynamically based purely on alphanumeric ID value 
    for (const key in adjacencyList) {
      adjacencyList[key].sort();
    }
    for (const key in reverseAdjacencyList) {
      reverseAdjacencyList[key].sort();
    }

    // Mathematical Cycle Detection Filter (DFS recursive loop analysis)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCyclicalCollision = (nodeId: string): boolean => {

      if (recursionStack.has(nodeId)) return true; 
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of adjacencyList[nodeId]) {
        if (detectCyclicalCollision(neighbor)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(graphNodes)) {
      if (detectCyclicalCollision(nodeId)) {
        throw new GraphValidationError(`Cyclical loop evaluated surrounding node '${nodeId}'. Execution impossible.`);
      }
    }


    const entryNodes = Object.keys(graphNodes).filter((id) => reverseAdjacencyList[id].length === 0);
    if (entryNodes.length === 0 && Object.keys(graphNodes).length > 0) {
      throw new GraphValidationError(`No entry nodes identified. Circular logic isolated without defined entry bounds.`);
    }

    return {
      nodes: graphNodes,
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      })),
      adjacencyList,
      reverseAdjacencyList,
    };
  }

  /**
   * Given a set of starting node IDs, returns all nodes in the execution graph
   * that are reachable downstream (including the starting nodes themselves).
   * Used for selective execution to ensure full subgraph coverage.
   */
  getDownstreamSubgraph(
    graph: ExecutionGraph,
    startNodeIds: string[]
  ): Array<{ id: string; type: string; data: Record<string, unknown> }> {
    const visited = new Set<string>();
    const queue = [...startNodeIds];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      // Ensure the node exists in the graph before adding to visited
      if (graph.nodes[nodeId]) {
        visited.add(nodeId);

        graph.edges
          .filter((e) => e.source === nodeId)
          .forEach((e) => {
            if (!visited.has(e.target)) {
              queue.push(e.target);
            }
          });
      }
    }

    return Object.entries(graph.nodes)
      .filter(([id]) => visited.has(id))
      .map(([id, node]) => ({ id, ...node }));
  }

  /**
   * Within a subgraph, returns the entry nodes — those whose upstream sources
   * are all outside the subgraph (i.e. no in-subgraph predecessors).
   */
  getSubgraphEntryNodes(
    fullGraph: ExecutionGraph,
    subgraphNodeIds: Set<string>
  ): Array<{ id: string; type: string; data: Record<string, unknown> }> {
    const entryNodes: Array<{ id: string; type: string; data: Record<string, unknown> }> = [];

    for (const nodeId of subgraphNodeIds) {
      const node = fullGraph.nodes[nodeId];
      if (!node) continue;

      // A node is an entry node if none of its upstream sources are in the subgraph
      const hasInSubgraphParent = fullGraph.reverseAdjacencyList[nodeId]?.some(
        (sourceId) => subgraphNodeIds.has(sourceId)
      );

      if (!hasInSubgraphParent) {
        entryNodes.push({ id: nodeId, ...node });
      }
    }

    return entryNodes;
  }
}
