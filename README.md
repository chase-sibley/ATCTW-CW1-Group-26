# README
## Project Outline
### Title
A* Postal Route Simulator
### Selected Algorithm
A* and Dijkstra's Algorithm
### Problem
A delivery van needs to find the most optimal and fastest route to visit each address on a map with mutiple paths to take.
### Intended Users
 - Delivery Drivers
 - Postal Companies
 - Computer Science students
 - Software developers and researchers

## Deployement
### Installation
### How to access - https://atctw-group.vercel.app/
### How to run tests
Tests are run using Node (https://nodejs.org).
In terminal, run:
> node --test tests/*.test.js

## The Algorithm
### Pseudocode & Explaination
### Time and Space Complexity

## Tests
### Tests covered
 - Algorithms are optimal and work as intended
 - Properties of algorithms are met (A* is better than Dijkstra)
 - Edge case handling
 - Error handling
 - Testing functions
 - Testing how the algorithm deals with certain scenarios when delivering
### Automated Tests
The automated tests are ran using nodes and cover the different algorithms and functions used for the postal service website.
Tests cover the properties of each algorithm and if they can find the correct and quickest route to a location effectively; the A* heuristic and priority queue; and testing a variety of maps with different special cases to see how the different functions handle it.
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


### Manual Testing
The manual testing was done to make sure the experience for every user is satisfactory and to test if the website shows how the algorithms work. 
Different tests on the website included edge case testing; building the map does not cause errors and is easy to use; testing the different buttons; and making sure no crashes can occur.
### Results
Automated tests: All pass

Manuel testing: All working and no known issues

## Acknowledgements
### Limitations
### Dependencies
### Third Party Resources
Node: https://nodejs.org

## Member Statements
### Oliver Methold
I was the scrum master, responsible for planning, dividing the work, and coordinating the team through stand-ups and sprint reviews. I managed the the presentation slides and also contributed to quality assurance.
### Sam Taylor-King
I was in charge of the random map generator, it produces the map the simulator runs on and takes the users settings from the website such as number of nodes, and returns a map in the format. 
### Alistair Bishop
I was in charge of developing the editable map settings, all input surfaces on the site, functionality of the custom placement of junctions, roads, depots and houses, weight implementation for road distances, van logic and the implementation of the A* and Dijkstra simulations.
### Ted Turner
I was in charge of developing a user interface and implementing it into the source code.
### Chase Sibley
I was in charge of testing and communicating with team members what needed changing. Tests cover the whole scope of the website and
the functionality of each algorithm.
### Sam Taylor-King
I was in charge of the random map generator, it produces the map the simulator runs on and takes the users settings from the website such as number of nodes, and returns a map in the format. 
### Alistair Bishop
I was in charge of developing the editable map settings, all input surfaces on the site, functionality of the custom placement of junctions, roads, depots and houses, weight implementation for road distances, van logic and the implementation of the A* and Dijkstra simulations.
### Ted Turner
I was in charge of developing a user interface and implementing it into the source code.
### Chase Sibley
I was in charge of testing and communicating with team members what needed changing. Tests cover the whole scope of the website and
the functionality of each algorithm.

## GenAI use
### Sam Taylor - King:
#### I gave claude:  to help me  break the generator into steps
#### It gave me: How alistairs code works 
#### I used it for: to help me deciding how my code integrates to alistairs

#### I gave claude: My code and "SyntaxError: Identifier 'getMap' has already been declared"
#### It gave me: there was two functions called get map after i removed the duplicate the same eroo happened again , claude pointed out it there was a function call for return createDemoMap(); outside a function.  
#### I used it for: Fixed the bugged code and the script then ran 

### Alistair Bishop:
#### I gave claude: Our original requirements and job allocations.
#### It gave me: A list of deliverables i need to achieve and by x date.
#### I used it for: Keeping good time management, giving suitable time for testing and interface design, and keeping to the rigid constraints of my part of the group project.

### Chase Sibley:
#### I gave claude:
The source code for the project
#### It gave me: 
Types of tests with examples and how to run tests in JavaScript using Node
#### I used it for:
Writing and planning different tests for the algorithm and functions used for the project.

### Ted Turner: 
#### I gave claude:
prompts of what to look for in similar sites and prompts about how to implement ideas
#### It gave me: 
research on good UI practise and tutorials on how to design certain UI features
#### I used it for:
Researching practised UI behaviour from existing websites and how to intuitively design UI so that the experience flows


### Oliver Methold:
#### I gave claude:
Our project idea, team roles and the coursework brief, with prompts like "make a document for our group project", "check this against the mark scheme" and "is this allowed in AI-assisted modules".
#### It gave me:
A project plan doc covering features, data model, A* design, complexity, testing, sprint timeline, risks and limitations, plus a check against the mark scheme.
#### I used it for:
Planning the project, dividing work, tracking deadlines, and checking we met every marking criterion.
#### How I checked it:
Compared the plan against the brief myself and confirmed the complexity figures with our own tests.

