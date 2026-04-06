/**
 * Graph
 *
 * Simple undirected graph for room connectivity.
 * Used by the Planner for path-finding (A*), distance calculations,
 * and determining dungeon topology (wings, secrets, loops).
 */

class GraphNode {
  constructor(data) {
    this.data = data;
    this.links = new Map(); // GraphNode -> weight
  }

  /** Link this node to another with a given weight */
  link(other, weight = 1) {
    this.links.set(other, weight);
    other.links.set(this, weight);
  }

  /** Unlink this node from another */
  unlink(other) {
    this.links.delete(other);
    other.links.delete(this);
  }
}

class Graph {
  constructor() {
    this.nodes = new Map(); // data -> GraphNode
  }

  /** Add or retrieve a node for the given data */
  getNode(data) {
    if (!this.nodes.has(data)) {
      this.nodes.set(data, new GraphNode(data));
    }
    return this.nodes.get(data);
  }

  /** Check if a node exists for the given data */
  hasNode(data) {
    return this.nodes.has(data);
  }

  /** Connect two data items with an edge */
  connect(a, b, weight = 1) {
    const nodeA = this.getNode(a);
    const nodeB = this.getNode(b);
    nodeA.link(nodeB, weight);
  }

  /** Disconnect two data items */
  disconnect(a, b) {
    const nodeA = this.nodes.get(a);
    const nodeB = this.nodes.get(b);
    if (nodeA && nodeB) {
      nodeA.unlink(nodeB);
    }
  }

  /**
   * A* pathfinding between two nodes.
   * Returns an array of GraphNodes from start to end, or null if no path.
   *
   * @param {GraphNode} start
   * @param {GraphNode} end
   * @returns {GraphNode[]|null}
   */
  aStar(start, end) {
    if (start === end) return [start];

    const openSet = new Set([start]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(start, 0);
    fScore.set(start, 0);

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let current = null;
      let bestScore = Infinity;
      for (const node of openSet) {
        const score = fScore.get(node) ?? Infinity;
        if (score < bestScore) {
          bestScore = score;
          current = node;
        }
      }

      if (current === end) {
        // Reconstruct path
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current);
          path.unshift(current);
        }
        return path;
      }

      openSet.delete(current);
      const currentG = gScore.get(current) ?? Infinity;

      for (const [neighbor, weight] of current.links) {
        const tentativeG = currentG + weight;
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG); // No heuristic (Dijkstra)
          openSet.add(neighbor);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Calculate the total cost of a path (sum of edge weights)
   * @param {GraphNode[]} path
   * @returns {number}
   */
  calculatePrice(path) {
    if (!path || path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += path[i].links.get(path[i + 1]) ?? 1;
    }
    return total;
  }

  /**
   * Get all nodes reachable from a starting node (BFS)
   * @param {GraphNode} start
   * @returns {Set<GraphNode>}
   */
  reachable(start) {
    const visited = new Set();
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      for (const [neighbor] of current.links) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    return visited;
  }
}

export { Graph, GraphNode };
export default Graph;
