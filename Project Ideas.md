# ECM3428 – Algorithms That Changed the World
## Group Project Ideas

### 1. Smart Parcel Delivery Planner (ExeterRoute)

**Algorithm:** A* Search

**Problem:** Delivery drivers need to find efficient routes between a depot and multiple parcel delivery addresses in Exeter.

**How it works:**
- Users enter a starting depot address and multiple delivery addresses in Exeter.
- The application displays the locations on an interactive map.
- A* calculates the route between locations.
- The system displays the delivery order, total distance and estimated travel time.
- Users can add road closures or obstacles and recalculate the route.
- The application visualises the nodes explored by A* and the final route.

**Advanced features:**
- Compare A* with Dijkstra's algorithm.
- Show the number of nodes explored and execution time.
- Compare different delivery-ordering strategies.
- Allow users to add, remove or modify delivery addresses.

**Why it is a good project:** It solves a real-world logistics problem, provides an interactive user experience and allows the group to demonstrate algorithm implementation, correctness and performance analysis.

---

### 2. Exeter Smart Route Explorer

**Algorithm:** A* Search

Users select a starting point and destination in Exeter. The application finds the shortest path and visualises how A* explores the road network.

**Features:**
- Select start and destination points on a map.
- Add obstacles or blocked roads.
- Choose between shortest-distance and fastest-route modes.
- Animate the search process.
- Compare A* with Dijkstra's algorithm.

---

### 3. Multi-Stop Delivery Optimiser

**Algorithms:** A* Search and a delivery-order optimisation algorithm

The application helps delivery drivers plan routes that visit multiple addresses efficiently.

**Features:**
- Enter 10–50 delivery addresses.
- Calculate a suitable order for visiting each destination.
- Use A* to find paths between delivery stops.
- Display the total distance and estimated delivery time.
- Compare the optimised delivery order with the original order.

**Why it is interesting:** A* finds paths between locations, while a separate algorithm or heuristic determines the order in which destinations should be visited.

---

### 4. EcoDelivery Exeter

**Algorithm:** A* Search

The application finds delivery routes that minimise estimated fuel consumption, energy use or carbon emissions.

**Features:**
- Compare the shortest route with a lower-emissions route.
- Assign different costs to roads.
- Display estimated energy consumption and emissions.
- Simulate electric-vehicle charging stops.

**Why it is interesting:** It introduces sustainability and demonstrates how different cost functions affect the routes selected by an algorithm.

---

### 5. Road Closure and Emergency Delivery Planner

**Algorithm:** A* Search

The application finds alternative delivery routes when roads become blocked or unavailable.

**Features:**
- Simulate road closures.
- Recalculate routes when conditions change.
- Compare the original and alternative routes.
- Visualise the nodes explored before and after a road closure.

**Why it is interesting:** It provides a practical use case and makes it easy to demonstrate the algorithm during the group interview.

---

### 6. A* Algorithm Learning Simulator

**Algorithm:** A* Search

An interactive application that teaches users how A* works through step-by-step visualisation.

**Features:**
- Display the open and closed sets.
- Visualise `g(n)`, `h(n)` and `f(n) = g(n) + h(n)`.
- Allow users to draw obstacles.
- Change the heuristic and observe the results.
- Compare A* with Dijkstra's algorithm.

**Why it is interesting:** It focuses on algorithmic understanding and makes it easier to explain the implementation during the interview.

---

## Recommended Project: ExeterRoute

I recommend combining ideas 1, 3 and 5 into a single product called **ExeterRoute — Intelligent Parcel Delivery Planner**.

### Main Workflow

1. The user enters a depot address in Exeter.
2. The user adds multiple parcel delivery addresses.
3. The application displays the locations on a map.
4. The system determines a delivery order and uses the group's own A* implementation to find paths between stops.
5. The user can watch the algorithm explore the road network.
6. The application reports total distance, estimated travel time and nodes explored.
7. The user can simulate a road closure and calculate an alternative route.
8. The application compares A* with Dijkstra's algorithm.

### Suggested Technologies

- **Frontend:** React or HTML, CSS and JavaScript.
- **Interactive map:** Leaflet.
- **Map data:** OpenStreetMap.
- **Address lookup:** A geocoding service.
- **Algorithm implementation:** A* search implemented by the group.
- **Testing:** Automated tests using small, known road networks and larger datasets.

Established libraries can be used for maps and address lookup, but the group should implement the core A* algorithm independently.

### Important Algorithmic Consideration

A* finds an optimal path between two locations when its heuristic is appropriate. It does not automatically determine the optimal order for visiting multiple delivery addresses.

The project should therefore use:
- **A* search** to find paths between individual locations.
- **A separate delivery-ordering strategy**, such as nearest neighbour, to determine the order of stops.

The group can evaluate how effective the delivery-ordering strategy is by comparing its results with alternative strategies.

### Evaluation and Marking Criteria

- **Algorithm implementation:** Implement A* independently.
- **Correctness:** Test networks with known optimal paths, unreachable destinations and alternative routes.
- **Performance:** Measure execution time, nodes explored and memory use across different network sizes.
- **Comparison:** Compare A* with Dijkstra's algorithm.
- **Visualisation:** Show explored nodes, the final route and route costs.
- **Usability:** Provide address entry, map interaction and clear results.
- **Limitations:** Discuss map-data accuracy, traffic assumptions, heuristic choice and the difference between a good delivery order and a globally optimal one.

### Final Recommendation

ExeterRoute offers a practical, demonstrable product that addresses the coursework requirements for algorithm implementation, complexity analysis, testing and evaluation. It also provides opportunities for each group member to contribute to the algorithm, interface, testing, visualisation or performance analysis.
