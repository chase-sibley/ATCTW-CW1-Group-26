# A\* Postal Route Simulator

**Live site:** https://atctw-group.vercel.app/

## Contents

- [Project Outline](#project-outline)
- [Deployment](#deployment)
- [The Algorithm](#the-algorithm)
- [Tests](#tests)
- [Acknowledgements](#acknowledgements)
- [Member Statements](#member-statements)
- [GenAI Use](#genai-use)

---

## Project Outline

| | |
| --- | --- |
| **Title** | A\* Postal Route Simulator |
| **Selected Algorithm** | A\* and Dijkstra's Algorithm |
| **Problem** | A delivery van needs to find the most optimal and fastest route to visit each address on a map with multiple paths to take. |

### Intended Users

- Delivery drivers
- Postal companies
- Computer Science students
- Software developers and researchers

---

## Deployment

### Installation

The product runs in the browser and has no packages to install. You only need [Node.js](https://nodejs.org) 20.11 or newer to run it locally.

1. Unzip the project and open a terminal in the project folder (or its `dist` folder).
2. Run:

   ```bash
   npm start
   ```

3. Open the local IP in a web browser.

### How to Access

The project is deployed at https://atctw-group.vercel.app/ and needs no installation. The local version above works offline.

### How to Run Tests

The tests use Node's built-in test runner, so nothing needs installing. In the project folder, run:

```bash
node --test tests/*.test.js
```

---

## The Algorithm

### Pseudocode & Explanation

A\* finds the cheapest path between two nodes. Every node is given a score **f(n) = g(n) + h(n)**:

- **g(n)** is the total road cost travelled from the start so far
- **h(n)** is the straight-line distance from the node to the goal, scaled down if road costs are smaller than road lengths so it never overestimates
- A\* always expands the node with the lowest **f** next, using our own binary min-heap

Dijkstra's algorithm is the same code with **h = 0**. We use it as the comparison baseline.

```text
A*(start, goal):
    put start in the open set
    while the open set is not empty:
        n = node in the open set with the lowest f
        add n to the closed set
        if n is the goal: return the path and cost
        for each neighbour m of n that is not in the closed set:
            if g[n] + weight(n, m) < g[m]:
                g[m] = g[n] + weight(n, m)
                remember that m was reached from n
                put m in the open set with f = g[m] + h(m)
    return no route
```

To deliver to several addresses, the route is planned in four steps:

1. Run A\* from the depot to every address, and between every pair of addresses, and store the costs
2. Choose the order of stops: try every order for 8 addresses or fewer, otherwise use nearest-neighbour (always go to the closest address not yet visited)
3. Join the A\* paths for each leg into one route for the van
4. Record every node A\* opens and closes so the website can replay the search

### Time and Space Complexity

*V* is the number of nodes, *E* is the number of roads and *k* is the number of addresses.

| Part | Time | Space | Notes |
| --- | --- | --- | --- |
| One A\* search | O(E log V) | O(V) | Same worst case as Dijkstra, but A\* usually explores far fewer nodes |
| Working out all leg costs | O(k² · E log V) | O(k²) | |
| Trying every stop order (8 addresses or fewer) | O(k!) | | 8 addresses is 40,320 orders and 12 would be about 479 million, which is why it is capped at 8 |
| Nearest-neighbour (more than 8 addresses) | O(k²) | | Not always optimal |

---

## Tests

### Tests Covered

- Algorithms are optimal and work as intended
- Properties of algorithms are met (A\* is better than Dijkstra)
- Edge case handling
- Error handling
- Testing functions
- Testing how the algorithm deals with certain scenarios when delivering

### Automated Tests

The automated tests are run using Node and cover the different algorithms and functions used for the postal service website.

Tests cover the properties of each algorithm and if they can find the correct and quickest route to a location effectively; the A\* heuristic and priority queue; and testing a variety of maps with different special cases to see how the different functions handle it.

What is expected is that:
 - A* is always better (or equal to) Dijkstra's algorithm
 - Edge cases are handled by either error handling or exception thrown
 - All functions to help with delivering and finding the shortest route work properly

✔ Both algorithms and FloydWarshall agree on every pair for 300 random maps (396.4791ms)

✔ A* agrees with the Floyd-Warshall on sparse/disconnected graphs (104.3641ms)

✔ Heuristic is admissible (57.1446ms)

✔ Heuristic is consistent (6.5145ms)

✔ A* explores less nodes than Dijkstra (56.2577ms)

✔ A* will behave exactly like Dijkstra with 0 heuristic (0.2857ms)

✔ validateGraph() works for a different variety of maps (9.4697ms)

✔ [astar] prefers cheaper multi-hop path over a costly direct edge (1.8059ms)

✔ [astar] start === goal gives 0 cost and single-node path (0.1195ms)

✔ [astar] unreachable goal returns empty path and Infinity (0.1627ms)

✔ [astar] unknown node ids exception (0.2059ms)

✔ [astar] directed edges are one-way (0.1746ms)

✔ [astar] use cheaper road for parallel roads (0.1317ms)

✔ [astar] equal-cost routes: cost is correct (0.6214ms)

✔ [astar] removing an edge forces a detour (0.126ms)

✔ [astar] removing the only edge makes the goal unreachable (0.1565ms)

✔ [astar] returned path is valid (0.2553ms)

✔ [dijkstra] prefers cheaper multi-hop path over a costly direct edge (0.1395ms)

✔ [dijkstra] start === goal gives 0 cost and single-node path (0.0752ms)

✔ [dijkstra] unreachable goal returns empty path and Infinity (0.0594ms)

✔ [dijkstra] unknown node ids exception (0.0559ms)

✔ [dijkstra] directed edges are one-way (0.0487ms)

✔ [dijkstra] use cheaper road for parallel roads (0.0489ms)

✔ [dijkstra] equal-cost routes: cost is correct (0.0901ms)

✔ [dijkstra] removing an edge forces a detour (0.0874ms)

✔ [dijkstra] removing the only edge makes the goal unreachable (0.0876ms)

✔ [dijkstra] returned path is valid (0.0899ms)

✔ A* trap: heuristic must not lead to a worse route (0.173ms)

✔ Dijkstra uses a zero heuristic and A* uses a positive heuristic (0.1851ms)

✔ Search Log: Closed set only grows, first step is the start, last step is the goal (0.125ms)

✔ Capture Log: false returns no log but the same answer (0.142ms)

✔ Heuristic Scale: 0 when no usable edges (0.0583ms)

✔ Validate Graph (0.4437ms)

✔ Build Adjacency: undirected edges appear in both directions, directed in one (0.1006ms)

✔ MinHeap pops in priority order and is FIFO on ties (0.1254ms)

✔ Exact Ordering is optimal compared to an independent brute force (67.6586ms)

✔ Plan visits every stop exactly once, starts at depot and path is a real connected path (9.2141ms)

✔ A* and Dijkstra deliver the same total cost for the same stops (56.888ms)

✔ Forced order is respected (0.391ms)

✔ Edge cases (0.2228ms)

✔ Unreachable goal returns Infinity (0.5856ms)


ℹ tests 41

ℹ suites 0

ℹ pass 41

ℹ fail 0

ℹ cancelled 0

ℹ skipped 0

ℹ todo 0

ℹ duration_ms 710.2894



- A\* is always better than (or equal to) Dijkstra's algorithm
- Edge cases are handled by either error handling or an exception being thrown
- All functions to help with delivering and finding the shortest route work properly

### Manual Testing

The manual testing was done to make sure the experience for every user is satisfactory and to test if the website shows how the algorithms work.

Different tests on the website included:

- Edge case testing
- Building the map does not cause errors and is easy to use
- Testing the different buttons
- Making sure no crashes can occur

### Results

**Automated tests:** 41 tests, all pass (`node --test tests/*.test.js`).

| Test | Expected | Actual |
| --- | --- | --- |
| Cheaper route through more nodes (direct road costs 10, detour costs 6) | Path A, B, C, D with cost 6 | Matches |
| No route to the goal | Empty path and cost infinity | Matches |
| A\* and Dijkstra against Floyd–Warshall (an independent shortest-path method) on 300 random maps | Same route cost every time | All equal |
| Exact stop order against a brute force check on 40 random maps | Same total cost | All equal |

**A\* against Dijkstra:** average over 50 searches on random maps at each size. Both always found the same route cost.

| Nodes | A\* nodes explored | Dijkstra nodes explored |
| --- | --- | --- |
| 50 | 6.1 | 22.9 |
| 100 | 11.2 | 43.3 |
| 200 | 23.8 | 82.2 |
| 400 | 40.1 | 155.3 |
| 1000 | 38.3 | 391.7 |

A\* explores about 4 to 10 times fewer nodes, and the gap grows as the map gets bigger. The time per search is about the same, because A\* does extra work for the heuristic.

**Scaling with addresses:** planning 8 addresses on a 200-node map takes about 58 ms because every stop order is tried. At 9 addresses it switches to nearest-neighbour and takes about 6 ms.

**Manual testing:** (write what you actually tested, and any bug you found)

---

## Acknowledgements

### Limitations

**Maps and data**

- The maps are made up. There is no real road data, no real addresses and no real distances, so it cannot easily be used on real-world delivery problems without a way of importing real maps.
- Distances are straight lines on a flat canvas, not real geographic distances, and the map has a fixed size.
- There is no live traffic, no time of day and no one-way roads in the interface. The algorithm supports one-way roads, but the interface does not let you draw them.

**Routing**

- The route only covers one van. It does not return to the depot and does not consider parcel size, van capacity or delivery time windows.
- Stop order is only exact for 8 addresses or fewer. Above 8, the order uses nearest-neighbour, which is fast but not always optimal.
- Random road costs make A\* less effective, because the heuristic has to be scaled down to stay correct, so it behaves more like Dijkstra.

**Performance and usability**

- Very large maps with many addresses are slow because planning runs in the browser. For example, 100 addresses on 400 nodes can freeze the page for a few seconds.
- Impossible map settings (for example, more addresses than nodes) are adjusted quietly instead of showing an error.
- Maps cannot be saved or loaded.
- The runtimes shown are single measurements in the browser, so they vary between runs.

### Dependencies

| Dependency | Purpose |
| --- | --- |
| [Node.js](https://nodejs.org) 20.11 or newer | Running the local server and the tests |
| A modern web browser | Must support JavaScript modules and SVG |
| npm packages | None. All algorithm code, including the priority queue, is our own |

### Third-Party Resources

- [Node](https://nodejs.org)

---

## Member Statements

### Oliver Methold

I was the scrum master, responsible for planning, dividing the work, and coordinating the team through stand-ups and sprint reviews. I managed the presentation slides and also contributed to quality assurance.

### Sam Taylor-King

I was in charge of the random map generator, it produces the map the simulator runs on and takes the users settings from the website such as number of nodes, and returns a map in the format.

### Alistair Bishop

I was in charge of developing the editable map settings, all input surfaces on the site, functionality of the custom placement of junctions, roads, depots and houses, weight implementation for road distances, van logic and the implementation of the A\* and Dijkstra simulations.

### Ted Turner

I was in charge of developing a user interface and implementing it into the source code.

### Chase Sibley

I was in charge of testing and communicating with team members what needed changing. Tests cover the whole scope of the website and the functionality of each algorithm.

---

## GenAI Use

### Sam Taylor-King

**Entry 1**

- **I gave Claude:** to help me break the generator into steps
- **It gave me:** how Alistair's code works
- **I used it for:** to help me deciding how my code integrates with Alistair's

**Entry 2**

- **I gave Claude:** my code and `SyntaxError: Identifier 'getMap' has already been declared`
- **It gave me:** there were two functions called `getMap`; after I removed the duplicate, the same error happened again, and Claude pointed out there was a function call `return createDemoMap();` outside a function
- **I used it for:** fixing the bugged code, and the script then ran

### Alistair Bishop

- **I gave Claude:** our original requirements and job allocations
- **It gave me:** a list of deliverables I need to achieve and by what date
- **I used it for:** keeping good time management, giving suitable time for testing and interface design, and keeping to the rigid constraints of my part of the group project

### Chase Sibley

- **I gave Claude:** the source code for the project
- **It gave me:** types of tests with examples and how to run tests in JavaScript using Node
- **I used it for:** writing and planning different tests for the algorithm and functions used for the project

### Ted Turner

- **I gave Claude:** prompts of what to look for in similar sites and prompts about how to implement ideas
- **It gave me:** research on good UI practice and tutorials on how to design certain UI features
- **I used it for:** researching established UI behaviour from existing websites and how to intuitively design UI so that the experience flows

### Oliver Methold

- **I gave Claude:** our project idea, team roles and the coursework brief, with prompts like "make a document for our group project", "check this against the mark scheme" and "is this allowed in AI-assisted modules"
- **It gave me:** a project plan doc covering features, data model, A\* design, complexity, testing, sprint timeline, risks and limitations, plus a check against the mark scheme
- **I used it for:** planning the project, dividing work, tracking deadlines, and checking we met every marking criterion
- **How I checked it:** compared the plan against the brief myself and confirmed the complexity figures with our own tests
