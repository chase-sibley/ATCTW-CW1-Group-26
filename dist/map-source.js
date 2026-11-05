export function getMap(settings = {}) {
  void settings;

  /*
  =============================================================================
  SAM: RANDOM MAP GENERATION GOES HERE
  =============================================================================

  Replace the final `return createDemoMap();` with your generator.

  INPUT (`settings`)

    {
      nodeCount: number,
      edgeCount: number,
      addressCount: number,
      seed: string,
      weightMode: "distance" | "random"
    }

  REQUIRED OUTPUT

    {
      nodes: [
        {
          id: string,
          x: number,
          y: number,
          type: "depot" | "house" | "junction",
          label: string
        }
      ],
      edges: [
        {
          id: string,
          from: string,
          to: string,
          weight: positive number,
          directed: boolean
        }
      ],
      parcels: [
        {
          id: string,
          contents: string,
          destination: house node id
        }
      ],
      bounds: {
        width: number,
        height: number
      }
    }

  RULES THE REST OF THE WEBSITE EXPECTS

    - Exactly one node has type "depot".
    - Every node id and edge id is unique.
    - Every edge references two existing node ids.
    - Every edge weight is greater than zero.
    - Every parcel destination is an existing house id.
    - The graph should be connected from the depot.
    - Coordinates should fit inside bounds.
    - Increase bounds for large maps; the UI already supports pan and zoom.

  IMPLEMENTATION AREA
















































  =============================================================================
  END OF SAM'S GENERATION AREA
  =============================================================================
  */

  return createDemoMap();
}

function createDemoMap() {
  return {
    bounds: { width: 1000, height: 620 },
    nodes: [
      { id: "depot", x: 110, y: 310, type: "depot", label: "Depot" },
      { id: "j1", x: 290, y: 180, type: "junction", label: "J1" },
      { id: "j2", x: 290, y: 440, type: "junction", label: "J2" },
      { id: "house_1", x: 500, y: 100, type: "house", label: "House 1" },
      { id: "j3", x: 500, y: 310, type: "junction", label: "J3" },
      { id: "house_2", x: 500, y: 520, type: "house", label: "House 2" },
      { id: "j4", x: 720, y: 190, type: "junction", label: "J4" },
      { id: "j5", x: 720, y: 430, type: "junction", label: "J5" },
      { id: "house_3", x: 900, y: 310, type: "house", label: "House 3" }
    ],
    edges: [
      { id: "e1", from: "depot", to: "j1", weight: 22, directed: false },
      { id: "e2", from: "depot", to: "j2", weight: 22, directed: false },
      { id: "e3", from: "j1", to: "house_1", weight: 24, directed: false },
      { id: "e4", from: "j1", to: "j3", weight: 25, directed: false },
      { id: "e5", from: "j2", to: "j3", weight: 25, directed: false },
      { id: "e6", from: "j2", to: "house_2", weight: 24, directed: false },
      { id: "e7", from: "house_1", to: "j4", weight: 24, directed: false },
      { id: "e8", from: "j3", to: "j4", weight: 24, directed: false },
      { id: "e9", from: "j3", to: "j5", weight: 24, directed: false },
      { id: "e10", from: "house_2", to: "j5", weight: 24, directed: false },
      { id: "e11", from: "j4", to: "house_3", weight: 22, directed: false },
      { id: "e12", from: "j5", to: "house_3", weight: 22, directed: false }
    ],
    parcels: [
      { id: "parcel_1", contents: "Books", destination: "house_1" },
      { id: "parcel_2", contents: "Medicine", destination: "house_2" },
      { id: "parcel_3", contents: "Shoes", destination: "house_3" }
    ]
  };
}
