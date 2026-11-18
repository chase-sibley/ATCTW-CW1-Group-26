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
### How to access
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
#### It gave me: 
#### I used it for:

