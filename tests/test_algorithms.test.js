import test from "node:test";
import assert from "node:assert/strict";
import { shortestPath, validateGraph, MinHeap, buildAdjacency, admissibleHeuristicScale } from "../dist/algorithms.js";
import { makeGraph, pathCost } from "./functions.js";


const BOTH = ["astar", "dijkstra"];


// For testing: A-D (10) is worse than A-B-C-D (6)
const detour = makeGraph(

    {A: [0, 0], B: [10, 0], C: [20, 0], D: [30, 0]},

    [["A", "D", 10], ["A", "B", 1], ["B", "C", 2], ["C", "D", 3]]

);

// Tests for both algorithms
for (const algorithm of BOTH) {

    // Test prefers cheaper path through more nodes
    test(`[${algorithm}] prefers cheaper multi-hop path over a costly direct edge`, () => {

        const r = shortestPath(detour, "A", "D", {algorithm});

        assert.deepEqual(r.path, ["A", "B", "C", "D"]);

        assert.equal(r.cost, 6);

    });

    // Test when start is equal to goal
    test(`[${algorithm}] start === goal gives 0 cost and single-node path`, () => {

        const r = shortestPath(detour, "B", "B", {algorithm});

        assert.deepEqual(r.path, ["B"]);

        assert.equal(r.cost, 0);

    });


    // Test when goal is unreachable
    test(`[${algorithm}] unreachable goal returns empty path and Infinity`, () => {

        const graph = makeGraph(
            {A: [0, 0], B: [10, 0], C: [100, 100]},
            [["A", "B", 5]]
        );

        const r = shortestPath(graph, "A", "C", {algorithm});

        assert.deepEqual(r.path, []);

        assert.equal(r.cost, Infinity);

    });

    
    // Test for an exception when there is an unknown node
    test(`[${algorithm}] unknown node ids exception`, () => {

        assert.throws(() => shortestPath(detour, "A", "UnknownABC", {algorithm}));

        assert.throws(() => shortestPath(detour, "UnknownABC", "A", {algorithm}));

    });


    // Test that a one-way edge returns both costs correctly
    test(`[${algorithm}] directed edges are one-way`, () => {


        const graph = makeGraph(
            {A: [0, 0], B: [10, 0]},
            [["A", "B", 4, true]]
        );

        assert.equal(shortestPath(graph, "A", "B", {algorithm}).cost, 4);

        assert.equal(shortestPath(graph, "B", "A", {algorithm}).cost, Infinity);
    
    });


    // Test that the shortest route is taken when presented with 2 roads starting and ending in the same nodes
    test(`[${algorithm}] use cheaper road for parallel roads`, () => {

        const graph = makeGraph(
            {A: [0, 0], B: [10, 0]},
            [["A", "B", 9], ["A", "B", 3]]
        );

        assert.equal(shortestPath(graph, "A", "B", {algorithm}).cost, 3);

    });


    // Test that when two paths to the same node cost the same, no error is found
    test(`[${algorithm}] equal-cost routes: cost is correct`, () => {

        const graph = makeGraph(
            {A: [0, 0], B: [10, 10], C: [10, -10], D: [20, 0]},
            [["A", "B", 5], ["B", "D", 5], ["A", "C", 5], ["C", "D", 5]]
        );

        const r = shortestPath(graph, "A", "D", {algorithm});

        assert.equal(r.cost, 10);

        assert.equal(pathCost(graph, r.path), 10);

    });


    // Test removing an edge causes a different route to the goal
    test(`[${algorithm}] removing an edge forces a detour`, () => {

        const closed = {...detour, edges: detour.edges.filter((e) => !(e.from === "B" && e.to === "C"))};

        const r = shortestPath(closed, "A", "D", {algorithm});

        assert.deepEqual(r.path, ["A", "D"]);

        assert.equal(r.cost, 10);

    });

    // Test having 0 paths makes the goal unreachable
    test(`[${algorithm}] removing the only edge makes the goal unreachable`, () => {

        const graph = makeGraph(
            {A: [0, 0], B: [10, 0]},
            [["A", "B", 5]]
        );

        const closed = {...graph, edges: []};

        assert.equal(shortestPath(closed, "A", "B", {algorithm}).cost, Infinity);

    });


    // Test that a path is fully valid
    test(`[${algorithm}] returned path is valid`, () => {

        const r = shortestPath(detour, "A", "D", {algorithm});

        assert.equal(r.path[0], "A");

        assert.equal(r.path.at(-1), "D");

        assert.equal(pathCost(detour, r.path), r.cost);

    });

}


// Tests for seperate algorithms

// Test the A* trap
test("A* trap: heuristic must not lead to a worse route", () => {

    const graph = makeGraph(
        {A: [0, 0], B: [50, 0], C: [100, 0], D: [50, 40]},
        [["A", "B", 100], ["B", "C", 100], ["A", "D", 20], ["D", "C", 20]]
    );

    assert.equal(shortestPath(graph, "A", "C", {algorithm: "astar"}).cost, 40);

    assert.deepEqual(shortestPath(graph, "A", "C", { algorithm: "astar" }).path, ["A", "D", "C"]);

});


// Test that both algorithms use their respective heuristics
test("Dijkstra uses a zero heuristic and A* uses a positive heuristic", () => {

    assert.equal(shortestPath(detour, "A", "D", {algorithm: "dijkstra"}).heuristicScale, 0);

    assert.ok(shortestPath(detour, "A", "D", {algorithm: "astar"}).heuristicScale > 0);

});


// Test functions

// Test the search log functionality
test("Search Log: Closed set only grows, first step is the start, last step is the goal", () => {

    const r = shortestPath(detour, "A", "D", {algorithm: "astar", captureLog: true});

    assert.equal(r.searchLog[0].current, "A");

    assert.equal(r.searchLog.at(-1).current, "D");

    for (let i = 1; i <r.searchLog.length; i++) {

        assert.ok(r.searchLog[i].closedSet.length === r.searchLog[i - 1].closedSet.length + 1);

    }

    assert.equal(r.exploredCount, r.searchLog.length);

});


// Test the capture log functionality
test("Capture Log: false returns no log but the same answer", () => {

    const a = shortestPath(detour, "A", "D", {captureLog: true});

    const b = shortestPath(detour, "A", "D", {captureLog: false});

    assert.equal(b.searchLog.length, 0);

    assert.equal(a.cost, b.cost);

    assert.deepEqual(a.path, b.path);

})

// Test the heuristic scale functionality
test("Heuristic Scale: 0 when no usable edges", () => {

    assert.equal(admissibleHeuristicScale(makeGraph(
                                            {A: [0, 0], B: [0, 0]},
                                            [["A", "B", 1]]
                                        )), 0);

});


// Test validate graph functionality
test("Validate Graph", () => {

    const ok = makeGraph(
        {A: [0, 0], B: [5, 5]},
        [["A", "B", 1]]
    );

    assert.deepEqual(validateGraph(ok), [])

    // Check depot functionailty
    const noDepot = { ...ok, nodes: ok.nodes.map((n) => ({...n, type: "junction"}))};

    assert.ok(validateGraph(noDepot).some((e) => /depot/i.test(e)));


    const twoDepots = { ...ok, nodes: ok.nodes.map((n) => ({...n, type: "depot"}))};

    assert.ok(validateGraph(twoDepots).some((e) => /depot/i.test(e)));


    // Check 2 of the same IDs
    const dupID = {...ok, nodes: [...ok.nodes, {...ok.nodes[1]}]};

    assert.ok(validateGraph(dupID).some((e) => /unique/i.test(e)));


    // Check for an invalid edge
    const badEdge = { ...ok, edges: [{id: "x", from: "D", to: "BadEdge", weight: 1}]};

    assert.ok(validateGraph(badEdge).some((e) => /missing node/i.test(e)));


    // Check for a self containing loop
    const selfLoop = { ...ok, edges: [{id: "x", from: "D", to: "D", weight: 1}]};

    assert.ok(validateGraph(selfLoop).some((e) => /itself/i.test(e)));


    // Check weights can only be positive or 0
    for (const weight of [0, -3, NaN, Infinity]) {

        const bad = {...ok, edges: [{id: "x", from: "D", to: "B", weight}]};

        assert.ok(validateGraph(bad).some((e) => /positive weight/i.test(e)), `weight ${weight}`);

    }

    // Check for invalid coorindates

    const badCoord = {...ok, nodes: [{...ok.nodes[0], x: NaN}]};

    assert.ok(validateGraph(badCoord).some((e) => /coordinates/i.test(e)));


    // Check that invalid input reports an error
    assert.ok(validateGraph(null).length > 0);

    assert.ok(validateGraph({nodes: []}).length > 0)

});


// Test build adjacency functionality
test("Build Adjacency: undirected edges appear in both directions, directed in one", () => {

    const graph = makeGraph(
        {A: [0, 0], B: [1, 1], C: [2, 2]}, 
        [["A", "B", 1], ["B", "C", 1, true]]
    );

    const adj = buildAdjacency(graph);

    assert.equal(adj.get("A").length, 1); // A -> B

    assert.equal(adj.get("B").length, 2); // B -> A, B -> C

    assert.equal(adj.get("C").length, 0); // None

});


test("MinHeap pops in priority order and is FIFO on ties", () => {

    const heap = new MinHeap();

    [["c", 3], ["a", 1], ["b2", 2], ["b1", 2], ["z", 0]].forEach(([v, p]) => heap.push(v, p));

    // b2 should be above b1 as it came first in the list
    assert.deepEqual([...Array(5)].map(() => heap.pop().value), ["z", "a", "b2", "b1", "c"]);

    assert.equal(heap.pop(), null);

});