import { collections, allUnits } from "./collections.js?v=20261018-front-row-v2";

const requestedRack = new URLSearchParams(location.search).get("rack");
const hashUnit = allUnits.find(unit => unit.id === location.hash.slice(1) || unit.modules?.some(module => module.id === location.hash.slice(1)));
const collection = collections.find(item => item.id === requestedRack)
  ?? collections.find(item => item.units.includes(hashUnit))
  ?? collections[0];
const units = collection.units;
const isHome = requestedRack === null && !hashUnit;
const mode = "rack";
document.querySelector(".skip-link").href = isHome ? "#collection-directory" : "#project-index";
document.querySelectorAll("[data-collection-index]").forEach(section => { section.hidden = section.dataset.collectionIndex !== collection.id; });
document.querySelectorAll("[data-collection-detail]").forEach(section => { section.hidden = section.dataset.collectionDetail !== collection.id; });
document.querySelector(".collection-directory").hidden = !isHome;
document.querySelector(".project-index").hidden = isHome;
document.querySelectorAll("[data-collection-nav]").forEach(link => {
  if (link.dataset.collectionNav === (isHome ? "hall" : collection.id)) link.setAttribute("aria-current", "page");
  // The static fragment keeps the text index reachable without JavaScript.
  link.hash = "";
});
document.querySelectorAll(".collection-list a").forEach(link => { link.hash = ""; });
document.querySelector("#collection-title").textContent = collection.title;
document.querySelector("#collection-subtitle").textContent = `${units.length} ${collection.id === "experience" ? "records" : "projects"} in a 24U rack`;
document.querySelector("#scene-loading").textContent = "Loading the rack…";
document.querySelector("#back-to-rack").textContent = `← ${collection.label} rack`;

const slugs = units.map(unit => unit.id);
const workspace = document.querySelector(".workspace");
const rows = [...document.querySelector(`[data-collection-index="${collection.id}"]`).querySelectorAll("[data-project]")];
const articles = [...document.querySelector(`[data-collection-detail="${collection.id}"]`).querySelectorAll("[data-detail]")];
const loading = document.querySelector("#scene-loading");
const hint = document.querySelector("#scene-hint");
const phaseLabel = document.querySelector("#phase-label");
const projectPanel = document.querySelector(".project-panel");
const motionInput = document.querySelector("#reduce-motion");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let scene;
let selected = null;
let sceneFailed = false;
let userMotionChoice = null;
let phase = "overview";
let indexScroll = 0;
let returnFocusTarget = null;
let selectedModule = null;
let modulePhase = "closed";
const moduleInspector = document.querySelector("#module-inspector");
const moduleButtons = [];
const m1Unit = allUnits.find(unit => unit.id === "m1-toolchain");

for (const module of m1Unit.modules) {
  const link = [...document.querySelectorAll("#m1-toolchain .module-link")].find(item => item.href === module.sourceUrl);
  if (!link) continue;
  const row = document.createElement("div");
  row.className = "module-entry";
  link.before(row);
  row.append(link);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "module-pull";
  button.dataset.module = module.id;
  button.textContent = "Pull out";
  button.setAttribute("aria-label", `Pull out ${module.title}`);
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-controls", "module-inspector");
  button.addEventListener("click", () => inspectModule(selectedModule === module.id ? null : module.id));
  row.append(button);
  moduleButtons.push(button);
}

function inspectModule(id) {
  if (!scene || sceneFailed || units[selected]?.id !== "m1-toolchain") return;
  scene.inspectModule(id);
}

function showModuleState({ moduleId, phase: nextPhase }) {
  const module = m1Unit.modules.find(item => item.id === moduleId);
  selectedModule = module?.id ?? null;
  modulePhase = nextPhase;
  moduleInspector.hidden = !module || units[selected]?.id !== "m1-toolchain";
  document.querySelector("#m1-toolchain").classList.toggle("has-open-module", !moduleInspector.hidden);
  document.querySelector("#back-to-rack").textContent = module && !moduleInspector.hidden ? "← M1 Toolchain" : `← ${collection.label} rack`;
  if (nextPhase === "extracting" && !moduleInspector.hidden) projectPanel.scrollTop = 0;
  moduleButtons.forEach(button => {
    const active = button.dataset.module === selectedModule;
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "Return" : "Pull out";
    button.setAttribute("aria-label", `${active ? "Return" : "Pull out"} ${m1Unit.modules.find(item => item.id === button.dataset.module).title}`);
  });
  if (module && !moduleInspector.hidden) {
    document.querySelector("#module-title").textContent = module.title;
    document.querySelector("#module-group").textContent = module.group;
    document.querySelector("#module-description").textContent = module.description;
    document.querySelector("#module-page").href = `./project.html?project=m1-toolchain&module=${encodeURIComponent(module.id)}`;
    document.querySelector("#module-source").href = module.sourceUrl;
    document.querySelector("#module-status").textContent = nextPhase === "extracting" ? "Pulling out module…" : nextPhase === "returning" ? "Returning module…" : "Module pulled out";
    document.querySelector("#return-module").disabled = nextPhase === "returning";
  }
  if (phase === "project" && units[selected]?.id === "m1-toolchain") {
    hint.textContent = module && nextPhase === "open"
      ? "Click the pulled-out module to read about the tool."
      : "Choose a module handle to pull out a tool.";
  }
}

document.querySelector("#return-module").addEventListener("click", () => inspectModule(null));

document.body.classList.add("is-enhanced");
motionInput.checked = motionPreference.matches;

function showPhase(nextPhase, index) {
  phase = nextPhase;
  const isProject = nextPhase === "project";
  const wasProject = workspace.classList.contains("is-project");
  if (isProject && !wasProject) indexScroll = projectPanel.scrollTop;
  workspace.classList.toggle("is-project", isProject);
  document.querySelector(".skip-link").href = isProject ? "#project-details" : isHome ? "#collection-directory" : "#project-index";
  if (isProject && !wasProject) projectPanel.scrollTop = 0;
  else if (!isProject && wasProject) projectPanel.scrollTop = indexScroll;
  if (nextPhase === "overview" && returnFocusTarget) {
    returnFocusTarget.focus({ preventScroll: true });
    returnFocusTarget = null;
  }
  workspace.dataset.phase = nextPhase;
  articles.forEach((article, i) => article.classList.toggle("is-selected", i === index));
  rows.forEach((row, i) => {
    if (i === selected) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
  const project = units[index]?.title ?? "";
  const labels = {
    overview: "",
    extracting: `Opening ${project}…`,
    focusing: `Opening ${project}…`,
    project: "",
    returning: "Returning to the rack…",
  };
  phaseLabel.textContent = labels[nextPhase];
  const hints = {
    overview: "Click a unit to open its record.",
    extracting: "",
    focusing: "",
    project: units[index]?.id === "m1-toolchain" ? (selectedModule && modulePhase === "open" ? "Click the pulled-out module to read about the tool." : "Choose a module handle to pull out a tool.") : "Click the engraved title to read the full record.",
    returning: "",
  };
  hint.textContent = hints[nextPhase];
  if (isProject) {
    document.querySelector("#detail-bay").textContent = `${String(index + 1).padStart(2, "0")} / ${units[index].u}U`;
    const next = (index + 1) % slugs.length;
    const link = document.querySelector("#next-project");
    link.href = `#${slugs[next]}`;
    link.textContent = `Next · ${units[next].title} →`;
    if (!wasProject) articles[index].querySelector("h2").focus({ preventScroll: true });
  }
  document.querySelectorAll("[data-view]").forEach(button => {
    button.disabled = nextPhase !== "overview";
  });
  document.querySelectorAll("[data-zoom]").forEach(button => {
    button.disabled = nextPhase !== "overview" && nextPhase !== "project";
  });
}

function routeIndex() {
  const slug = location.hash.slice(1);
  const index = units.findIndex(unit => unit.id === slug || unit.modules?.some(module => module.id === slug));
  return index < 0 ? null : index;
}

function openProject(index, updateHistory = true) {
  if (selected === index && (index !== null || phase === "overview")) return;
  const previous = selected;
  selected = index;
  returnFocusTarget = index === null && previous !== null
    ? (isHome ? document.querySelector(".collection-list a") : rows[previous])
    : null;
  showModuleState({ moduleId: null, phase: "closed" });
  if (updateHistory) history.pushState(null, "", index === null ? location.pathname + location.search : `#${slugs[index]}`);
  rows.forEach((row, i) => {
    if (i === index) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
    row.classList.remove("is-hovered");
  });
  if (scene && !sceneFailed) scene.select(index);
  else showPhase(index === null ? "overview" : "project", index);
  if (matchMedia("(max-width: 900px)").matches) {
    const target = sceneFailed && index !== null ? articles[index] : document.querySelector(".stage");
    target.scrollIntoView({ behavior: motionInput.checked ? "instant" : "smooth", block: "start" });
  }
}

function failScene(error) {
  if (sceneFailed) return;
  sceneFailed = true;
  moduleButtons.forEach(button => { button.disabled = true; });
  loading.hidden = true;
  document.body.classList.add("no-scene");
  document.querySelector("#scene-error").hidden = false;
  document.querySelector("#rack-canvas").hidden = true;
  hint.textContent = "Use the project index to explore the work";
  if (selected !== null) showPhase("project", selected);
  console.warn("Rack 3D view unavailable", error?.message || error);
}

document.addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.matches("[data-project], #next-project")) {
    event.preventDefault();
    const index = slugs.indexOf(link.hash.slice(1));
    if (index >= 0) openProject(index);
  } else if (link.matches("#back-to-rack")) {
    event.preventDefault();
    if (selectedModule !== null) inspectModule(null);
    else openProject(null);
  }
});

rows.forEach((row, index) => {
  const highlight = () => { if (phase === "overview") scene?.hover(index); };
  const clear = () => { if (phase === "overview") scene?.hover(null); };
  row.addEventListener("pointerenter", highlight);
  row.addEventListener("pointerleave", clear);
  row.addEventListener("focus", highlight);
  row.addEventListener("blur", clear);
});

window.addEventListener("popstate", () => openProject(routeIndex(), false));
window.addEventListener("hashchange", () => openProject(routeIndex(), false));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && selected !== null) {
    event.preventDefault();
    if (selectedModule !== null) inspectModule(null);
    else openProject(null);
  }
});

document.querySelector("#reset-view").addEventListener("click", () => {
  openProject(null);
  scene?.reset();
  document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === "perspective")));
});
document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    scene?.setView(button.dataset.view);
    document.querySelectorAll("[data-view]").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
  });
});
document.querySelectorAll("[data-zoom]").forEach(button => {
  button.addEventListener("click", () => scene?.zoom(button.dataset.zoom));
});

function applyMotionPreference() {
  const reduced = userMotionChoice ?? motionPreference.matches;
  motionInput.checked = reduced;
  document.body.classList.toggle("reduced-motion", reduced);
  scene?.setReducedMotion(reduced);
}
motionInput.addEventListener("change", () => {
  userMotionChoice = motionInput.checked;
  applyMotionPreference();
});
motionPreference.addEventListener("change", applyMotionPreference);
applyMotionPreference();

try {
  const { createRackScene } = await import("./scene.js?v=20261018-front-row-v2");
  scene = createRackScene({
    canvas: document.querySelector("#rack-canvas"),
    collectionId: collection.id,
    mode,
    onCollectionSelect: id => { location.href = `./index.html?rack=${encodeURIComponent(id)}`; },
    onSelect: index => openProject(index),
    onProjectOpen: index => { location.href = `./project.html?project=${encodeURIComponent(units[index].id)}`; },
    onModuleSelect: inspectModule,
    onModuleOpen: id => { location.href = `./project.html?project=m1-toolchain&module=${encodeURIComponent(id)}`; },
    onModuleChange: showModuleState,
    onHover: index => {
      rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
      if (phase === "overview") hint.textContent = index === null
        ? "Click a unit to open its record."
        : `${units[index].title} · ${units[index].u}U`;
    },
    onPhase: ({ phase: nextPhase, index }) => showPhase(nextPhase, index),
    onReady: () => { loading.hidden = true; },
    onError: failScene,
  });
  applyMotionPreference();
  const initialIndex = routeIndex();
  // A project may have been chosen while the scene module was still loading.
  selected = initialIndex;
  if (sceneFailed) showPhase(initialIndex === null ? "overview" : "project", initialIndex);
  else scene.select(initialIndex);
} catch (error) {
  failScene(error);
  const initialIndex = routeIndex();
  if (initialIndex !== null) openProject(initialIndex, false);
}

window.addEventListener("pagehide", event => {
  if (!event.persisted) scene?.dispose();
});

// Inspectable state for local prototype verification, with no network telemetry.
window.__rackPrototype = {
  getState: () => ({ selected, phase, selectedModule, modulePhase, sceneFailed, mode, collection: collection.id, scene: scene?.getState() }),
};
