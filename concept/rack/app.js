const slugs = ["m1-core", "m1-lsp", "nvim-m1", "tree-sitter-m1"];
const workspace = document.querySelector(".workspace");
const rows = [...document.querySelectorAll("[data-project]")];
const articles = [...document.querySelectorAll("[data-detail]")];
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

document.body.classList.add("is-enhanced");
motionInput.checked = motionPreference.matches;

function showPhase(nextPhase, index) {
  phase = nextPhase;
  const isProject = nextPhase === "project";
  workspace.classList.toggle("is-project", isProject);
  workspace.dataset.phase = nextPhase;
  articles.forEach((article, i) => article.classList.toggle("is-selected", i === index));
  rows.forEach((row, i) => {
    if (i === selected) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
  const project = index === null ? "" : slugs[index];
  const labels = {
    overview: "Rack overview",
    extracting: `Opening bay ${String(index + 1).padStart(2, "0")}`,
    focusing: `Inspecting ${project}`,
    project: `${project} / bay ${String(index + 1).padStart(2, "0")}`,
    returning: "Returning to rack",
  };
  phaseLabel.textContent = labels[nextPhase];
  const hints = {
    overview: "Select a bay or a project in the index",
    extracting: "Sliding the project out of the rack",
    focusing: "Moving in for a closer look",
    project: "Project open · Escape to return to rack",
    returning: "Returning the project to its bay",
  };
  hint.textContent = hints[nextPhase];
  if (isProject) {
    document.querySelector("#detail-bay").textContent = `Bay ${String(index + 1).padStart(2, "0")}`;
    const next = (index + 1) % slugs.length;
    const link = document.querySelector("#next-project");
    link.href = `#${slugs[next]}`;
    link.innerHTML = `Next bay · ${slugs[next]} <span aria-hidden="true">→</span>`;
    articles[index].querySelector("h2").focus({ preventScroll: true });
  }
  document.querySelectorAll("[data-view]").forEach(button => {
    button.disabled = nextPhase !== "overview";
  });
}

function routeIndex() {
  const index = slugs.indexOf(location.hash.slice(1));
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
  } else if (link.matches("#back-to-rack, .identity")) {
    event.preventDefault();
    openProject(null);
  }
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
    onHover: index => {
      rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
      if (phase === "overview") hint.textContent = index === null ? "Select a bay or a project in the index" : `Open bay ${String(index + 1).padStart(2, "0")} · ${slugs[index]}`;
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
