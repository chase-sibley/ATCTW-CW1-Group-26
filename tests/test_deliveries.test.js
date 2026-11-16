import test from "node:test";
import assert from "node:assert/strict";
import {planDeliveryRoute} from "../dist/algorithms.js";
import {generated, floydWarshall, pathCost} from "./functions.js";


function permutations(a) {

    if (a.length <= 1) {
        
        return [a];

    }

    return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]))

}

const housesOf = (g) => g.nodes.filter((n) => n.type === "house").map((n) => n.id);


test("Exact Ordering is optimal compared to an independent brute force", () => {

    for (let seed = 1; seed <= 40; seed++) {

        const graph = generated(`exact_ordering-${seed}`, 16, 26, 5, seed % 2 ? "distance" : "random");

        const truth = floydWarshall(graph);

        const stops = housesOf(graph);

        const best = Math.min(...permutations(stops).map((o) => {

            let c = 0, cur = "depot";
            
            for (const s of o) {

                c += truth(cur, s);
                
                cur = s;

            }

            return c;

        }));

        const plan = planDeliveryRoute(graph, "depot", stops, {algorithm: "astar"});

        assert.equal(plan.orderingMethod, "exact");
        
        assert.equal(plan.cost, best);

    }

});


test("Plan visits every stop exactly once, starts at depot and path is a real connected path", () => {

    const graph = generated("visit", 25, 40, 7, "distance");

    const stops = housesOf(graph);

    const plan = planDeliveryRoute(graph, "depot", stops);

    assert.deepEqual([...plan.order].sort(), [...stops].sort());

    assert.equal(plan.path[0], "depot");

    for (const s of stops) {

        assert.ok(plan.path.includes(s));
    }

  assert.equal(pathCost(graph, plan.path), plan.cost);

  assert.equal(plan.legs.reduce((s, l) => s + l.cost, 0), plan.cost);

});


test("A* and Dijkstra deliver the same total cost for the same stops", () => {

    for (let seed = 1; seed <= 30; seed++) {

        const graph = generated(`same${seed}`, 20, 32, 6, seed % 2 ? "distance" : "random");

        const stops = housesOf(graph);

        const astar = planDeliveryRoute(graph, "depot", stops, {algorithm: "astar"});

        const dijk = planDeliveryRoute(graph, "depot", stops, {algorithm: "dijkstra", order: astar.order});

        assert.equal(dijk.cost, astar.cost);

        assert.ok(astar.exploredCount <= dijk.exploredCount);

    }

});


test("Forced order is respected", () => {

    const graph = generated("forced", 14, 22, 4);

    const stops = housesOf(graph);

    const reversed = [...stops].reverse();

    const plan = planDeliveryRoute(graph, "depot", stops, {order: reversed});

    assert.deepEqual(plan.order, reversed);

    assert.equal(plan.orderingMethod, "shared order");

});


test("Edge cases", () =>{

    const graph = generated("edge", 12, 18, 3);


    // No stops
    const none = planDeliveryRoute(graph, "depot", []);

    assert.deepEqual(none.path, ["depot"]);

    assert.equal(none.cost, 0);


    // Duplicate stops
    const houses = housesOf(graph);

    const duplicate = planDeliveryRoute(graph, "depot", [houses[0], houses[0], houses[0]]);

    assert.deepEqual(duplicate.order, [houses[0]]);


    // Depot as a stop
    const depot = planDeliveryRoute(graph, "depot", ["depot", houses[0]]);

    assert.deepEqual(depot.order, [houses[0]]);

});


test("Unreachable goal returns Infinity", () => {

    const graph = generated("unreachable", 12, 18, 3);

    const houses = housesOf(graph);

    graph.edges = graph.edges.filter((e) => e.from !== houses[0] && e.to !== houses[0]); // Make one house unreachable

    for (const algorithm of ["astar", "dijkstra"]) {

        const plan = planDeliveryRoute(graph, "depot", houses, {algorithm});

        assert.equal(plan.cost, Infinity);

        assert.deepEqual(plan.path, []);

    }

});