import { units } from "./catalog.js";

const slugs = units.map(unit => unit.id);
const workspace = document.querySelector(".workspace");
const rows = [...document.querySelectorAll("[data-project]")];
const articles = [...document.querySelectorAll("[data-detail]")];
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

document.body.classList.add("is-enhanced");
motionInput.checked = motionPreference.matches;

function showPhase(nextPhase, index) {
  phase = nextPhase;
  const isProject = nextPhase === "project";
  const wasProject = workspace.classList.contains("is-project");
  if (isProject && !wasProject) indexScroll = projectPanel.scrollTop;
  workspace.classList.toggle("is-project", isProject);
  if (isProject && !wasProject) projectPanel.scrollTop = 0;
  else if (!isProject && wasProject) projectPanel.scrollTop = indexScroll;
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
    overview: "Click a unit to open a project.",
    extracting: "",
    focusing: "",
    project: "Click the engraved title to open the project page.",
    returning: "",
  };
  hint.textContent = hints[nextPhase];
  if (isProject) {
    document.querySelector("#detail-bay").textContent = `${String(index + 1).padStart(2, "0")} / ${units[index].u}U`;
    const next = (index + 1) % slugs.length;
    const link = document.querySelector("#next-project");
    link.href = `#${slugs[next]}`;
    link.textContent = `Next · ${units[next].title} →`;
    articles[index].querySelector("h2").focus({ preventScroll: true });
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
  if (updateHistory) history.pushState(null, "", index === null ? location.pathname + location.search : `#${slugs[index]}`);
  rows.forEach((row, i) => {
    if (i === index) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
    row.classList.remove("is-hovered");
  });
  if (scene && !sceneFailed) scene.select(index);
  else showPhase(index === null ? "overview" : "project", index);
  if (index === null && previous !== null) rows[previous].focus({ preventScroll: true });
  if (matchMedia("(max-width: 900px)").matches) {
    const target = sceneFailed && index !== null ? articles[index] : document.querySelector(".stage");
    target.scrollIntoView({ behavior: motionInput.checked ? "instant" : "smooth", block: "start" });
  }
}

function failScene(error) {
  if (sceneFailed) return;
  sceneFailed = true;
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
  } else if (link.matches("#back-to-rack, .identity, .overview-link")) {
    event.preventDefault();
    openProject(null);
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
    openProject(null);
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
  const { createRackScene } = await import("./scene.js");
  scene = createRackScene({
    canvas: document.querySelector("#rack-canvas"),
    onSelect: index => openProject(index),
    onProjectOpen: index => { location.href = `./project.html?project=${encodeURIComponent(units[index].id)}`; },
    onHover: index => {
      rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
      if (phase === "overview") hint.textContent = index === null ? "Click a unit to open a project." : `${units[index].title} · ${units[index].u}U`;
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
  getState: () => ({ selected, phase, sceneFailed, scene: scene?.getState() }),
};
