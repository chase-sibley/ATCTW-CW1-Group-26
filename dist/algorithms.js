const EPSILON = 1e-9;

export class MinHeap {
  constructor() {
    this.items = [];
    this.sequence = 0;
  }

  get size() {
    return this.items.length;
  }

  push(value, priority) {
    const item = { value, priority, sequence: this.sequence++ };
    this.items.push(item);
    this.#bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const root = this.items[0];
    const end = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = end;
      this.#sinkDown(0);
    }
    return root;
  }

  snapshot() {
    return [...this.items]
      .sort((a, b) => a.priority - b.priority || a.sequence - b.sequence)
      .map(({ value, priority }) => ({ value, priority }));
  }

  #compare(a, b) {
    return a.priority < b.priority ||
      (Math.abs(a.priority - b.priority) < EPSILON && a.sequence < b.sequence);
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.#compare(this.items[index], this.items[parent])) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  #sinkDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.#compare(this.items[left], this.items[smallest])) {
        smallest = left;
      }
      if (right < this.items.length && this.#compare(this.items[right], this.items[smallest])) {
        smallest = right;
      }
      if (smallest === index) return;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

export function euclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildAdjacency(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight, edgeId: edge.id });
    if (!edge.directed) {
      adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight, edgeId: edge.id });
    }
  }
  return adjacency;
}

export function validateGraph(graph) {
  const errors = [];
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return ["Graph must contain node and edge arrays."];
  }

  const ids = new Set();
  for (const node of graph.nodes) {
    if (!node.id || ids.has(node.id)) errors.push(`Node IDs must be unique: ${node.id || "missing ID"}.`);
    ids.add(node.id);
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push(`Node ${node.id} needs valid coordinates.`);
  }

  const depotCount = graph.nodes.filter((node) => node.type === "depot").length;
  if (depotCount !== 1) errors.push(`Graph must contain exactly one depot; found ${depotCount}.`);

  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push(`Edge ${edge.id || "(unnamed)"} references a missing node.`);
    if (edge.from === edge.to) errors.push(`Edge ${edge.id || "(unnamed)"} cannot connect a node to itself.`);
    if (!Number.isFinite(edge.weight) || edge.weight <= 0) errors.push(`Edge ${edge.id || "(unnamed)"} must have a positive weight.`);
  }

  return errors;
}

export function admissibleHeuristicScale(graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  let minimumRatio = Infinity;
  for (const edge of graph.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    const distance = euclidean(from, to);
    if (distance > EPSILON) minimumRatio = Math.min(minimumRatio, edge.weight / distance);
  }
  return Number.isFinite(minimumRatio) ? Math.max(0, minimumRatio) : 0;
}

function reconstructPath(cameFrom, goal) {
  const path = [goal];
  while (cameFrom.has(path[0])) path.unshift(cameFrom.get(path[0]));
  return path;
}

export function shortestPath(graph, startId, goalId, options = {}) {
  const algorithm = options.algorithm ?? "astar";
  const captureLog = options.captureLog ?? true;
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(graph);
  if (!nodes.has(startId) || !nodes.has(goalId)) {
    throw new Error("Start and goal must both exist in the graph.");
  }

  if (startId === goalId) {
    return { path: [startId], cost: 0, exploredCount: 0, searchLog: [] };
  }

  const heuristicScale = algorithm === "dijkstra" ? 0 : admissibleHeuristicScale(graph);
  const goalNode = nodes.get(goalId);
  const heuristic = (id) => euclidean(nodes.get(id), goalNode) * heuristicScale;
  const open = new MinHeap();
  const gScore = new Map([[startId, 0]]);
  const cameFrom = new Map();
  const closed = new Set();
  const searchLog = [];
  open.push(startId, heuristic(startId));

  while (open.size > 0) {
    const next = open.pop();
    const current = next.value;
    if (closed.has(current)) continue;
    const currentG = gScore.get(current);
    const currentH = heuristic(current);
    const expectedF = currentG + currentH;
    if (next.priority > expectedF + EPSILON) continue;

    closed.add(current);
    const changes = [];

    if (current !== goalId) {
      for (const neighbour of adjacency.get(current) ?? []) {
        if (closed.has(neighbour.node)) continue;
        const tentative = currentG + neighbour.weight;
        if (tentative + EPSILON < (gScore.get(neighbour.node) ?? Infinity)) {
          cameFrom.set(neighbour.node, current);
          gScore.set(neighbour.node, tentative);
          const h = heuristic(neighbour.node);
          open.push(neighbour.node, tentative + h);
          changes.push({ node: neighbour.node, via: current, g: tentative, h, f: tentative + h });
        }
      }
    }

    if (captureLog) {
      const openBest = new Map();
      for (const item of open.snapshot()) {
        if (!closed.has(item.value) && !openBest.has(item.value)) openBest.set(item.value, item.priority);
      }
      searchLog.push({
        current,
        g: currentG,
        h: currentH,
        f: expectedF,
        openSet: [...openBest.entries()].map(([id, f]) => ({ id, f })),
        closedSet: [...closed],
        changes
      });
    }

    if (current === goalId) {
      return {
        path: reconstructPath(cameFrom, goalId),
        cost: currentG,
        exploredCount: closed.size,
        searchLog,
        heuristicScale
      };
    }
  }

  return {
    path: [],
    cost: Infinity,
    exploredCount: closed.size,
    searchLog,
    heuristicScale
  };
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const output = [];
  for (let index = 0; index < items.length; index += 1) {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) output.push([items[index], ...tail]);
  }
  return output;
}

function pairKey(from, to) {
  return `${from}\u0000${to}`;
}

function calculatePairwise(graph, locations, algorithm) {
  const pairs = new Map();
  for (const from of locations) {
    for (const to of locations) {
      if (from === to) continue;
      pairs.set(pairKey(from, to), shortestPath(graph, from, to, { algorithm, captureLog: false }));
    }
  }
  return pairs;
}

function routeCost(order, start, pairs) {
  let total = 0;
  let current = start;
  for (const destination of order) {
    const result = pairs.get(pairKey(current, destination));
    if (!result || !Number.isFinite(result.cost)) return Infinity;
    total += result.cost;
    current = destination;
  }
  return total;
}

function chooseNearestNeighbour(start, destinations, pairs) {
  const remaining = new Set(destinations);
  const order = [];
  let current = start;
  while (remaining.size > 0) {
    let best = null;
    let bestCost = Infinity;
    for (const destination of remaining) {
      const cost = pairs.get(pairKey(current, destination))?.cost ?? Infinity;
      if (cost < bestCost) {
        best = destination;
        bestCost = cost;
      }
    }
    if (best === null || !Number.isFinite(bestCost)) return [];
    order.push(best);
    remaining.delete(best);
    current = best;
  }
  return order;
}

export function planDeliveryRoute(graph, depotId, destinationIds, options = {}) {
  const algorithm = options.algorithm ?? "astar";
  const exactLimit = options.exactLimit ?? 8;
  const forcedOrder = options.order ?? null;
  const destinations = [...new Set(destinationIds)].filter((id) => id !== depotId);
  if (destinations.length === 0) {
    return { path: [depotId], cost: 0, order: [], legs: [], exploredCount: 0, orderingMethod: "none" };
  }

  const pairs = calculatePairwise(graph, [depotId, ...destinations], algorithm);
  let order;
  let orderingMethod;

  if (forcedOrder) {
    order = [...forcedOrder];
    orderingMethod = "shared order";
  } else if (destinations.length <= exactLimit) {
    orderingMethod = "exact";
    let bestCost = Infinity;
    order = [];
    for (const candidate of permutations(destinations)) {
      const cost = routeCost(candidate, depotId, pairs);
      if (cost < bestCost) {
        bestCost = cost;
        order = candidate;
      }
    }
  } else {
    orderingMethod = "nearest-neighbour";
    order = chooseNearestNeighbour(depotId, destinations, pairs);
  }

  if (order.length !== destinations.length) {
    return { path: [], cost: Infinity, order, legs: [], exploredCount: 0, orderingMethod };
  }

  const path = [];
  const legs = [];
  let current = depotId;
  let cost = 0;
  let exploredCount = 0;

  for (const destination of order) {
    const leg = shortestPath(graph, current, destination, { algorithm, captureLog: true });
    if (!Number.isFinite(leg.cost)) {
      return { path: [], cost: Infinity, order, legs, exploredCount, orderingMethod };
    }
    path.push(...(path.length === 0 ? leg.path : leg.path.slice(1)));
    cost += leg.cost;
    exploredCount += leg.exploredCount;
    legs.push({ from: current, to: destination, ...leg });
    current = destination;
  }

  return { path, cost, order, legs, exploredCount, orderingMethod };
}
