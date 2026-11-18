import { getMap } from "../dist/map-source.js";

// Build a graph
export function makeGraph(nodes, edges) {

    return {

        nodes: Object.entries(nodes).map(([id, [x, y]], i) => ({
            id, x, y, type: i === 0 ? "depot" : "junction", label: id // 1st node is depot, rest are junctions
        })),

        edges: edges.map(([from, to, weight, directed = false], i) => ({
            id: `e${i + 1}`, from, to, weight, directed
        }))

    };

}


// Floyd-Warshall algorithm can be used to test A* and Dijkstra's algorithm seperately
// No heuristic nor priorty queue
export function floydWarshall(graph) {

    // Set table
    const ids = graph.nodes.map((n) => n.id);

    const d = new Map()

    for (const a of ids) for (const b of ids) d.set(a + "|" + b, a === b ? 0 : Infinity);

    // Roads
    for (const edge of graph.edges) {

        const k1 = edge.from + "|" + edge.to, k2 = edge.to + "|" + edge.from;

        d.set(k1, Math.min(d.get(k1), edge.weight));

        if (!edge.directed) d.set(k2, Math.min(d.get(k2), edge.weight)); // If undirected, record weight for both directions

    }

    // Check for shortest route
    for (const k of ids) for (const i of ids) for (const j of ids) {

        const via = d.get(i + "|" + k) + d.get(k + "|" + j);

        if (via < d.get(i + "|" + j)) d.set(i + "|" + j, via)

    }

    return (a, b) => d.get(a + "|" + b)

}


export function pathCost(graph, path) {

    let total = 0;

    for (let i = 0; i < path.length - 1; i++) {

        const options = graph.edges.filter((e) =>
        (e.from === path[i] && e.to === path[i + 1]) ||
        (!e.directed && e.to === path[i] && e.from === path[i + 1]));

        if (options.length === 0) return NaN; // for invalid roads

        total += Math.min(...options.map((e) => e.weight));

    }

    return total;

}


export function generated(seed, nodes = 20, edges = 30, addresses = 6, weightMode = "distance") {

    return getMap({seed, nodeCount: nodes, edgeCount: edges, addressCount: addresses, weightMode});

}
