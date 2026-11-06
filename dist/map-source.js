/*
  SPEC (from the original file, kept for reference)

  INPUT (settings): nodeCount, edgeCount, addressCount, seed, weightMode ("distance" | "random")

  OUTPUT:
    nodes:   [{ id, x, y, type: "depot" | "house" | "junction", label }]
    edges:   [{ id, from, to, weight (> 0), directed }]
    parcels: [{ id, contents, destination (house id) }]
    bounds:  { width, height }

  RULES:
    - Exactly one node has type "depot".
    - Every node id and edge id is unique.
    - Every edge references two existing node ids.
    - Every edge weight is greater than zero.
    - Every parcel destination is an existing house id.
    - The graph should be connected from the depot.
    - Coordinates should fit inside bounds.
    - Increase bounds for large maps; the UI already supports pan and zoom.
*/

export function getMap(settings = {}) {
  const random = makeRandom(settings.seed);

  // Read the input, with a fallback if a value is missing
  const nodeCount    = settings.nodeCount    ?? 10;
  const edgeCount    = settings.edgeCount    ?? 15;
  const addressCount = settings.addressCount ?? 3;
  const weightMode   = settings.weightMode   ?? "distance";

  // Safety checks
  const houses = Math.min(addressCount, nodeCount - 1); // leave room for the depot
  const roads  = Math.max(edgeCount, nodeCount - 1);    // enough roads to connect everything

    // Map size: grows with the number of nodes, never smaller than 1000 x 620
  const width  = Math.round(Math.max(1000, Math.sqrt(nodeCount) * 150));
  const height = Math.round(width * 0.62);
  const bounds = { width, height };

  // Place the nodes
  const nodes = placeNodes(nodeCount, houses, bounds, random);
    // Connect the roads
  const edges = connectRoads(nodes);
  addExtraRoads(nodes, edges, roads);

  // Give every road its cost
  addWeights(nodes, edges, weightMode, random);

  // One parcel for every house
  const parcels = makeParcels(nodes, random);
  


    return { bounds, nodes, edges, parcels };
}

// Gives every node a random x/y and a type: 1 depot, then houses, then junctions.
function placeNodes(nodeCount, houses, bounds, random) {
  const margin = 50; // keep nodes away from the edge of the map
  const minGap = 60; // try to keep nodes at least this far apart
  const nodes = [];

  for (let i = 0; i < nodeCount; i++) {
    // 1. Pick a random spot. If it's too close to another node, try again (up to 30 times).
    let x, y;
    for (let attempt = 0; attempt < 30; attempt++) {
      x = Math.round(margin + random() * (bounds.width - 2 * margin));
      y = Math.round(margin + random() * (bounds.height - 2 * margin));
      const tooClose = nodes.some((n) => Math.hypot(n.x - x, n.y - y) < minGap);
      if (!tooClose) break;
    }

    // 2. Decide what kind of node it is.
    if (i === 0) {
      nodes.push({ id: "depot", x, y, type: "depot", label: "Depot" });
    } else if (i <= houses) {
      nodes.push({ id: `house_${i}`, x, y, type: "house", label: `House ${i}` });
    } else {
      const j = i - houses;
      nodes.push({ id: `j${j}`, x, y, type: "junction", label: `J${j}` });
    }
  }

  return nodes;
}

// Joins every node into one network: each node connects to the closest node made before it.
function connectRoads(nodes) {
  const edges = [];

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];

    // Find the closest node among the ones already connected (nodes 0 to i-1)
    let closest = nodes[0];
    for (let k = 1; k < i; k++) {
      if (distance(node, nodes[k]) < distance(node, closest)) closest = nodes[k];
    }

    edges.push({ id: `e${edges.length + 1}`, from: closest.id, to: node.id, directed: false });
  }

  return edges;
}

// Adds the shortest missing roads until there are `roads` in total.
function addExtraRoads(nodes, edges, roads) {
  // 1. Remember which pairs of nodes already have a road
  const hasRoad = new Set(edges.map((e) => roadKey(e.from, e.to)));

  // 2. List every pair of nodes that doesn't have a road yet, with its length
  const options = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let k = i + 1; k < nodes.length; k++) {
      if (!hasRoad.has(roadKey(nodes[i].id, nodes[k].id))) {
        options.push({ a: nodes[i], b: nodes[k], length: distance(nodes[i], nodes[k]) });
      }
    }
  }

  // 3. Put the shortest ones first
  options.sort((p, q) => p.length - q.length);

  // 4. Add roads until we hit the target (or run out of pairs)
  for (const option of options) {
    if (edges.length >= roads) break;
    edges.push({ id: `e${edges.length + 1}`, from: option.a.id, to: option.b.id, directed: false });
  }

  return edges;
}

// The same label for a road whichever way round it's written: "j1|j2" for j1-j2 and j2-j1
function roadKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Sets edge.weight on every road: its length ("distance") or a random 1-100 ("random").
function addWeights(nodes, edges, weightMode, random) {
  // Look up a node by its id, e.g. byId["j3"]
  const byId = {};
  for (const node of nodes) byId[node.id] = node;

  for (const edge of edges) {
    if (weightMode === "random") {
      edge.weight = 1 + Math.floor(random() * 100);
    } else {
      const length = distance(byId[edge.from], byId[edge.to]);
      edge.weight = Math.max(1, Math.round(length / 10));
    }
  }
}

// Makes one parcel for each house, with random contents.
function makeParcels(nodes, random) {
  const contentsList = ["Books", "Medicine", "Shoes", "Groceries", "Laptop", "Flowers", "Toys", "Clothes"];
  const parcels = [];

  for (const node of nodes) {
    if (node.type !== "house") continue; // skip the depot and junctions

    const contents = contentsList[Math.floor(random() * contentsList.length)];
    parcels.push({ id: `parcel_${parcels.length + 1}`, contents, destination: node.id });
  }

  return parcels;
}

// Straight-line distance between two nodes
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}


// Same seed in => same numbers out. Each call to random() gives 0 to 1.
function makeRandom(seed = "default") {
  let n = 0;
  for (const ch of String(seed)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;

  return function random() {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

