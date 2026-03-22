import { NodeDefinition } from "./types";

class NodeRegistry {
  private nodes: Map<string, NodeDefinition> = new Map();

  register(node: NodeDefinition) {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with id ${node.id} is already registered.`);
    }
    this.nodes.set(node.id, node);
  }

  get(id: string): NodeDefinition {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node with id ${id} not found in the registry.`);
    }
    return node;
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }
}

export const Registry = new NodeRegistry();
