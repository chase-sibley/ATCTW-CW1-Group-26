import {
  euclidean,
  planDeliveryRoute,
  validateGraph
} from "./algorithms.js";
import { getMap } from "./map-source.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const elements = {
  map: $("#map"), viewportLayer: $("#viewportLayer"), gridFill: $("#gridFill"), mapStage: $("#mapStage"),
  edgeLayer: $("#edgeLayer"), routeLayer: $("#routeLayer"), nodeLayer: $("#nodeLayer"), vanLayer: $("#vanLayer"),
  emptyState: $("#emptyState"), formError: $("#formError"), parcelList: $("#parcelList"), parcelCount: $("#parcelCount"),
  toolHelp: $("#toolHelp"), runButton: $("#runButton"), pauseButton: $("#pauseButton"),
  zoomOutButton: $("#zoomOutButton"), fitViewButton: $("#fitViewButton"), zoomInButton: $("#zoomInButton"),
  nodeCount: $("#nodeCount"), edgeCount: $("#edgeCount"), addressCount: $("#addressCount"), seed: $("#seed"), weightMode: $("#weightMode"),
  speed: $("#speed"), speedOutput: $("#speedOutput"), gScore: $("#gScore"), hScore: $("#hScore"), fScore: $("#fScore"),
  stepIndex: $("#stepIndex"), stepPhase: $("#stepPhase"), stepTitle: $("#stepTitle"), stepDescription: $("#stepDescription"),
  openSet: $("#openSet"), closedSet: $("#closedSet"), astarCost: $("#astarCost"), astarExplored: $("#astarExplored"),
  astarTime: $("#astarTime"), dijkstraCost: $("#dijkstraCost"), dijkstraExplored: $("#dijkstraExplored"),
  dijkstraTime: $("#dijkstraTime"), comparisonNote: $("#comparisonNote")
};

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 620;
let graph = { nodes: [], edges: [], parcels: [], bounds: { width: VIEW_WIDTH, height: VIEW_HEIGHT } };
let activeTool = null;
let selectedNodeId = null;
let routePath = [];
let currentNodeId = null;
let openNodeIds = new Set();
let closedNodeIds = new Set();
let delivered = new Set();
let runToken = 0;
let paused = false;
let vanPosition = null;
let view = { x: 0, y: 0, scale: 1, minimumScale: 0.5, maximumScale: 4 };
let panGesture = null;
let ignoreClicksUntil = 0;

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function nodeById(id) {
  return graph.nodes.find((node) => node.id === id);
}

function nodeName(id) {
  return nodeById(id)?.label ?? id;
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return "∞";
  if (Math.abs(number) >= 100) return number.toFixed(0);
  return number.toFixed(number % 1 === 0 ? 0 : 1);
}

function showError(message) {
  elements.formError.textContent = message;
}

function clearError() {
  elements.formError.textContent = "";
}

function graphBounds() {
  return graph.bounds ?? { width: VIEW_WIDTH, height: VIEW_HEIGHT };
}

function applyViewTransform() {
  elements.viewportLayer.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.scale})`);
}

function clampView() {
  const bounds = graphBounds();
  const scaledWidth = bounds.width * view.scale;
  const scaledHeight = bounds.height * view.scale;
  const visibleMargin = 90;

  if (scaledWidth <= VIEW_WIDTH - visibleMargin * 2) {
    view.x = (VIEW_WIDTH - scaledWidth) / 2;
  } else {
    view.x = Math.min(VIEW_WIDTH - visibleMargin, Math.max(visibleMargin - scaledWidth, view.x));
  }
  if (scaledHeight <= VIEW_HEIGHT - visibleMargin * 2) {
    view.y = (VIEW_HEIGHT - scaledHeight) / 2;
  } else {
    view.y = Math.min(VIEW_HEIGHT - visibleMargin, Math.max(visibleMargin - scaledHeight, view.y));
  }
}

function fitGraphToView() {
  const bounds = graphBounds();
  const fittedScale = Math.min(VIEW_WIDTH / bounds.width, VIEW_HEIGHT / bounds.height) * 0.94;
  view.minimumScale = fittedScale * 0.55;
  view.maximumScale = Math.max(4, fittedScale * 8);
  view.scale = fittedScale;
  view.x = (VIEW_WIDTH - bounds.width * view.scale) / 2;
  view.y = (VIEW_HEIGHT - bounds.height * view.scale) / 2;
  applyViewTransform();
}

function rootCoordinates(event) {
  const point = new DOMPoint(event.clientX, event.clientY);
  return point.matrixTransform(elements.map.getScreenCTM().inverse());
}

function mapCoordinates(event) {
  const point = new DOMPoint(event.clientX, event.clientY);
  return point.matrixTransform(elements.viewportLayer.getScreenCTM().inverse());
}

function zoomView(factor, centre = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 }) {
  const previousScale = view.scale;
  const nextScale = Math.min(view.maximumScale, Math.max(view.minimumScale, previousScale * factor));
  const graphX = (centre.x - view.x) / previousScale;
  const graphY = (centre.y - view.y) / previousScale;
  view.scale = nextScale;
  view.x = centre.x - graphX * nextScale;
  view.y = centre.y - graphY * nextScale;
  clampView();
  applyViewTransform();
}

function boxesOverlap(first, second, padding = 4) {
  return first.x < second.x + second.width + padding &&
    first.x + first.width + padding > second.x &&
    first.y < second.y + second.height + padding &&
    first.y + first.height + padding > second.y;
}

function withinMap(box) {
  const bounds = graphBounds();
  return box.x >= 8 && box.y >= 8 && box.x + box.width <= bounds.width - 8 && box.y + box.height <= bounds.height - 8;
}

function selectLabelCandidate(candidates, obstacles) {
  const clearCandidate = candidates.find((candidate) =>
    withinMap(candidate.box) && obstacles.every((obstacle) => !boxesOverlap(candidate.box, obstacle))
  );
  if (clearCandidate) return clearCandidate;
  return candidates
    .map((candidate) => ({
      ...candidate,
      collisions: obstacles.filter((obstacle) => boxesOverlap(candidate.box, obstacle, 1)).length + (withinMap(candidate.box) ? 0 : 10)
    }))
    .sort((a, b) => a.collisions - b.collisions)[0];
}

function createBoxIndex(initialBoxes, cellSize = 96) {
  const buckets = new Map();
  const keysFor = (box, padding = 0) => {
    const keys = [];
    const startColumn = Math.floor((box.x - padding) / cellSize);
    const endColumn = Math.floor((box.x + box.width + padding) / cellSize);
    const startRow = Math.floor((box.y - padding) / cellSize);
    const endRow = Math.floor((box.y + box.height + padding) / cellSize);
    for (let column = startColumn; column <= endColumn; column += 1) {
      for (let row = startRow; row <= endRow; row += 1) keys.push(`${column}:${row}`);
    }
    return keys;
  };
  const add = (box) => {
    for (const key of keysFor(box)) {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(box);
    }
  };
  const collisionCount = (box, padding = 4) => {
    const nearby = new Set();
    for (const key of keysFor(box, padding)) {
      for (const candidate of buckets.get(key) ?? []) nearby.add(candidate);
    }
    let count = 0;
    for (const candidate of nearby) {
      if (boxesOverlap(box, candidate, padding)) count += 1;
    }
    return count;
  };
  for (const box of initialBoxes) add(box);
  return { add, collisionCount };
}

function selectIndexedLabelCandidate(candidates, obstacleIndex) {
  const clearCandidate = candidates.find((candidate) =>
    withinMap(candidate.box) && obstacleIndex.collisionCount(candidate.box) === 0
  );
  if (clearCandidate) return clearCandidate;
  return candidates
    .map((candidate) => ({
      ...candidate,
      collisions: obstacleIndex.collisionCount(candidate.box, 1) + (withinMap(candidate.box) ? 0 : 10)
    }))
    .sort((a, b) => a.collisions - b.collisions)[0];
}

function createNodeLabelLayout() {
  const nodeBoxes = graph.nodes.map((node) => ({ id: node.id, x: node.x - 22, y: node.y - 22, width: 44, height: 44 }));
  const labelBoxes = [];
  const layout = new Map();

  for (const node of graph.nodes) {
    const width = Math.max(28, node.label.length * 7.5);
    const candidates = [
      { x: 0, y: 35, anchor: "middle", box: { x: node.x - width / 2, y: node.y + 22, width, height: 18 } },
      { x: 0, y: -29, anchor: "middle", box: { x: node.x - width / 2, y: node.y - 42, width, height: 18 } },
      { x: 27, y: 5, anchor: "start", box: { x: node.x + 25, y: node.y - 9, width, height: 18 } },
      { x: -27, y: 5, anchor: "end", box: { x: node.x - 25 - width, y: node.y - 9, width, height: 18 } }
    ];
    const obstacles = [...nodeBoxes.filter((box) => box.id !== node.id), ...labelBoxes];
    const chosen = selectLabelCandidate(candidates, obstacles);
    layout.set(node.id, chosen);
    labelBoxes.push(chosen.box);
  }

  return { layout, obstacles: [...nodeBoxes, ...labelBoxes] };
}

function createRoadLabelLayout(from, to, text, obstacleIndex) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const perpendicularX = -dy / length;
  const perpendicularY = dx / length;
  const width = Math.max(32, text.length * 9 + 14);
  const candidates = [];
  for (const position of [0.5, 0.38, 0.62, 0.27, 0.73]) {
    for (const offset of [18, -18, 31, -31, 0]) {
      const x = from.x + dx * position + perpendicularX * offset;
      const y = from.y + dy * position + perpendicularY * offset;
      candidates.push({ x, y, width, box: { x: x - width / 2, y: y - 12, width, height: 24 } });
    }
  }
  return selectIndexedLabelCandidate(candidates, obstacleIndex);
}

function renderGraph() {
  elements.edgeLayer.replaceChildren();
  elements.routeLayer.replaceChildren();
  elements.nodeLayer.replaceChildren();
  elements.emptyState.hidden = graph.nodes.length > 0;
  const bounds = graphBounds();
  elements.gridFill.setAttribute("width", bounds.width);
  elements.gridFill.setAttribute("height", bounds.height);
  const nodeLabelLayout = createNodeLabelLayout();
  const labelObstacles = createBoxIndex(nodeLabelLayout.obstacles);

  for (const edge of graph.edges) {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (!from || !to) continue;
    const group = svgElement("g", { class: "edge-group", "data-edge-id": edge.id, tabindex: "0", role: "button", "aria-label": `Road cost ${edge.weight}. Activate to edit.` });
    const line = svgElement("line", { class: "road", x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    const text = formatNumber(edge.weight);
    const labelLayout = createRoadLabelLayout(from, to, text, labelObstacles);
    labelObstacles.add(labelLayout.box);
    const labelBackground = svgElement("rect", { class: "road-label-bg", x: labelLayout.x - labelLayout.width / 2, y: labelLayout.y - 11, width: labelLayout.width, height: 22, rx: 7 });
    const label = svgElement("text", { class: "road-label", x: labelLayout.x, y: labelLayout.y + 1 });
    label.textContent = text;
    group.append(line, labelBackground, label);
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (performance.now() < ignoreClicksUntil) return;
      editEdgeWeight(edge.id);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") editEdgeWeight(edge.id);
    });
    elements.edgeLayer.append(group);
  }

  for (const node of graph.nodes) {
    const group = svgElement("g", {
      class: "node-group", transform: `translate(${node.x} ${node.y})`, "data-node-id": node.id,
      "data-type": node.type, "data-state": nodeState(node.id), "data-selected": node.id === selectedNodeId,
      tabindex: "0", role: "button", "aria-label": `${node.label}, ${node.type}`
    });
    const halo = svgElement("circle", { class: "node-halo", r: 20 });
    let shape;
    if (node.type === "depot") {
      shape = svgElement("rect", { class: "node-shape", x: -10, y: -10, width: 20, height: 20, rx: 3, transform: "rotate(45)" });
    } else if (node.type === "house") {
      shape = svgElement("path", { class: "node-shape", d: "M -11 1 L 0 -10 L 11 1 L 8 1 L 8 10 L -8 10 L -8 1 Z" });
    } else {
      shape = svgElement("circle", { class: "node-shape", r: 9 });
    }
    const nodeLabel = nodeLabelLayout.layout.get(node.id);
    const label = svgElement("text", { class: "node-label", x: nodeLabel.x, y: nodeLabel.y, "text-anchor": nodeLabel.anchor });
    label.textContent = node.label;
    group.append(halo, shape, label);
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (performance.now() < ignoreClicksUntil) return;
      handleNodeClick(node.id);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") handleNodeClick(node.id);
    });
    elements.nodeLayer.append(group);
  }

  renderRoute();
  renderVan();
  renderParcels();
}

function nodeState(id) {
  if (id === currentNodeId) return "current";
  if (closedNodeIds.has(id)) return "closed";
  if (openNodeIds.has(id)) return "open";
  return "idle";
}

function updateNodeStates() {
  $$(".node-group").forEach((nodeElement) => {
    const id = nodeElement.dataset.nodeId;
    nodeElement.dataset.state = nodeState(id);
    nodeElement.dataset.selected = String(id === selectedNodeId);
  });
}

function renderRoute() {
  elements.routeLayer.replaceChildren();
  for (let index = 1; index < routePath.length; index += 1) {
    const from = nodeById(routePath[index - 1]);
    const to = nodeById(routePath[index]);
    if (!from || !to) continue;
    elements.routeLayer.append(svgElement("line", { class: "road route", x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
  }
}

function renderVan() {
  elements.vanLayer.replaceChildren();
  if (!vanPosition) return;
  const van = svgElement("g", { class: "van", transform: `translate(${vanPosition.x} ${vanPosition.y - 17})` });
  van.append(
    svgElement("rect", { class: "van-body", x: -16, y: -10, width: 32, height: 20, rx: 5 }),
    svgElement("path", { class: "van-body", d: "M 7 -10 L 18 -10 L 25 0 L 25 10 L 7 10 Z" }),
    svgElement("path", { class: "van-window", d: "M 11 -7 L 17 -7 L 22 -1 L 11 -1 Z" }),
    svgElement("circle", { class: "van-wheel", cx: -9, cy: 11, r: 5 }),
    svgElement("circle", { class: "van-wheel", cx: 17, cy: 11, r: 5 })
  );
  elements.vanLayer.append(van);
}

function renderParcels() {
  elements.parcelCount.textContent = String(graph.parcels.length - delivered.size);
  elements.parcelList.replaceChildren();
  for (const parcel of graph.parcels) {
    const item = document.createElement("li");
    const isDelivered = delivered.has(parcel.id);
    if (isDelivered) item.classList.add("delivered");
    item.innerHTML = `
      <span class="parcel-icon">□</span>
      <span><strong>${parcel.contents}</strong><small>${nodeName(parcel.destination)}</small></span>
      <span class="parcel-state">${isDelivered ? "Delivered" : "On board"}</span>
    `;
    elements.parcelList.append(item);
  }
}

function editEdgeWeight(edgeId) {
  const edge = graph.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return;
  const answer = window.prompt("Enter a positive road cost", String(edge.weight));
  if (answer === null) return;
  const weight = Number(answer);
  if (!Number.isFinite(weight) || weight <= 0) {
    showError("Road weights must be positive numbers.");
    return;
  }
  edge.weight = weight;
  clearError();
  resetSimulation(true);
  renderGraph();
}

function loadDemoMap() {
  try {
    graph = getMap({
      nodeCount: Number(elements.nodeCount.value), edgeCount: Number(elements.edgeCount.value),
      addressCount: Number(elements.addressCount.value), seed: elements.seed.value, weightMode: elements.weightMode.value
    });
    clearError();
    activeTool = null;
    selectedNodeId = null;
    elements.map.dataset.tool = "";
    $$(".tool-button").forEach((button) => button.classList.remove("active"));
    resetSimulation(true);
    fitGraphToView();
    setStep("Demo map ready", "Choose Dispatch van to replay A* on every delivery leg.", "Temporary sample", 0);
  } catch (error) {
    showError(error.message);
  }
}

function setTool(tool) {
  activeTool = activeTool === tool ? null : tool;
  selectedNodeId = null;
  elements.map.dataset.tool = activeTool ?? "";
  $$(".tool-button").forEach((button) => button.classList.toggle("active", button.dataset.tool === activeTool));
  const instructions = {
    junction: "Click empty map space to add a junction.", house: "Click empty map space to add an address and parcel.",
    depot: "Click empty map space to place the one allowed depot.", connect: "Select two nodes to create a road."
  };
  elements.toolHelp.textContent = activeTool ? instructions[activeTool] : "Select a tool, then click the map.";
  updateNodeStates();
}

function handleMapClick(event) {
  if (performance.now() < ignoreClicksUntil) return;
  if (!activeTool || activeTool === "connect") return;
  const point = mapCoordinates(event);
  const bounds = graphBounds();
  if (point.x < 25 || point.x > bounds.width - 25 || point.y < 25 || point.y > bounds.height - 25) return;
  if (activeTool === "depot" && graph.nodes.some((node) => node.type === "depot")) {
    showError("The map already has a depot. Clear it or choose another tool.");
    return;
  }
  const index = graph.nodes.length + 1;
  const type = activeTool;
  const id = type === "depot" ? "depot" : `${type}_${index}`;
  const count = graph.nodes.filter((node) => node.type === type).length + 1;
  const label = type === "depot" ? "Depot" : type === "house" ? `House ${count}` : `J${count}`;
  graph.nodes.push({ id, x: point.x, y: point.y, type, label });
  if (type === "house") {
    graph.parcels.push({ id: `parcel_${Date.now()}_${index}`, contents: "Parcel", destination: id });
  }
  resetSimulation(true);
  clearError();
  renderGraph();
}

function handleNodeClick(id) {
  if (activeTool !== "connect") return;
  if (!selectedNodeId) {
    selectedNodeId = id;
    elements.toolHelp.textContent = `Selected ${nodeName(id)}. Now choose the other end of the road.`;
    updateNodeStates();
    return;
  }
  if (selectedNodeId === id) {
    selectedNodeId = null;
    elements.toolHelp.textContent = "Select two different nodes to create a road.";
    updateNodeStates();
    return;
  }
  const duplicate = graph.edges.some((edge) =>
    (edge.from === selectedNodeId && edge.to === id) || (edge.from === id && edge.to === selectedNodeId));
  if (duplicate) {
    showError("Those nodes already have a road.");
  } else {
    const from = nodeById(selectedNodeId);
    const to = nodeById(id);
    const weight = Math.max(1, Math.round(euclidean(from, to) / 10));
    graph.edges.push({ id: `edge_${Date.now()}_${graph.edges.length}`, from: selectedNodeId, to: id, weight, directed: false });
    clearError();
    resetSimulation(true);
  }
  selectedNodeId = null;
  elements.toolHelp.textContent = "Road added. Select another pair or click Road to stop.";
  renderGraph();
}

function clearMap() {
  runToken += 1;
  graph = { nodes: [], edges: [], parcels: [], bounds: { width: VIEW_WIDTH, height: VIEW_HEIGHT } };
  selectedNodeId = null;
  resetSimulation(false);
  fitGraphToView();
  setStep("No map yet", "Load the demo or draw a depot, houses, junctions and roads.", "Waiting", 0);
}

function setStep(title, description, phase, index) {
  elements.stepTitle.textContent = title;
  elements.stepDescription.textContent = description;
  elements.stepPhase.textContent = phase;
  elements.stepIndex.textContent = String(index).padStart(2, "0");
}

function renderSet(container, values, formatter = (value) => value) {
  container.replaceChildren();
  const list = [...values];
  if (list.length === 0) list.push("—");
  for (const value of list.slice(0, 18)) {
    const element = document.createElement("span");
    element.textContent = value === "—" ? value : formatter(value);
    container.append(element);
  }
  if (values.length > 18) {
    const more = document.createElement("span");
    more.textContent = `+${values.length - 18}`;
    container.append(more);
  }
}

function displaySearchStep(step, leg, index) {
  currentNodeId = step.current;
  openNodeIds = new Set(step.openSet.map((item) => item.id));
  closedNodeIds = new Set(step.closedSet);
  elements.gScore.textContent = formatNumber(step.g);
  elements.hScore.textContent = formatNumber(step.h);
  elements.fScore.textContent = formatNumber(step.f);
  renderSet(elements.openSet, step.openSet, (item) => `${nodeName(item.id)} · ${formatNumber(item.f)}`);
  renderSet(elements.closedSet, step.closedSet, (id) => nodeName(id));
  setStep(
    `Expanding ${nodeName(step.current)}`,
    `${step.changes.length} neighbour${step.changes.length === 1 ? "" : "s"} improved. Lowest f-score is explored next.`,
    `${nodeName(leg.from)} → ${nodeName(leg.to)}`,
    index
  );
  updateNodeStates();
}

function updateComparison(astar, astarMs, dijkstra, dijkstraMs) {
  elements.astarCost.textContent = formatNumber(astar.cost);
  elements.astarExplored.textContent = String(astar.exploredCount);
  elements.astarTime.textContent = `${astarMs.toFixed(2)}ms`;
  elements.dijkstraCost.textContent = formatNumber(dijkstra.cost);
  elements.dijkstraExplored.textContent = String(dijkstra.exploredCount);
  elements.dijkstraTime.textContent = `${dijkstraMs.toFixed(2)}ms`;
  const saved = dijkstra.exploredCount - astar.exploredCount;
  elements.comparisonNote.textContent = saved > 0
    ? `The matching route cost is expected. A* explored ${saved} fewer nodes while both algorithms used the same delivery order.`
    : "The matching route cost is expected because both algorithms are optimal. On this map the heuristic did not reduce the explored nodes.";
}

function speedMultiplier() {
  return [0, 0.5, 0.75, 1, 1.5, 2][Number(elements.speed.value)];
}

async function pauseAwareDelay(milliseconds, token) {
  let remaining = milliseconds / speedMultiplier();
  while (remaining > 0) {
    if (token !== runToken) throw new Error("cancelled");
    if (paused) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      continue;
    }
    const slice = Math.min(remaining, 40);
    await new Promise((resolve) => setTimeout(resolve, slice));
    remaining -= slice;
  }
}

async function animateVan(path, token) {
  for (let pathIndex = 1; pathIndex < path.length; pathIndex += 1) {
    const from = nodeById(path[pathIndex - 1]);
    const to = nodeById(path[pathIndex]);
    const steps = 18;
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      vanPosition = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
      renderVan();
      await pauseAwareDelay(22, token);
    }
    for (const parcel of graph.parcels.filter((item) => item.destination === to.id)) delivered.add(parcel.id);
    renderParcels();
  }
}

async function runSimulation() {
  clearError();
  const errors = validateGraph(graph);
  const invalidParcels = graph.parcels.filter((parcel) => !nodeById(parcel.destination));
  if (invalidParcels.length > 0) errors.push("Every parcel must reference an existing destination.");
  if (graph.parcels.length === 0) errors.push("Add at least one house and parcel before dispatching the van.");
  if (errors.length > 0) {
    showError(errors[0]);
    return;
  }

  resetSimulation(false);
  const token = ++runToken;
  paused = false;
  elements.pauseButton.textContent = "Ⅱ";
  const depot = graph.nodes.find((node) => node.type === "depot");
  const destinations = graph.parcels.map((parcel) => parcel.destination);

  try {
    const astarStart = performance.now();
    const astar = planDeliveryRoute(graph, depot.id, destinations, { algorithm: "astar" });
    const astarMs = performance.now() - astarStart;
    const dijkstraStart = performance.now();
    const dijkstra = planDeliveryRoute(graph, depot.id, destinations, { algorithm: "dijkstra", order: astar.order });
    const dijkstraMs = performance.now() - dijkstraStart;
    updateComparison(astar, astarMs, dijkstra, dijkstraMs);

    if (!Number.isFinite(astar.cost)) throw new Error("At least one address is unreachable from the depot.");
    vanPosition = { x: depot.x, y: depot.y };
    renderVan();

    let globalStep = 0;
    const completedRoute = [];
    for (const leg of astar.legs) {
      for (const step of leg.searchLog) {
        globalStep += 1;
        displaySearchStep(step, leg, globalStep);
        await pauseAwareDelay(190, token);
      }
      completedRoute.push(...(completedRoute.length === 0 ? leg.path : leg.path.slice(1)));
      routePath = [...completedRoute];
      renderRoute();
    }

    currentNodeId = null;
    openNodeIds.clear();
    closedNodeIds.clear();
    updateNodeStates();
    setStep("Route confirmed", `The van is visiting ${astar.order.length} address${astar.order.length === 1 ? "" : "es"}.`, "Delivery run", globalStep + 1);
    await animateVan(astar.path, token);
    setStep("Delivery complete", `All ${graph.parcels.length} parcels were delivered for a total cost of ${formatNumber(astar.cost)}.`, "Complete", globalStep + 2);
  } catch (error) {
    if (error.message === "cancelled") return;
    showError(error.message);
    setStep("Route unavailable", error.message, "Validation", 0);
  }
}

function resetSimulation(incrementToken = true) {
  if (incrementToken) runToken += 1;
  paused = false;
  routePath = [];
  currentNodeId = null;
  openNodeIds = new Set();
  closedNodeIds = new Set();
  delivered = new Set();
  vanPosition = graph.nodes.find((node) => node.type === "depot") ?? null;
  elements.gScore.textContent = "—";
  elements.hScore.textContent = "—";
  elements.fScore.textContent = "—";
  renderSet(elements.openSet, []);
  renderSet(elements.closedSet, []);
  elements.pauseButton.textContent = "Ⅱ";
  renderGraph();
}

function togglePause() {
  paused = !paused;
  elements.pauseButton.textContent = paused ? "▶" : "Ⅱ";
}

function beginPan(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".node-group, .edge-group")) return;
  const point = rootCoordinates(event);
  panGesture = {
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    viewX: view.x,
    viewY: view.y,
    moved: false
  };
  elements.map.setPointerCapture(event.pointerId);
}

function updatePan(event) {
  if (!panGesture || event.pointerId !== panGesture.pointerId) return;
  const point = rootCoordinates(event);
  const dx = point.x - panGesture.startX;
  const dy = point.y - panGesture.startY;
  if (Math.hypot(dx, dy) > 3) {
    panGesture.moved = true;
    elements.map.classList.add("panning");
  }
  if (!panGesture.moved) return;
  view.x = panGesture.viewX + dx;
  view.y = panGesture.viewY + dy;
  clampView();
  applyViewTransform();
}

function endPan(event) {
  if (!panGesture || event.pointerId !== panGesture.pointerId) return;
  if (panGesture.moved) ignoreClicksUntil = performance.now() + 160;
  elements.map.classList.remove("panning");
  if (elements.map.hasPointerCapture(event.pointerId)) elements.map.releasePointerCapture(event.pointerId);
  panGesture = null;
}

$("#generateButton").addEventListener("click", loadDemoMap);
$("#clearButton").addEventListener("click", clearMap);
$("#resetButton").addEventListener("click", () => resetSimulation(true));
elements.runButton.addEventListener("click", runSimulation);
elements.pauseButton.addEventListener("click", togglePause);
elements.map.addEventListener("click", handleMapClick);
elements.map.addEventListener("pointerdown", beginPan);
elements.map.addEventListener("pointermove", updatePan);
elements.map.addEventListener("pointerup", endPan);
elements.map.addEventListener("pointercancel", endPan);
elements.map.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomView(event.deltaY < 0 ? 1.14 : 1 / 1.14, rootCoordinates(event));
}, { passive: false });
elements.zoomOutButton.addEventListener("click", () => zoomView(1 / 1.2));
elements.zoomInButton.addEventListener("click", () => zoomView(1.2));
elements.fitViewButton.addEventListener("click", fitGraphToView);
elements.speed.addEventListener("input", () => { elements.speedOutput.textContent = `${speedMultiplier()}×`; });
$$('.tool-button').forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));

loadDemoMap();
