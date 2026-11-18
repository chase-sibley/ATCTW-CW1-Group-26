import {
  euclidean,
  planDeliveryRoute,
  validateGraph
} from "./algorithms.js";
import { getMap } from "./map-source.js";

// interface controller

const SVG_NS = "http://www.w3.org/2000/svg";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  map: $("#map"), viewportLayer: $("#viewportLayer"), gridFill: $("#gridFill"), paperFill: $("#paperFill"), mapStage: $("#mapStage"),
  edgeLayer: $("#edgeLayer"), routeLayer: $("#routeLayer"), nodeLayer: $("#nodeLayer"), vanLayer: $("#vanLayer"),
  emptyState: $("#emptyState"), formError: $("#formError"), parcelList: $("#parcelList"), parcelCount: $("#parcelCount"),
  toolHelp: $("#toolHelp"), runButton: $("#runButton"), runLabel: $("#runLabel"), resetButton: $("#resetButton"),
  zoomOutButton: $("#zoomOutButton"), fitViewButton: $("#fitViewButton"), zoomInButton: $("#zoomInButton"),
  nodeCount: $("#nodeCount"), edgeCount: $("#edgeCount"), addressCount: $("#addressCount"), seed: $("#seed"), weightMode: $("#weightMode"),
  shuffleSeed: $("#shuffleSeed"),
  pauseButton: $("#pauseButton"),
  speed: $("#speed"), speedOutput: $("#speedOutput"),
  gScore: $("#gScore"), hScore: $("#hScore"), fScore: $("#fScore"), formulaH: $("#formulaH"),
  openSet: $("#openSet"), closedSet: $("#closedSet"),
  astarCost: $("#astarCost"), astarExplored: $("#astarExplored"), astarTime: $("#astarTime"),
  dijkstraCost: $("#dijkstraCost"), dijkstraExplored: $("#dijkstraExplored"), dijkstraTime: $("#dijkstraTime"),
  comparisonNote: $("#comparisonNote"), astarMini: $("#astarMini"), dijkstraMini: $("#dijkstraMini"),
  astarMiniCount: $("#astarMiniCount"), dijkstraMiniCount: $("#dijkstraMiniCount"),
  legsWrap: $("#legsWrap"), legsBody: $("#legsBody"),
  edgeEditor: $("#edgeEditor"), edgeWeightInput: $("#edgeWeightInput"), edgeCancel: $("#edgeCancel"),
  nodeTip: $("#nodeTip"), helpButton: $("#helpButton"), helpPanel: $("#helpPanel")
};

const ALGORITHM_NAMES = { astar: "A*", dijkstra: "Dijkstra" };
const FRAME_TIME = { start: 1700, search: 520, found: 1300, planned: 1000, drive: 0, done: 0 };
const VIEW_WIDTH = 1000;
let VIEW_HEIGHT = 620;

let graph = { nodes: [], edges: [], parcels: [], bounds: { width: VIEW_WIDTH, height: VIEW_HEIGHT } };
let activeTool = null;
let selectedNodeId = null;
let editingEdgeId = null;
let view = { x: 0, y: 0, scale: 1, minimumScale: 0.5, maximumScale: 4 };
let panGesture = null;
let ignoreClicksUntil = 0;

// Run and playback state
let run = null;            // { astar, dijkstra, astarMs, dijkstraMs, depotId }
let watching = "astar";
let frames = [];
let legStarts = [];
let frameIndex = 0;
let playing = false;
let playToken = 0;
let stopOrder = new Map();
let display = emptyDisplay();

function emptyDisplay() {
  return { states: new Map(), info: new Map(), goal: null, legStart: null, delivered: new Set(), legIndex: -1 };
}

// tools

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

function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
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

function currentResult() {
  return run ? run[watching] : null;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function speed() {
  return [0, 0.5, 0.75, 1, 1.5, 2][Number(elements.speed.value)] || 1;
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// pan and zooming in view window

function applyViewTransform() {
  elements.viewportLayer.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.scale})`);
  hideNodeTip();
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

// Match SVG drawing area to map panel space
function matchViewToStage() {
  const { width, height } = elements.mapStage.getBoundingClientRect();
  if (width < 10 || height < 10) return;
  const nextHeight = Math.round(VIEW_WIDTH * (height / width));
  if (nextHeight === VIEW_HEIGHT) return;
  const firstFit = elements.map.dataset.sized !== "true";
  VIEW_HEIGHT = nextHeight;
  elements.map.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  elements.map.dataset.sized = "true";
  if (firstFit) {
    fitGraphToView();
  } else {
    clampView();
    applyViewTransform();
  }
}

// label positioning

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

// base map drawing

function renderGraph() {
  elements.edgeLayer.replaceChildren();
  elements.nodeLayer.replaceChildren();
  elements.emptyState.hidden = graph.nodes.length > 0;
  const bounds = graphBounds();
  for (const rect of [elements.gridFill, elements.paperFill]) {
    rect.setAttribute("width", bounds.width);
    rect.setAttribute("height", bounds.height);
  }
  const nodeLabelLayout = createNodeLabelLayout();
  const labelObstacles = createBoxIndex(nodeLabelLayout.obstacles);

  for (const edge of graph.edges) {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (!from || !to) continue;
    const text = formatNumber(edge.weight);
    const group = svgElement("g", {
      class: "edge-group", "data-edge-id": edge.id, tabindex: "0", role: "button",
      "aria-label": `Road from ${from.label} to ${to.label}, cost ${text}. Press Enter to change the cost.`
    });
    const line = svgElement("line", { class: "road", x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    const labelLayout = createRoadLabelLayout(from, to, text, labelObstacles);
    labelObstacles.add(labelLayout.box);
    const labelBackground = svgElement("rect", { class: "road-label-bg", x: labelLayout.x - labelLayout.width / 2, y: labelLayout.y - 11, width: labelLayout.width, height: 22, rx: 7 });
    const label = svgElement("text", { class: "road-label", x: labelLayout.x, y: labelLayout.y + 1 });
    label.textContent = text;
    group.append(line, labelBackground, label);
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (performance.now() < ignoreClicksUntil) return;
      editEdgeWeight(edge.id, labelBackground);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        editEdgeWeight(edge.id, labelBackground);
      }
    });
    elements.edgeLayer.append(group);
  }

  for (const node of graph.nodes) {
    const typeName = { depot: "depot", house: "address", junction: "junction" }[node.type] ?? node.type;
    const group = svgElement("g", {
      class: "node-group", transform: `translate(${node.x} ${node.y})`, "data-node-id": node.id,
      "data-type": node.type, tabindex: "0", role: "button", "aria-label": `${node.label}, ${typeName}`
    });
    const halo = svgElement("circle", { class: "node-halo", r: 20 });
    let shape;
    if (node.type === "depot") {
      shape = svgElement("rect", { class: "node-shape", x: -10, y: -10, width: 20, height: 20, rx: 3, transform: "rotate(45)" });
    } else if (node.type === "house") {
      shape = svgElement("image", { class: "node-image", href: "house.png", x: -12, y: -12, width: 24, height: 24 });
    } else {
      shape = svgElement("circle", { class: "node-shape", r: 9 });
    }
    const placement = nodeLabelLayout.layout.get(node.id);
    const label = svgElement("text", { class: "node-label", x: placement.x, y: placement.y, "text-anchor": placement.anchor });
    label.textContent = node.label;
    group.append(halo, shape, label);
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (performance.now() < ignoreClicksUntil) return;
      handleNodeClick(node.id);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        handleNodeClick(node.id);
      }
    });
    group.addEventListener("pointerenter", () => showNodeTip(node.id, group));
    group.addEventListener("pointerleave", hideNodeTip);
    group.addEventListener("focus", () => showNodeTip(node.id, group));
    group.addEventListener("blur", hideNodeTip);
    elements.nodeLayer.append(group);
  }

  updateNodeStates();
  renderParcels();
}

function updateNodeStates() {
  $$(".node-group").forEach((element) => {
    const id = element.dataset.nodeId;
    element.dataset.state = display.states.get(id) ?? "idle";
    element.dataset.selected = String(id === selectedNodeId);
    element.dataset.goal = String(id === display.goal);
    element.dataset.delivered = String(isDestinationDelivered(id));
  });
}

function isDestinationDelivered(id) {
  return graph.parcels.some((parcel) => parcel.destination === id) &&
    graph.parcels.filter((parcel) => parcel.destination === id).every((parcel) => display.delivered.has(parcel.id));
}

// parcels

function renderParcels() {
  elements.parcelCount.textContent = String(graph.parcels.length - display.delivered.size);
  elements.parcelList.replaceChildren();
  if (graph.parcels.length === 0) {
    const empty = document.createElement("li");
    empty.className = "parcel-empty";
    empty.textContent = "No parcels";
    elements.parcelList.append(empty);
    return;
  }
  const parcels = [...graph.parcels].sort((a, b) =>
    (stopOrder.get(a.destination) ?? Infinity) - (stopOrder.get(b.destination) ?? Infinity));
  for (const parcel of parcels) {
    const item = document.createElement("li");
    const isDelivered = display.delivered.has(parcel.id);
    const stop = stopOrder.get(parcel.destination);
    if (isDelivered) item.classList.add("delivered");
    if (stop) item.dataset.stop = String(stop);
    if (parcel.destination === display.goal) item.classList.add("next");

    const stopMark = document.createElement("span");
    stopMark.className = "parcel-stop";
    stopMark.textContent = stop ? String(stop) : "–";
    stopMark.title = stop ? `Stop ${stop}` : "Not planned yet";

    const text = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = parcel.contents;
    const place = document.createElement("small");
    place.textContent = nodeName(parcel.destination);
    text.append(title, place);

    const state = document.createElement("span");
    state.className = "parcel-state";
    state.textContent = isDelivered ? "Delivered" : parcel.destination === display.goal ? "Next" : "On board";

    item.append(stopMark, text, state);
    item.addEventListener("pointerenter", () => highlightNode(parcel.destination, true));
    item.addEventListener("pointerleave", () => highlightNode(parcel.destination, false));
    elements.parcelList.append(item);
  }
}

function highlightNode(id, on) {
  elements.nodeLayer.querySelector(`[data-node-id="${CSS.escape(id)}"]`)?.classList.toggle("spotlight", on);
}

// node tooltips

function showNodeTip(id, anchor) {
  const node = nodeById(id);
  if (!node || panGesture?.moved) return;
  const info = display.info.get(id);
  const tip = elements.nodeTip;
  tip.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = node.label;
  tip.append(heading);
  if (info) {
    const table = document.createElement("dl");
    for (const [key, value] of [["g", info.g], ["h", info.h], ["f", info.f]]) {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      dt.innerHTML = `<em>${key}</em>`;
      const dd = document.createElement("dd");
      dd.textContent = formatNumber(value);
      row.append(dt, dd);
      table.append(row);
    }
    tip.append(table);
  }

  const stageBox = elements.mapStage.getBoundingClientRect();
  const box = anchor.getBoundingClientRect();
  tip.hidden = false;
  const tipBox = tip.getBoundingClientRect();
  let left = box.left + box.width / 2 - stageBox.left;
  let top = box.top - stageBox.top - 10;
  left = Math.min(stageBox.width - tipBox.width / 2 - 8, Math.max(tipBox.width / 2 + 8, left));
  const below = top - tipBox.height < 8;
  tip.dataset.below = String(below);
  if (below) top = box.bottom - stageBox.top + 10;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideNodeTip() {
  elements.nodeTip.hidden = true;
}

// change road cost

function editEdgeWeight(edgeId, anchor) {
  const edge = graph.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return;
  editingEdgeId = edgeId;
  const stageBox = elements.mapStage.getBoundingClientRect();
  const anchorBox = anchor.getBoundingClientRect();
  const x = Math.min(stageBox.width - 130, Math.max(130, anchorBox.left + anchorBox.width / 2 - stageBox.left));
  const y = Math.max(70, anchorBox.top - stageBox.top);
  elements.edgeEditor.style.left = `${x}px`;
  elements.edgeEditor.style.top = `${y}px`;
  elements.edgeEditor.hidden = false;
  elements.edgeWeightInput.value = String(edge.weight);
  elements.edgeWeightInput.focus();
  elements.edgeWeightInput.select();
}

function closeEdgeEditor() {
  if (elements.edgeEditor.hidden) return;
  elements.edgeEditor.hidden = true;
  const id = editingEdgeId;
  editingEdgeId = null;
  elements.edgeLayer.querySelector(`[data-edge-id="${CSS.escape(id ?? "")}"]`)?.focus();
}

function saveEdgeWeight(event) {
  event.preventDefault();
  const edge = graph.edges.find((candidate) => candidate.id === editingEdgeId);
  if (!edge) return closeEdgeEditor();
  const weight = Number(elements.edgeWeightInput.value);
  if (!Number.isFinite(weight) || weight <= 0) {
    showError("Road cost must be above 0.");
    return;
  }
  edge.weight = weight;
  const id = editingEdgeId;
  elements.edgeEditor.hidden = true;
  editingEdgeId = null;
  clearError();
  clearRun();
  elements.edgeLayer.querySelector(`[data-edge-id="${CSS.escape(id)}"]`)?.focus();
}

// setting map up and tools for drawing

function loadDemoMap() {
  try {
    graph = getMap({
      nodeCount: Number(elements.nodeCount.value), edgeCount: Number(elements.edgeCount.value),
      addressCount: Number(elements.addressCount.value), seed: elements.seed.value, weightMode: elements.weightMode.value
    });
    clearError();
    setTool(null);
    clearRun();
    fitGraphToView();
  } catch (error) {
    showError(error.message);
  }
}

function shuffleSeed() {
  const words = ["exeter", "topsham", "crediton", "tiverton", "exmouth", "honiton", "dawlish", "cullompton"];
  elements.seed.value = `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 90 + 10)}`;
  loadDemoMap();
}

const TOOL_HELP = {
  junction: "Click the map to add a junction.",
  house: "Click the map to add an address.",
  depot: "Click the map to place the depot.",
  connect: "Click two nodes to join them."
};
const DEFAULT_HELP = "";

function setTool(tool) {
  activeTool = tool && activeTool !== tool ? tool : null;
  selectedNodeId = null;
  elements.map.dataset.tool = activeTool ?? "";
  $$(".tool-button").forEach((button) => {
    const active = button.dataset.tool === activeTool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.toolHelp.textContent = activeTool ? TOOL_HELP[activeTool] : DEFAULT_HELP;
  updateNodeStates();
}

function handleMapClick(event) {
  if (performance.now() < ignoreClicksUntil) return;
  if (!activeTool || activeTool === "connect") return;
  const point = mapCoordinates(event);
  const bounds = graphBounds();
  if (point.x < 25 || point.x > bounds.width - 25 || point.y < 25 || point.y > bounds.height - 25) {
    showError("Too close to the edge.");
    return;
  }
  if (activeTool === "depot" && graph.nodes.some((node) => node.type === "depot")) {
    showError("There's already a depot.");
    return;
  }
  const index = graph.nodes.length + 1;
  const type = activeTool;
  let id = type === "depot" ? "depot" : `${type}_${index}`;
  while (nodeById(id)) id = `${id}_b`;
  const count = graph.nodes.filter((node) => node.type === type).length + 1;
  const label = type === "depot" ? "Depot" : type === "house" ? `House ${count}` : `J${count}`;
  graph.nodes.push({ id, x: point.x, y: point.y, type, label });
  if (type === "house") {
    graph.parcels.push({ id: `parcel_${Date.now()}_${index}`, contents: "Parcel", destination: id });
  }
  clearError();
  clearRun();
}

function handleNodeClick(id) {
  if (activeTool !== "connect") return;
  if (!selectedNodeId) {
    selectedNodeId = id;
    elements.toolHelp.textContent = `${nodeName(id)} selected.`;
    updateNodeStates();
    return;
  }
  if (selectedNodeId === id) {
    selectedNodeId = null;
    elements.toolHelp.textContent = TOOL_HELP.connect;
    updateNodeStates();
    return;
  }
  const duplicate = graph.edges.some((edge) =>
    (edge.from === selectedNodeId && edge.to === id) || (edge.from === id && edge.to === selectedNodeId));
  if (duplicate) {
    showError("That road already exists.");
  } else {
    const from = nodeById(selectedNodeId);
    const to = nodeById(id);
    const weight = Math.max(1, Math.round(euclidean(from, to) / 10));
    graph.edges.push({ id: `edge_${Date.now()}_${graph.edges.length}`, from: selectedNodeId, to: id, weight, directed: false });
    clearError();
  }
  selectedNodeId = null;
  clearRun();
  elements.toolHelp.textContent = TOOL_HELP.connect;
}

function clearMap() {
  graph = { nodes: [], edges: [], parcels: [], bounds: { width: VIEW_WIDTH, height: VIEW_HEIGHT } };
  selectedNodeId = null;
  clearError();
  clearRun();
  fitGraphToView();
}

// run plan

function validateForRun() {
  const errors = validateGraph(graph);
  if (graph.parcels.some((parcel) => !nodeById(parcel.destination))) errors.push("A parcel's address is missing.");
  if (graph.parcels.length === 0) errors.push("Add an address first.");
  return errors;
}

function dispatch() {
  clearError();
  hideNodeTip();
  const errors = validateForRun();
  if (errors.length > 0) {
    showError(errors[0]);
    return;
  }

  const depot = graph.nodes.find((node) => node.type === "depot");
  const destinations = graph.parcels.map((parcel) => parcel.destination);
  const astarStart = performance.now();
  const astar = planDeliveryRoute(graph, depot.id, destinations, { algorithm: "astar" });
  const astarMs = performance.now() - astarStart;
  const dijkstraStart = performance.now();
  const dijkstra = planDeliveryRoute(graph, depot.id, destinations, { algorithm: "dijkstra", order: astar.order });
  const dijkstraMs = performance.now() - dijkstraStart;

  if (!Number.isFinite(astar.cost)) {
    clearRun();
    const message = "An address can't be reached from the depot.";
    showError(message);
    return;
  }

  run = { astar, dijkstra, astarMs, dijkstraMs, depotId: depot.id };
  stopOrder = new Map(astar.order.map((id, index) => [id, index + 1]));
  renderGraph();
  renderComparison();
  buildFrames();
  elements.runLabel.textContent = "Run again";
  showFrame(0);
  play();
}

function setPhase(phase) {
  document.body.dataset.phase = phase;
}

function clearRun() {
  pause();
  run = null;
  frames = [];
  legStarts = [];
  frameIndex = 0;
  stopOrder = new Map();
  display = emptyDisplay();
  const depot = graph.nodes.find((node) => node.type === "depot");
  elements.routeLayer.replaceChildren();
  elements.edgeEditor.hidden = true;
  renderVan(depot ? { x: depot.x, y: depot.y } : null, 0);
  renderGraph();
  renderComparison();
  renderScores(null);
  renderSets([], []);
  renderTimeline();
  elements.runLabel.textContent = "Dispatch van";
  setPhase(graph.nodes.length > 0 ? "idle" : "empty");
}

// timeline

function buildFrames() {
  const result = currentResult();
  frames = [{ kind: "start" }];
  legStarts = [];
  result.legs.forEach((leg, legIndex) => {
    legStarts.push(frames.length);
    leg.searchLog.forEach((_, stepIndex) => frames.push({ kind: "search", leg: legIndex, step: stepIndex }));
    frames.push({ kind: "found", leg: legIndex });
  });
  frames.push({ kind: "planned" });
  for (let segment = 1; segment < result.path.length; segment += 1) frames.push({ kind: "drive", segment });
  frames.push({ kind: "done" });
  renderTimeline();
}

function renderTimeline() {
  elements.pauseButton.disabled = frames.length === 0;
}

function updateTimelinePosition() {
  const frame = frames[frameIndex];
  setPhase(frameIndex >= frames.length - 1 ? "done" : "running");
  $$("#legsBody tr").forEach((row) => {
    row.classList.toggle("active", frame.leg !== undefined && Number(row.dataset.leg) === frame.leg);
  });
}

function setPlaying(value) {
  playing = value;
  elements.pauseButton.dataset.playing = String(value);
  elements.pauseButton.setAttribute("aria-label", value ? "Pause" : "Play");
  elements.pauseButton.title = value ? "Pause (Space)" : "Play (Space)";
}

function play() {
  if (frames.length === 0) return;
  if (frameIndex >= frames.length - 1) showFrame(0);
  setPlaying(true);
  const token = ++playToken;
  playLoop(token);
}

function pause() {
  if (!playing) return;
  playToken += 1;
  setPlaying(false);
  if (frames.length > 0) showFrame(frameIndex);
}

function togglePlay() {
  if (playing) pause(); else play();
}

async function playLoop(token) {
  while (token === playToken && frameIndex < frames.length - 1) {
    const frame = frames[frameIndex];
    const delay = (FRAME_TIME[frame.kind] ?? 400) / speed();
    if (delay > 0) await interruptibleWait(delay, token);
    if (token !== playToken) return;
    const next = frames[frameIndex + 1];
    if (next.kind === "drive") {
      const completed = await animateDrive(next.segment, token);
      if (!completed) return;
    }
    showFrame(frameIndex + 1);
  }
  if (token === playToken) setPlaying(false);
}

async function interruptibleWait(milliseconds, token) {
  let remaining = milliseconds;
  while (remaining > 0 && token === playToken) {
    const slice = Math.min(remaining, 50);
    await wait(slice);
    remaining -= slice;
  }
}

function animateDrive(segment, token) {
  const result = currentResult();
  const from = nodeById(result.path[segment - 1]);
  const to = nodeById(result.path[segment]);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const duration = reducedMotion.matches ? 60 : Math.max(220, euclidean(from, to) * 3.2) / speed();
  return new Promise((resolve) => {
    const startTime = performance.now();
    const tick = (now) => {
      if (token !== playToken) return resolve(false);
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const position = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
      renderVan(position, angle);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve(true);
    };
    requestAnimationFrame(tick);
  });
}

function stepBy(offset) {
  if (frames.length === 0) return;
  pause();
  showFrame(Math.min(frames.length - 1, Math.max(0, frameIndex + offset)));
}

function jumpToLeg(legIndex) {
  if (frames.length === 0 || legIndex < 0 || legIndex >= legStarts.length) return;
  pause();
  showFrame(legStarts[legIndex]);
}

function currentLegIndex() {
  const frame = frames[frameIndex];
  if (!frame) return -1;
  if (frame.leg !== undefined) return frame.leg;
  if (frame.kind === "start") return -1;
  return legStarts.length;
}

function setWatching(algorithm) {
  if (algorithm === watching) return;
  watching = algorithm;
  $$(".watch-toggle [data-algorithm]").forEach((button) =>
    button.setAttribute("aria-checked", String(button.dataset.algorithm === algorithm)));
  elements.formulaH.innerHTML = algorithm === "dijkstra" ? "0" : "<em>h</em>(n)";
  elements.formulaH.classList.toggle("zero", algorithm === "dijkstra");
  if (!run) return;
  const wasPlaying = playing;
  const previous = frames[frameIndex];
  pause();
  buildFrames();
  let target = 0;
  if (previous.kind === "search" || previous.kind === "found") {
    target = legStarts[previous.leg];
  } else if (previous.kind !== "start") {
    target = frames.findIndex((frame) => frame.kind === previous.kind && (frame.segment ?? 0) === (previous.segment ?? 0));
  }
  showFrame(Math.max(0, target));
  if (wasPlaying) play();
}

// showing frames

function showFrame(index) {
  if (frames.length === 0) return;
  frameIndex = Math.min(frames.length - 1, Math.max(0, index));
  const frame = frames[frameIndex];
  const result = currentResult();
  const lastSegment = result.path.length - 1;
  const depot = nodeById(run.depotId);
  display = emptyDisplay();

  // Route lines and van
  let vanAt = { x: depot.x, y: depot.y };
  let vanAngle = 0;
  let drivenUpTo = -1;
  elements.routeLayer.replaceChildren();

  if (frame.kind === "search" || frame.kind === "found") {
    const solidLegs = frame.kind === "found" ? frame.leg + 1 : frame.leg;
    for (let leg = 0; leg < solidLegs; leg += 1) {
      drawPolyline(elements.routeLayer, result.legs[leg].path, "route-line");
    }
    const leg = result.legs[frame.leg];
    display.goal = leg.to;
    display.legStart = leg.from;
    display.legIndex = frame.leg;
    if (frame.kind === "search") {
      markSearchStates(leg, frame.step);
    } else {
      for (const id of leg.searchLog.at(-1)?.closedSet ?? []) display.states.set(id, "closed");
    }
  } else if (frame.kind !== "start") {
    drawPolyline(elements.routeLayer, result.path, "route-line");
    if (frame.kind === "drive") drivenUpTo = frame.segment;
    if (frame.kind === "done") drivenUpTo = lastSegment;
    if (drivenUpTo > 0) {
      const at = nodeById(result.path[drivenUpTo]);
      const before = nodeById(result.path[drivenUpTo - 1]);
      vanAt = { x: at.x, y: at.y };
      vanAngle = Math.atan2(at.y - before.y, at.x - before.x);
      markDeliveredAlongPath(result.path.slice(0, drivenUpTo + 1));
      const nextStop = result.order.find((id) => !isDestinationDelivered(id));
      display.goal = nextStop ?? null;
    } else if (frame.kind === "planned") {
      display.goal = result.order[0];
    }
  }
  renderVan(vanAt, vanAngle);

  // Panel text
  renderScores(frame.kind === "search" ? result.legs[frame.leg].searchLog[frame.step] : null);
  if (frame.kind === "search") {
    const step = result.legs[frame.leg].searchLog[frame.step];
    renderSets(step.openSet, step.closedSet);
  } else if (frame.kind === "found") {
    renderSets([], result.legs[frame.leg].searchLog.at(-1)?.closedSet ?? []);
  } else {
    renderSets([], []);
  }

  updateNodeStates();
  renderParcels();
  updateTimelinePosition();
}

function markDeliveredAlongPath(path) {
  const visited = new Set(path);
  for (const parcel of graph.parcels) {
    if (visited.has(parcel.destination)) display.delivered.add(parcel.id);
  }
}

// highlighhting search

function markSearchStates(leg, stepIndex) {
  const step = leg.searchLog[stepIndex];
  const info = new Map();
  const first = leg.searchLog[0];
  info.set(leg.from, { g: 0, h: first.h, f: first.f });
  for (let index = 0; index <= stepIndex; index += 1) {
    for (const change of leg.searchLog[index].changes) {
      info.set(change.node, { g: change.g, h: change.h, f: change.f });
    }
  }
  for (const item of step.openSet) display.states.set(item.id, "open");
  for (const id of step.closedSet) display.states.set(id, "closed");
  display.states.set(step.current, "current");
  display.info = info;
}

function drawPolyline(layer, ids, className) {
  const points = ids.map(nodeById).filter(Boolean).map((node) => `${node.x},${node.y}`).join(" ");
  if (!points) return;
  layer.append(svgElement("polyline", { class: className, points }));
}

//van

function renderVan(position, angle = 0) {
  elements.vanLayer.replaceChildren();
  if (!position) return;
  const van = svgElement("g", { class: "van", transform: `translate(${position.x} ${position.y - 17})` });
  // switches van when change direction
  const headingLeft = Math.cos(angle) < 0;
  van.append(svgElement("image", { class: "van-image", href: "van.png", x: -23, y: -12.6, width: 46, height: 25.2, transform: headingLeft ? "" : "scale(-1 1)" }));
  elements.vanLayer.append(van);
}

// panel

function renderScores(step) {
  elements.gScore.textContent = step ? formatNumber(step.g) : "—";
  elements.hScore.textContent = step ? formatNumber(step.h) : "—";
  elements.fScore.textContent = step ? formatNumber(step.f) : "—";
}

function renderSets(openSet, closedSet) {
  const open = [...openSet].sort((a, b) => a.f - b.f);
  fillChips(elements.openSet, open, (item) => `${nodeName(item.id)} ${formatNumber(item.f)}`, (item, index) => index === 0 ? "best" : "");
  fillChips(elements.closedSet, closedSet, (id) => nodeName(id));
}

function fillChips(container, values, formatter, classFor = () => "") {
  container.replaceChildren();
  if (values.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "—";
    container.append(empty);
    return;
  }
  const limit = 24;
  values.slice(0, limit).forEach((value, index) => {
    const chip = document.createElement("span");
    chip.textContent = formatter(value);
    const extra = classFor(value, index);
    if (extra) chip.className = extra;
    container.append(chip);
  });
  if (values.length > limit) {
    const more = document.createElement("span");
    more.className = "more";
    more.textContent = `+${values.length - limit} more`;
    container.append(more);
  }
}

//comparison

function renderComparison() {
  const cells = ["astarCost", "astarExplored", "astarTime", "dijkstraCost", "dijkstraExplored", "dijkstraTime"];
  if (!run) {
    for (const key of cells) elements[key].textContent = "—";
    elements.astarMiniCount.textContent = "—";
    elements.dijkstraMiniCount.textContent = "—";
    renderMiniMap(elements.astarMini, null);
    renderMiniMap(elements.dijkstraMini, null);
    elements.legsWrap.hidden = true;
    elements.comparisonNote.textContent = "";
    return;
  }
  const { astar, dijkstra, astarMs, dijkstraMs } = run;
  elements.astarCost.textContent = formatNumber(astar.cost);
  elements.astarExplored.textContent = String(astar.exploredCount);
  elements.astarTime.textContent = `${astarMs.toFixed(2)} ms`;
  elements.dijkstraCost.textContent = formatNumber(dijkstra.cost);
  elements.dijkstraExplored.textContent = String(dijkstra.exploredCount);
  elements.dijkstraTime.textContent = `${dijkstraMs.toFixed(2)} ms`;
  elements.astarMiniCount.textContent = `${astar.exploredCount} explored`;
  elements.dijkstraMiniCount.textContent = `${dijkstra.exploredCount} explored`;
  renderMiniMap(elements.astarMini, astar, "astar");
  renderMiniMap(elements.dijkstraMini, dijkstra, "dijkstra");

  const saved = dijkstra.exploredCount - astar.exploredCount;
  elements.comparisonNote.textContent = saved > 0 ? `A* explored ${saved} fewer nodes.` : "Same number of nodes explored.";

  elements.legsBody.replaceChildren();
  astar.legs.forEach((leg, index) => {
    const row = document.createElement("tr");
    row.dataset.leg = String(index);
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Jump to leg ${index + 1}`);
    const other = dijkstra.legs[index];
    const fewer = other.exploredCount - leg.exploredCount;
    row.innerHTML = `
      <th scope="row"><span class="leg-num">${index + 1}</span><span class="leg-route"></span></th>
      <td>${formatNumber(leg.cost)}</td>
      <td class="astar">${leg.exploredCount}${fewer > 0 ? `<small>−${fewer}</small>` : ""}</td>
      <td>${other.exploredCount}</td>`;
    row.querySelector(".leg-route").textContent = `${nodeName(leg.from)} to ${nodeName(leg.to)}`;
    row.addEventListener("click", () => jumpToLeg(index));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        jumpToLeg(index);
      }
    });
    elements.legsBody.append(row);
  });
  elements.legsWrap.hidden = false;
}

function renderMiniMap(svg, result, algorithm) {
  svg.replaceChildren();
  const bounds = graphBounds();
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  if (graph.nodes.length === 0) return;
  const scale = bounds.width / 1000;
  const explored = new Set();
  for (const leg of result?.legs ?? []) for (const id of leg.searchLog.at(-1)?.closedSet ?? []) explored.add(id);
  for (const edge of graph.edges) {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (from && to) svg.append(svgElement("line", { class: "mini-road", x1: from.x, y1: from.y, x2: to.x, y2: to.y, "stroke-width": 5 * scale }));
  }
  if (result?.path?.length > 1) {
    const points = result.path.map(nodeById).map((node) => `${node.x},${node.y}`).join(" ");
    svg.append(svgElement("polyline", { class: "mini-route", points, "stroke-width": 9 * scale }));
  }
  for (const node of graph.nodes) {
    const isExplored = explored.has(node.id);
    svg.append(svgElement("circle", {
      class: `mini-node ${node.type}${isExplored ? ` explored ${algorithm}` : ""}`,
      cx: node.x, cy: node.y, r: (isExplored ? 17 : node.type === "junction" ? 8 : 12) * scale
    }));
  }
}

// pan gestures

function beginPan(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".node-group, .edge-group")) return;
  const point = rootCoordinates(event);
  panGesture = { pointerId: event.pointerId, startX: point.x, startY: point.y, viewX: view.x, viewY: view.y, moved: false };
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

//help

function toggleHelp(force) {
  const open = force ?? elements.helpPanel.hidden;
  elements.helpPanel.hidden = !open;
  elements.helpButton.setAttribute("aria-expanded", String(open));
}

// wiring

$("#generateButton").addEventListener("click", loadDemoMap);
elements.shuffleSeed.addEventListener("click", shuffleSeed);
for (const input of [elements.nodeCount, elements.edgeCount, elements.addressCount, elements.seed]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadDemoMap();
  });
}
elements.weightMode.addEventListener("change", loadDemoMap);
$("#clearButton").addEventListener("click", clearMap);
elements.resetButton.addEventListener("click", () => clearRun());
elements.runButton.addEventListener("click", dispatch);
elements.pauseButton.addEventListener("click", togglePlay);
$$(".watch-toggle [data-algorithm]").forEach((button) =>
  button.addEventListener("click", () => setWatching(button.dataset.algorithm)));
elements.speed.addEventListener("input", () => { elements.speedOutput.textContent = `${speed()}×`; });
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
$$(".tool-button").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
elements.edgeEditor.addEventListener("submit", saveEdgeWeight);
elements.edgeCancel.addEventListener("click", closeEdgeEditor);
elements.edgeEditor.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeEdgeEditor();
});
elements.helpButton.addEventListener("click", () => toggleHelp());
document.addEventListener("click", (event) => {
  if (!elements.helpPanel.hidden && !event.target.closest("#helpPanel, #helpButton")) toggleHelp(false);
});

const TOOL_KEYS = { 1: "depot", 2: "house", 3: "junction", 4: "connect" };

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const typing = event.target.closest("input, select, textarea");
  if (event.key === "Escape") {
    if (!elements.helpPanel.hidden) return toggleHelp(false);
    if (activeTool) return setTool(null);
    return;
  }
  if (typing) return;
  const onControl = event.target.closest("button, [role='button'], [tabindex='0']");
  switch (event.key) {
    case " ":
      if (onControl) return;
      event.preventDefault();
      if (frames.length > 0) togglePlay(); else dispatch();
      break;
    case "Enter":
      if (onControl) return;
      dispatch();
      break;
    case "ArrowRight": stepBy(1); break;
    case "ArrowLeft": stepBy(-1); break;
    case "]": jumpToLeg(Math.min(legStarts.length - 1, currentLegIndex() + 1)); break;
    case "[": {
      const leg = currentLegIndex();
      const atLegStart = leg >= 0 && leg < legStarts.length && frameIndex === legStarts[leg];
      jumpToLeg(Math.max(0, atLegStart || leg >= legStarts.length ? leg - 1 : leg));
      break;
    }
    case "a": case "A": setWatching("astar"); break;
    case "d": case "D": setWatching("dijkstra"); break;
    case "r": case "R": clearRun(); break;
    case "f": case "F": fitGraphToView(); break;
    case "?": toggleHelp(); break;
    default:
      if (TOOL_KEYS[event.key]) setTool(TOOL_KEYS[event.key]);
  }
});

new ResizeObserver(matchViewToStage).observe(elements.mapStage);
matchViewToStage();
loadDemoMap();
