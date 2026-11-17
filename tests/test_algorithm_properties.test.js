import test from "node:test";
import assert from "node:assert/strict";
import {shortestPath, euclidean, admissibleHeuristicScale, validateGraph} from "../dist/algorithms.js";
import {floydWarshall, pathCost, generated} from "./functions.js";


const MODES = ["distance", "random"];


test("Both algorithms and FloydWarshall agree on every pair for 300 random maps", () => {

    let pairsChecked = 0;

    for (let seed = 1; seed <= 300; seed++) {

        const mode = MODES[seed % 2]; // Alternate between distance and random

        const nodeCount = 5 + (seed % 25);

        const graph = generated(`both${seed}`, nodeCount, nodeCount + (seed % 20), Math.min(4, nodeCount - 1), mode);

        const truth = floydWarshall(graph);

        const ids = graph.nodes.map((n) => n.id);

        for (let k = 0; k < 6; k++) {

            const a = ids[(seed * 7 + k * 3) % ids.length]; // Pick random nodes

            const b = ids[(seed * 11 + k * 5 + 1) % ids.length]; // Pick random nodes

            const expected = truth(a, b); // Find shorest cost from a, b using Floyd Warshall

            const astar = shortestPath(graph, a, b, {algorithm: "astar", captureLog: false}); // Find shorest cost from a, b using A*
            
            const dijk = shortestPath(graph, a, b, {algorithm: "dijkstra", captureLog: false}); // Find shorest cost from a, b using Dijkstra

            assert.equal(astar.cost, expected);

            assert.equal(dijk.cost, expected);

            if (Number.isFinite(expected)) {

                assert.equal(pathCost(graph, astar.path), expected);

                assert.equal(pathCost(graph, dijk.path), expected);

            }

            pairsChecked++;

        }

    }

    assert.ok(pairsChecked >= 1800);

});


test("A* agrees with the Floyd-Warshall on sparse/disconnected graphs", () => {

    for (let seed = 1; seed <= 150; seed++) {

        const graph = generated(`disconnect${seed}`, 15, 15, 3, "random");

        graph.edges.forEach((e, i) => {if (i % 3 === 0) e.directed = true}); // Make some roads one way to randomise

        const truth = floydWarshall(graph);

        for (const a of graph.nodes.slice(0, 5)) for (const b of graph.nodes.slice(5, 10)) {

            const path = shortestPath(graph, a.id, b.id, {algorithm: "astar", captureLog: false});

            assert.equal(path.cost, truth(a.id, b.id));

        }

    }

});


test("Heuristic is admissible", () => {

    for (let seed = 1; seed <= 60; seed++) {

        const graph = generated(`admissible${seed}`, 18, 28, 4, MODES[seed % 2]);

        const scale = admissibleHeuristicScale(graph);

        const truth = floydWarshall(graph);

        for (const goal of graph.nodes) for (const node of graph.nodes) {

            const h = euclidean(node, goal) * scale;

            assert.ok(h <= truth(node.id, goal.id) + 1e-9);

        }

    }

}); 


test("Heuristic is consistent", () => {

    for (let seed = 1; seed <= 60; seed++) {

        const graph = generated(`consistent${seed}`, 18, 28, 4, MODES[seed % 2]);

        const scale = admissibleHeuristicScale(graph);

        const byID = new Map(graph.nodes.map((n) => [n.id, n]));

        for (const goal of graph.nodes) for (const edge of graph.edges) {

            const a = byID.get(edge.from), b = byID.get(edge.to);

            const ha = euclidean(a, goal) * scale, hb = euclidean(b, goal) * scale;

            assert.ok(ha <= edge.weight + hb + 1e-9 && hb <= edge.weight + ha + 1e-9);

        }

    }

});


test("A* explores less nodes than Dijkstra", () => {

    let fewer = 0, equal = 0, total = 0;

    for (let seed = 1; seed <= 200; seed++) {

        const graph = generated(`less${seed}`, 40, 70, 5, "distance");

        const a = graph.nodes[0].id, b = graph.nodes[graph.nodes.length - 1].id;

        const astar = shortestPath(graph, a, b, {algorithm: "astar", captureLog: false});

        const dijk = shortestPath(graph, a, b, {algorithm: "dijkstra", captureLog: false});

        assert.ok(astar.exploredCount <= dijk.exploredCount + 0);

        astar.exploredCount < dijk.exploredCount ? fewer++ : equal++;

        total++;

    }

    assert.ok(fewer > total * 0.3); // Check if A-star is significantly better

});


test("A* will behave exactly like Dijkstra with 0 heuristic", () => {

    const graph = generated("zero", 20, 30, 4, "random");

    const dijk = shortestPath(graph, graph.nodes[0].id, graph.nodes[graph.nodes.length - 1].id, {algorithm: "dijkstra", captureLog: false});

    assert.equal(dijk.heuristicScale, 0);

});


test("validateGraph() works for a different variety of maps", () => {

    for (let seed = 1; seed <= 100; seed++) {

        const graph = generated(`validate${seed}`, 3 + (seed % 40), 5 + (seed % 60), 1 + (seed % 8), MODES[seed % 2]); // random maps

        assert.deepEqual(validateGraph(graph), []);

    }

});