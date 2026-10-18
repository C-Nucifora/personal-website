import { collections, allUnits } from "./collections.js?v=20261018-navigation-v2";

const workspace = document.querySelector(".workspace");
const projectPanel = document.querySelector(".project-panel");
const stage = document.querySelector(".stage");
const help = document.querySelector("#keyboard-help");
const announcement = document.querySelector("#navigation-status");
let collection = collections[0];
let units = collection.units;
let slugs = units.map(unit => unit.id);
let rows = [];
let articles = [];
let isHome = true;
let previewed = null;
let textView = false;
const mode = "rack";

function readRoute() {
  const requested = new URLSearchParams(location.search).get("rack");
  let slug;
  try { slug = decodeURIComponent(location.hash.slice(1)); } catch { slug = ""; }
  const unit = allUnits.find(item => item.id === slug || item.modules?.some(module => module.id === slug));
  const owner = collections.find(item => item.units.includes(unit));
  const rack = owner ?? collections.find(item => item.id === requested) ?? collections[0];
  return { id: rack.id, home: requested === null && !unit, index: unit ? rack.units.indexOf(unit) : null };
}

function writeRoute(index, method = "push") {
  const url = new URL(location.href);
  if (isHome && index === null) url.searchParams.delete("rack");
  else url.searchParams.set("rack", collection.id);
  url.hash = index === null ? "" : slugs[index];
  if (url.href !== location.href) history[method === "replace" ? "replaceState" : "pushState"](null, "", url);
}

function updateCollectionUI() {
  document.querySelectorAll("[data-collection-index]").forEach(section => { section.hidden = section.dataset.collectionIndex !== collection.id; });
  document.querySelectorAll("[data-collection-detail]").forEach(section => { section.hidden = section.dataset.collectionDetail !== collection.id; });
  document.querySelector(".collection-directory").hidden = !isHome;
  document.querySelector(".project-index").hidden = isHome;
  document.querySelectorAll("[data-collection-nav]").forEach(link => {
    if (link.dataset.collectionNav === (isHome ? "hall" : collection.id)) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    link.hash = "";
  });
  document.querySelectorAll(".collection-list a").forEach(link => { link.hash = ""; });
  document.querySelector("#collection-title").textContent = collection.title;
  document.querySelector("#collection-subtitle").textContent = `${units.length} ${collection.id === "experience" ? "records" : "projects"} in a 24U rack`;
  document.querySelector("#current-rack").textContent = collection.label;
  document.querySelector("#back-to-rack").textContent = `← ${collection.label} rack`;
  document.querySelector(".skip-link").href = selected !== null ? "#project-details" : isHome ? "#collection-directory" : "#project-index";
  document.title = `Christian Nucifora / ${isHome ? "Work" : collection.label}`;
  const position = collections.indexOf(collection);
  document.querySelector("#previous-rack").setAttribute("aria-label", `Previous rack, ${collections[(position + collections.length - 1) % collections.length].label}`);
  document.querySelector("#next-rack").setAttribute("aria-label", `Next rack, ${collections[(position + 1) % collections.length].label}`);
}

function activateCollection(id, { home = false, index = null, historyMode = "push", focus = false } = {}) {
  const next = collections.find(item => item.id === id) ?? collections[0];
  const changed = next !== collection;
  collection = next;
  units = collection.units;
  slugs = units.map(unit => unit.id);
  rows = [...document.querySelector(`[data-collection-index="${collection.id}"]`).querySelectorAll("[data-project]")];
  articles = [...document.querySelector(`[data-collection-detail="${collection.id}"]`).querySelectorAll("[data-detail]")];
  isHome = home;
  selected = null;
  previewed = null;
  returnFocusTarget = null;
  phase = "overview";
  showModuleState({ moduleId: null, phase: "closed" });
  updateCollectionUI();
  showPhase("overview", null);
  if (historyMode !== "none") writeRoute(index, historyMode);
  if (scene && !sceneFailed) {
    if (changed) scene.setCollection(collection.id);
    else scene.select(null);
  }
  projectPanel.scrollTop = 0;
  announcement.textContent = `${collection.label} rack. ${units.length} ${collection.id === "experience" ? "records" : "projects"}.`;
  if (index !== null && units[index]) openProject(index, false);
  else if (focus) (isHome ? document.querySelector("#collection-directory") : document.querySelector("#project-index")).focus({ preventScroll: true });
}

function followRoute() {
  const route = readRoute();
  if (rows.length && route.id === collection.id && route.home === isHome && route.index === selected) return;
  activateCollection(route.id, { ...route, historyMode: "none" });
}

const loading = document.querySelector("#scene-loading");
const hint = document.querySelector("#scene-hint");
const phaseLabel = document.querySelector("#phase-label");
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
  const isProject = nextPhase === "project" || nextPhase === "entering";
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
    entering: "Opening the full page…",
  };
  phaseLabel.textContent = labels[nextPhase] ?? "";
  const hints = {
    overview: "Click a unit to open its record.",
    extracting: "",
    focusing: "",
    project: units[index]?.id === "m1-toolchain" ? (selectedModule && modulePhase === "open" ? "Click the pulled-out module to read about the tool." : "Choose a module handle to pull out a tool.") : "Click the engraved title to read the full record.",
    returning: "",
    entering: "Opening the full page…",
  };
  hint.textContent = hints[nextPhase] ?? "";
  if (nextPhase === "overview" && previewed !== null) markPreview(previewed);
  if (isProject) {
    document.querySelector("#detail-bay").textContent = `${String(index + 1).padStart(2, "0")} / ${units[index].u}U`;
    const next = (index + 1) % slugs.length;
    const link = document.querySelector("#next-project");
    link.href = `#${slugs[next]}`;
    link.textContent = `Next · ${units[next].title} →`;
    if (!wasProject) articles[index].querySelector("h2").focus({ preventScroll: true });
    if (nextPhase === "project") announcement.textContent = `${units[index].title}. Project opened.`;
  }
  document.querySelectorAll("[data-view]").forEach(button => {
    button.disabled = nextPhase !== "overview";
  });
  document.querySelectorAll("[data-zoom]").forEach(button => {
    button.disabled = nextPhase !== "overview" && nextPhase !== "project";
  });
}

function markPreview(index) {
  previewed = index;
  rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
  if (phase === "overview") scene?.hover(index);
  if (index !== null) hint.textContent = `${units[index].title} · ${units[index].u}U. Press Enter to open.`;
}

function chooseProject(index) {
  if (isHome) {
    isHome = false;
    updateCollectionUI();
    writeRoute(null);
  }
  if (selected !== null) openProject(null);
  markPreview(index);
  returnFocusTarget = phase === "overview" ? null : rows[index];
  rows[index].focus({ preventScroll: true });
  rows[index].scrollIntoView({ block: "nearest", behavior: "instant" });
}

function moveRack(direction) {
  const index = (collections.indexOf(collection) + direction + collections.length) % collections.length;
  activateCollection(collections[index].id, { focus: true });
}

function enterProject(moduleId = null, href = null) {
  if (selected === null) return;
  const destination = href ?? `./project.html?project=${encodeURIComponent(units[selected].id)}${moduleId ? `&module=${encodeURIComponent(moduleId)}` : ""}`;
  if (!scene || sceneFailed || textView) location.href = destination;
  else scene.enterProject(selected, moduleId);
}

function returnFromProject() {
  if (selectedModule !== null) inspectModule(null);
  else openProject(null);
}

function openProject(index, updateHistory = true) {
  if (selected === index && (index !== null || phase === "overview")) return;
  const previous = selected;
  selected = index;
  returnFocusTarget = index === null && previous !== null
    ? (isHome ? document.querySelector(".collection-list a") : rows[previous])
    : null;
  showModuleState({ moduleId: null, phase: "closed" });
  if (updateHistory) writeRoute(index);
  rows.forEach((row, i) => {
    if (i === index) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
    row.classList.remove("is-hovered");
  });
  if (scene && !sceneFailed) scene.select(index);
  else showPhase(index === null ? "overview" : "project", index);
  if (matchMedia("(max-width: 900px)").matches) {
    const target = (sceneFailed || textView) && index !== null ? articles[index] : stage;
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
  if (link.matches("[data-collection-nav], .collection-list a, .identity, .datacenter-return")) {
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    const id = url.searchParams.get("rack");
    activateCollection(id ?? "software", { home: id === null, focus: true });
  } else if (link.matches("[data-project], #next-project")) {
    const index = slugs.indexOf(link.hash.slice(1));
    if (index < 0) return;
    event.preventDefault();
    openProject(index);
  } else if (link.matches("#back-to-rack")) {
    event.preventDefault();
    returnFromProject();
  } else if (link.matches(".project-page-link")) {
    if (!scene || sceneFailed || textView) return;
    const url = new URL(link.href);
    if (url.searchParams.get("project") !== units[selected]?.id) return;
    event.preventDefault();
    enterProject(url.searchParams.get("module"), link.href);
  }
});

document.querySelectorAll("[data-project]").forEach(row => {
  const highlight = () => {
    const index = rows.indexOf(row);
    if (index >= 0 && phase === "overview") markPreview(index);
  };
  row.addEventListener("pointerenter", highlight);
  row.addEventListener("pointerleave", () => {
    if (phase === "overview" && document.activeElement !== row) markPreview(null);
  });
  row.addEventListener("focus", highlight);
});

window.addEventListener("popstate", followRoute);
window.addEventListener("hashchange", followRoute);
function openHelp() {
  help.open = true;
  help.querySelector("summary").focus({ preventScroll: true });
  help.scrollIntoView({ block: "nearest", behavior: motionInput.checked ? "instant" : "smooth" });
}
document.querySelector("#show-help").addEventListener("click", openHelp);
document.addEventListener("keydown", event => {
  const target = event.target;
  if (event.key === "Escape" && !target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) {
    if (help.open) {
      help.open = false;
      if (help.contains(target)) (textView ? document.querySelector("#project-index") : stage).focus({ preventScroll: true });
    } else if (selected !== null) returnFromProject();
    else return;
    event.preventDefault();
    return;
  }
  const editing = target.closest("input, textarea, select, button, summary, [contenteditable]:not([contenteditable='false'])");
  if (editing || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (target.closest("a") && !target.closest(".project-row, .header-links, .identity")) return;
  const scoped = target === document.body || target.closest(".stage, .project-row, .project-index, .project-details h2, .header-links, .identity, .collection-directory");
  if (!scoped) return;
  if (event.key === "?" && target !== document.body) {
    event.preventDefault();
    openHelp();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    moveRack(event.key === "ArrowLeft" ? -1 : 1);
  } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const current = previewed ?? selected;
    const index = event.key === "Home" ? 0 : event.key === "End" ? units.length - 1
      : current === null ? (event.key === "ArrowUp" ? units.length - 1 : 0)
      : (current + (event.key === "ArrowUp" ? -1 : 1) + units.length) % units.length;
    chooseProject(index);
  } else if (event.key === "Enter" && !target.closest("a")) {
    event.preventDefault();
    if (phase === "project") enterProject(selectedModule);
    else if (phase === "overview") openProject(previewed ?? 0);
  }
});

document.querySelector("#previous-rack").addEventListener("click", () => moveRack(-1));
document.querySelector("#next-rack").addEventListener("click", () => moveRack(1));
document.querySelector("#text-view").addEventListener("click", event => {
  textView = !textView;
  event.currentTarget.setAttribute("aria-pressed", String(textView));
  event.currentTarget.textContent = textView ? "Show 3D" : "Text view";
  document.body.classList.toggle("text-view", textView);
  applyMotionPreference();
  if (textView && isHome) {
    isHome = false;
    updateCollectionUI();
    writeRoute(null);
  }
  announcement.textContent = textView ? "Text view. All work is available in the index." : "3D view restored.";
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
  scene?.setReducedMotion(reduced || textView);
}
motionInput.addEventListener("change", () => {
  userMotionChoice = motionInput.checked;
  applyMotionPreference();
});
motionPreference.addEventListener("change", applyMotionPreference);
applyMotionPreference();

followRoute();

try {
  const { createRackScene } = await import("./scene.js?v=20261018-navigation-v2");
  scene = createRackScene({
    canvas: document.querySelector("#rack-canvas"),
    collectionId: collection.id,
    mode,
    onCollectionSelect: id => activateCollection(id, { focus: true }),
    onSelect: index => openProject(index),
    onProjectOpen: index => { location.href = `./project.html?project=${encodeURIComponent(units[index].id)}`; },
    onModuleSelect: inspectModule,
    onModuleOpen: id => { location.href = `./project.html?project=m1-toolchain&module=${encodeURIComponent(id)}`; },
    onModuleChange: state => { if (!state.collectionId || state.collectionId === collection.id) showModuleState(state); },
    onHover: index => {
      if (index !== null && !units[index]) return;
      if (phase === "overview") previewed = index;
      rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
      if (phase === "overview") hint.textContent = index === null
        ? "Click a unit to open its record."
        : `${units[index].title} · ${units[index].u}U`;
    },
    onPhase: ({ phase: nextPhase, index, collectionId }) => {
      if (collectionId && collectionId !== collection.id) return;
      if (index !== null && index !== selected) return;
      showPhase(nextPhase, index);
    },
    onReady: () => { loading.hidden = true; },
    onError: failScene,
  });
  applyMotionPreference();
  // Navigation can happen while the initial scene import is still loading.
  scene.setCollection(collection.id);
  if (sceneFailed) showPhase(selected === null ? "overview" : "project", selected);
  else scene.select(selected);
} catch (error) {
  failScene(error);
  showPhase(selected === null ? "overview" : "project", selected);
}

window.addEventListener("pagehide", event => {
  if (!event.persisted) scene?.dispose();
});

// Inspectable state for local prototype verification, with no network telemetry.
window.__rackPrototype = {
  getState: () => ({ selected, phase, selectedModule, modulePhase, sceneFailed, mode, isHome, previewed, textView, collection: collection.id, scene: scene?.getState() }),
};
