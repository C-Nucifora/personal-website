import { collections, allUnits } from "./collections.js?v=20261022-reader-polish-v2";

import { hasModuleCarriers } from './rack-layout.js?v=20261022-reader-polish-v2';
import { siteSettings, portfolio } from './site-data.js?v=20261022-reader-polish-v2';
import { buildPublicIndex } from './public-dom.js?v=20261022-reader-polish-v2';
buildPublicIndex();

import { createProjectReader } from "./project-reader.js?v=20261022-reader-polish-v2";

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
let textView = new URLSearchParams(location.search).get('view') === 'text';
try {
  if (!new URLSearchParams(location.search).has('view')) textView = sessionStorage.getItem('rack-view') === 'text';
  else sessionStorage.setItem('rack-view', textView ? 'text' : '3d');
} catch {}
document.body.classList.toggle('text-view', textView);
const mode = "rack";
let entryRequest = 0;
let pendingEntry = null;
let prepared = null;
let reading = false;
let readingRackURL = null;
let sceneRequest = 0;
const rackHeader = document.querySelector('body > .site-header');
const rackSkip = document.querySelector('body > .skip-link');
const reader = createProjectReader({
  onReturn: () => history.go(-(history.state?.readerDepth ?? 1)),
  onNavigate: url => showReaderRoute(url, true),
});

function setReading(value) {
  reading = value;
  document.body.classList.toggle('is-reading', value);
  workspace.inert = value;
  rackHeader.inert = value;
  rackSkip.inert = value;
}
function prepareProject(index, moduleId = null) {
  const unit = units[index];
  if (!unit) return Promise.resolve(null);
  const module = unit.modules.find(item => item.id === moduleId);
  const projectId = module?.projectId || unit.id;
  const pageModule = module?.projectId ? null : moduleId;
  const key = `${projectId}/${pageModule ?? ''}`;
  if (prepared?.key === key) return prepared.promise;
  const promise = reader.prepare(projectId, pageModule).then(record => { scene?.refresh?.(); return record; });
  // Failed speculative preparation is handled by the native route if the visitor opens it.
  promise.catch(() => {});
  prepared = { key, promise };
  return promise;
}
function cancelEntry({ invalidate = false } = {}) {
  entryRequest++;
  pendingEntry = null;
  reader.hide({ invalidate });
  if (invalidate) prepared = null;
}
function closeReader() {
  setReading(false);
  cancelEntry({ invalidate: true });
  if (!reading && selected !== null) prepareProject(selected, selectedModule);
  scene?.restoreInspection?.();
  updateCollectionUI();
}
async function showReaderRoute(url, push = false) {
  const request = ++entryRequest;
  try {
    const record = await reader.prepare(url.searchParams.get('project'), url.searchParams.get('module'));
    if (!record || request !== entryRequest) return;
    if (push) history.pushState({ rackReader: true, readerDepth: (history.state?.readerDepth ?? 0) + 1, rackURL: readingRackURL }, '', url);
    setReading(true);
    document.title = record.title;
    await reader.open(true);
  } catch {
    if (request === entryRequest) location.href = url.href;
  }
}
async function finishEntry(index, moduleId = null) {
  const entry = pendingEntry;
  if (!entry || entry.index !== index || entry.moduleId !== moduleId || entry.request !== entryRequest || selected !== index) return;
  pendingEntry = null;
  writeRoute(index, 'replace', moduleId);
  readingRackURL = location.href;
  history.pushState({ rackReader: true, readerDepth: 1, rackURL: readingRackURL }, '', entry.destination);
  setReading(true);
  document.title = entry.record.title;
  await reader.open(motionInput.checked);
}


function readRoute() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("rack");
  let slug;
  try { slug = decodeURIComponent(location.hash.slice(1)); } catch { slug = ""; }
  const [parentSlug, hashModule] = slug.split('/');
  const unit = allUnits.find(item => item.id === parentSlug || item.modules?.some(module => module.id === parentSlug));
  const owner = collections.find(item => item.units.includes(unit));
  const rack = owner ?? collections.find(item => item.id === requested) ?? collections[0];
  const requestedModule = params.get('module') ?? hashModule ?? (unit?.id !== parentSlug ? parentSlug : null);
  const moduleId = hasModuleCarriers(unit) && unit.modules.some(module => module.id === requestedModule) ? requestedModule : null;
  return { id: rack.id, home: requested === null && !owner, index: owner ? rack.units.indexOf(unit) : null, moduleId };
}

function writeRoute(index, method = "push", moduleId = selectedModule) {
  const url = new URL(location.href);
  if (isHome && index === null) url.searchParams.delete("rack");
  else url.searchParams.set("rack", collection.id);
  if (index !== null && moduleId) url.searchParams.set('module', moduleId);
  else url.searchParams.delete('module');
  if (textView) url.searchParams.set('view', 'text');
  else url.searchParams.delete('view');
  url.hash = index === null ? "" : slugs[index];
  if (url.href !== location.href) history[method === "replace" ? "replaceState" : "pushState"]({ rackModule: moduleId }, "", url);
}
function projectURL(unit, module = null) {
  const url = new URL('./project.html', location.href);
  url.searchParams.set('project', module?.projectId || unit.id);
  if (module && !module.projectId) url.searchParams.set('module', module.id);
  if (textView) url.searchParams.set('view', 'text');
  return url.href;
}
function updateSelectionBar() {
  const bar = document.querySelector('#selection-bar');
  if (!bar) return;
  const unit = units[selected];
  const module = unit?.modules.find(item => item.id === selectedModule);
  bar.hidden = !unit;
  if (!unit) return;
  document.querySelector('#selection-title').textContent = module?.title || unit.title;
  document.querySelector('#selection-summary').textContent = module?.group || `${unit.u}U · ${unit.subtitle}`;
  const link = document.querySelector('#selection-open');
  link.href = projectURL(unit, module);
  link.textContent = unit.type === 'record' && unit.rackUnit.placement?.rackId === 'experience' ? 'Open record →' : 'Open project →';
  link.setAttribute('aria-label', `Open ${module?.title || unit.title}`);
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
  document.querySelector("#collection-subtitle").textContent = `${units.length} ${collection.id === "experience" ? "records" : "projects"} in a ${collection.capacityU}U rack`;
  document.querySelector("#current-rack").textContent = collection.label;
  document.querySelector("#back-to-rack").textContent = `← ${collection.label} rack`;
  document.querySelector(".skip-link").href = selected !== null ? "#project-details" : isHome ? "#collection-directory" : "#project-index";
  document.title = `${siteSettings.intro.name} / ${isHome ? "Work" : collection.label}`;
  const position = collections.indexOf(collection);
  document.querySelector("#previous-rack").setAttribute("aria-label", `Previous rack, ${collections[(position + collections.length - 1) % collections.length].label}`);
  document.querySelector("#next-rack").setAttribute("aria-label", `Next rack, ${collections[(position + 1) % collections.length].label}`);
}

function activateCollection(id, { home = false, index = null, historyMode = "push", focus = false, moduleId = null, instant = false } = {}) {
  cancelEntry({ invalidate: true });
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
  if (index !== null && units[index]) {
    openProject(index, false, instant);
    if (moduleId) {
      selectedModule = moduleId;
      if (scene && !sceneFailed) scene.restoreState(index, moduleId);
      else showModuleState({ moduleId, phase: 'open' });
    }
  }
  else if (focus) (isHome ? document.querySelector("#collection-directory") : document.querySelector("#project-index")).focus({ preventScroll: true });
}

function followRoute() {
  const url = new URL(location.href);
  if (url.pathname.endsWith('/project.html') && history.state?.rackReader) {
    readingRackURL = history.state.rackURL;
    showReaderRoute(url);
    return;
  }
  const wasReading = reading;
  if (reading || pendingEntry) closeReader();
  const route = readRoute();
  if (!rows.length || route.id !== collection.id || route.home !== isHome || route.index !== selected || route.moduleId !== selectedModule) {
    activateCollection(route.id, { ...route, historyMode: "none", instant: true });
  }
  if (wasReading) {
    const restoredURL = location.href;
    requestAnimationFrame(() => {
      if (reading || pendingEntry || location.href !== restoredURL) return;
      const target = selectedModule && !moduleInspector.hidden ? document.querySelector('#module-title')
        : articles[selected]?.querySelector('h2') ?? document.querySelector(isHome ? '#collection-directory' : '#project-index');
      target?.focus({ preventScroll: true });
    });
  }
}

const loading = document.querySelector("#scene-loading");
const canvas = document.querySelector('#rack-canvas');
const hint = document.querySelector("#scene-hint");
const phaseLabel = document.querySelector("#phase-label");
const motionInput = document.querySelector("#reduce-motion");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let scene;
let selected = null;
let sceneFailed = false;
let graphicsLost = false;
let graphicsUnavailable = false;
let userMotionChoice = null;
let phase = "overview";
let indexScroll = 0;
let returnFocusTarget = null;
let selectedModule = null;
let modulePhase = "closed";
const moduleInspector = document.querySelector("#module-inspector");
const moduleButtons = [];
for (const unit of allUnits.filter(hasModuleCarriers)) {
  const article = [...document.querySelectorAll('[data-project-id]')].find(item => item.dataset.projectId === unit.id);
  for (const module of unit.modules) {
    const links = [...(article?.querySelectorAll('.module-link') ?? [])];
    const link = links.find(item => item.dataset.moduleId === module.id) ?? links.find(item => module.projectId ? new URL(item.href).searchParams.get('project') === module.projectId : item.href === module.sourceUrl);
    if (!link) continue;
    const row = document.createElement('div');
    row.className = 'module-entry';
    link.before(row);
    row.append(link);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'module-pull';
    button.dataset.module = module.id;
    button.dataset.unit = unit.id;
    button.textContent = 'Pull out';
    button.setAttribute('aria-label', `Pull out ${module.title}`);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-controls', 'module-inspector');
    button.addEventListener('click', () => inspectModule(selectedModule === module.id ? null : module.id));
    row.append(button);
    moduleButtons.push(button);
  }
}

function inspectModule(id) {
  cancelEntry();
  const unit = units[selected];
  if (!hasModuleCarriers(unit) || (id !== null && !unit.modules.some(module => module.id === id))) return;
  writeRoute(selected, 'replace', id);
  if (scene && !sceneFailed && !textView) scene.inspectModule(id);
  else showModuleState({ moduleId: id, phase: id ? 'open' : 'closed' });
}

function showModuleState({ moduleId, phase: nextPhase }) {
  const unit = units[selected];
  const module = unit?.modules?.find(item => item.id === moduleId);
  const previousModule = selectedModule;
  const inspectorHadFocus = moduleInspector.contains(document.activeElement);
  const pullHadFocus = moduleButtons.some(button => button === document.activeElement);
  if (inspectorHadFocus && (nextPhase === 'returning' || !module)) {
    moduleButtons.find(button => button.dataset.unit === unit?.id && button.dataset.module === previousModule)?.focus({ preventScroll: true });
  }
  selectedModule = module?.id ?? null;
  if (!reading && selected !== null) prepareProject(selected, selectedModule);
  modulePhase = nextPhase;
  moduleInspector.hidden = !module || !hasModuleCarriers(unit);
  document.querySelectorAll('[data-project-id]').forEach(article => article.classList.toggle('has-open-module', article.dataset.projectId === unit?.id && !moduleInspector.hidden));
  if (!moduleInspector.hidden) {
    const article = articles[selected];
    const modules = article?.querySelector('.bundle-modules');
    if (article && (moduleInspector.parentElement !== article || moduleInspector.nextElementSibling !== modules)) article.insertBefore(moduleInspector, modules);
  }
  document.querySelector('#back-to-rack').textContent = module && !moduleInspector.hidden ? `← ${unit.title}` : `← ${collection.label} rack`;
  if (nextPhase === 'extracting' && !moduleInspector.hidden) projectPanel.scrollTop = 0;
  moduleButtons.forEach(button => {
    const active = button.dataset.unit === unit?.id && button.dataset.module === selectedModule;
    const owner = allUnits.find(item => item.id === button.dataset.unit);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Return' : 'Pull out';
    button.setAttribute('aria-label', `${active ? 'Return' : 'Pull out'} ${owner.modules.find(item => item.id === button.dataset.module).title}`);
  });
  if (module && !moduleInspector.hidden) {
    document.querySelector('#module-title').textContent = module.title;
    const group = document.querySelector('#module-group');
    group.textContent = module.group || '';
    group.hidden = !module.group;
    document.querySelector('#module-description').textContent = module.description;
    document.querySelector('#module-page').href = projectURL(unit, module);
    document.querySelector('#module-page').textContent = module.projectId ? 'Open project page →' : 'Read about this tool →';
    document.querySelector('#return-module').textContent = module.projectId ? 'Return project' : 'Return module';
    const source = document.querySelector('#module-source');
    source.hidden = !module.sourceUrl;
    if (module.sourceUrl) source.href = module.sourceUrl;
    document.querySelector('#module-status').textContent = nextPhase === 'extracting' ? 'Pulling out project…' : nextPhase === 'returning' ? 'Returning project…' : 'Project pulled out';
    document.querySelector('#return-module').disabled = nextPhase === 'returning';
    if (nextPhase === 'extracting' && (pullHadFocus || inspectorHadFocus)) document.querySelector('#module-title').focus({ preventScroll: true });
  }
  if (phase === 'project' && hasModuleCarriers(unit)) hint.textContent = module && nextPhase === 'open' ? 'Open project to read the full record.' : 'Choose a handle to pull out a project, or open this record.';
  updateSelectionBar();
}

document.querySelector("#return-module").addEventListener("click", () => inspectModule(null));

document.body.classList.add("is-enhanced");
motionInput.checked = motionPreference.matches;

function showPhase(nextPhase, index) {
  phase = nextPhase;
  updateSelectionBar();
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
    project: hasModuleCarriers(units[index]) && !selectedModule ? "Choose a handle to pull out a project, or open this record." : "Open project to read the full record.",
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
  if (index !== null && !units[index]) return;
  previewed = index;
  rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
  if (phase === "overview") scene?.hover(index);
  if (index !== null) hint.textContent = `${units[index].title} · ${units[index].u}U. Press Enter to open.`;
}

function chooseProject(index) {
  if (!units[index]) return;
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

async function enterProject(moduleId = null, href = null) {
  if (selected === null || reading || pendingEntry) return;
  const index = selected;
  const destination = href ?? projectURL(units[index], units[index].modules.find(module => module.id === moduleId));
  if (!scene || sceneFailed || textView) { location.href = destination; return; }
  if (moduleId && selectedModule !== moduleId) return;
  if (phase !== 'project' || (moduleId && modulePhase !== 'open')) scene.restoreState(index, moduleId);
  const request = ++entryRequest;
  pendingEntry = { index, moduleId, destination, request };
  try {
    const record = await prepareProject(index, moduleId);
    if (request !== entryRequest || !pendingEntry || selected !== index || (moduleId !== null && selectedModule !== moduleId) || phase !== 'project') return;
    if (!record) throw new Error('Project preparation was cancelled');
    pendingEntry.record = record;
    if (!scene.enterProject(index, moduleId)) pendingEntry = null;
  } catch {
    if (request === entryRequest) { pendingEntry = null; location.href = destination; }
  }
}

function returnFromProject() {
  if (reading) { history.go(-(history.state?.readerDepth ?? 1)); return; }
  if (pendingEntry || phase === 'entering') {
    cancelEntry();
    scene?.restoreInspection?.();
    return;
  }
  if (selectedModule !== null) inspectModule(null);
  else openProject(null);
}

function openProject(index, updateHistory = true, instant = false) {
  if (index !== null && !units[index]) return;
  if (selected === index && (index !== null || phase === "overview")) return;
  cancelEntry({ invalidate: true });
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
  if (scene && !sceneFailed) {
    if (instant || textView) scene.restoreState(index);
    else scene.select(index);
  }
  else showPhase(index === null ? "overview" : "project", index);
  if (matchMedia("(max-width: 900px)").matches) {
    const target = (sceneFailed || textView) && index !== null ? articles[index] : stage;
    target.scrollIntoView({ behavior: instant || textView || motionInput.checked ? "instant" : "smooth", block: "start" });
  }
}

function failScene(error) {
  if (error?.code === 'CONTEXT_LOST') graphicsLost = true;
  if (!reading) cancelEntry();
  const removedFocus = moduleInspector.contains(document.activeElement) || moduleButtons.includes(document.activeElement) || stage.contains(document.activeElement);
  sceneFailed = true;
  moduleButtons.forEach(button => { button.disabled = true; });
  loading.hidden = true;
  document.body.classList.add('no-scene');
  const notice = document.querySelector('#scene-error');
  notice.hidden = textView;
  document.querySelector('#rack-canvas').hidden = true;
  notice.querySelector('p').textContent = !portfolio.racks.length ? 'No racks are currently published.' : graphicsUnavailable ? "This browser can't show the 3D view." : graphicsLost ? 'The 3D view was interrupted.' : 'The 3D view could not start.';
  notice.querySelectorAll('p')[1].textContent = graphicsUnavailable ? 'Every project is in the index below.' : graphicsLost ? 'Waiting for graphics to recover… Every project is available in the index.' : 'Every project is available in the index. Retry 3D to restore your place.';
  const retry = document.querySelector('#scene-retry');
  retry.hidden = !portfolio.racks.length || graphicsUnavailable;
  retry.disabled = graphicsLost;
  hint.textContent = 'Use the project index to explore the work.';
  showPhase(selected === null ? 'overview' : 'project', selected);
  if (removedFocus) (selected !== null ? articles[selected].querySelector('h2') : document.querySelector(isHome ? '#collection-directory' : '#project-index')).focus({ preventScroll: true });
  console.warn('Rack 3D view unavailable', error?.message || error);
}

document.addEventListener("click", event => {
  const link = event.target.closest("a");
  if (reader.contains(event.target)) return;
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
    if (selected === index) enterProject(selectedModule);
    else openProject(index);
  } else if (link.matches("#back-to-rack")) {
    event.preventDefault();
    returnFromProject();
  } else if (link.matches(".project-page-link, .module-link")) {
    if (!scene || sceneFailed || textView) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.pathname.endsWith('/project.html')) return;
    const module = units[selected]?.modules.find(item => item.projectId === url.searchParams.get('project'));
    if (url.searchParams.get("project") !== units[selected]?.id && !module) return;
    event.preventDefault();
    const moduleId = module?.id ?? url.searchParams.get('module');
    if (moduleId && selectedModule !== moduleId) {
      writeRoute(selected, 'replace', moduleId);
      scene.restoreState(selected, moduleId);
    }
    enterProject(moduleId, link.href);
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

window.addEventListener('scroll', () => {
  if (!reading) scene?.refresh?.();
}, { capture: true, passive: true });
window.addEventListener("popstate", followRoute);
window.addEventListener("hashchange", followRoute);
document.querySelector(".skip-link").addEventListener("click", event => {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = document.querySelector(event.currentTarget.getAttribute("href"));
  if (!target) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start", behavior: "instant" });
});
function openHelp() {
  help.open = true;
  help.querySelector("summary").focus({ preventScroll: true });
  help.scrollIntoView({ block: "nearest", behavior: textView || motionInput.checked ? "instant" : "smooth" });
}
document.querySelector("#show-help").addEventListener("click", openHelp);
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (reading) {
    if (event.key === 'Escape') { event.preventDefault(); returnFromProject(); }
    return;
  }
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
document.querySelector('#text-view').addEventListener('click', () => {
  const wasEntering = pendingEntry || phase === 'entering';
  cancelEntry();
  if (wasEntering) scene?.restoreInspection?.();
  textView = !textView;
  try { sessionStorage.setItem('rack-view', textView ? 'text' : '3d'); } catch {}
  applyTextView();
  if (textView && isHome) { isHome = false; updateCollectionUI(); }
  writeRoute(selected, 'replace');
  if (!textView && (!scene || sceneFailed)) startScene();
  announcement.textContent = textView ? 'Text view. All work is available in the index.' : '3D view restored.';
});
function applyTextView() {
  const button = document.querySelector('#text-view');
  button.setAttribute('aria-pressed', String(textView));
  button.textContent = textView ? 'Show 3D' : 'Text view';
  document.body.classList.toggle('text-view', textView);
  document.querySelector('#scene-error').hidden = textView || !sceneFailed;
  applyMotionPreference();
  document.querySelectorAll('a.project-page-link, a.module-link, .unplaced-list a').forEach(link => {
    const url = new URL(link.getAttribute('href') || './project.html', location.href);
    if (!url.pathname.endsWith('/project.html') || url.origin !== location.origin) return;
    if (textView) url.searchParams.set('view', 'text');
    else url.searchParams.delete('view');
    link.href = url.href;
  });
  updateSelectionBar();
}

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
  const reduced = userMotionChoice ?? (motionPreference.matches || siteSettings.appearance.reducedMotion);
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
applyTextView();

followRoute();

async function startScene() {
  if (graphicsLost) return;
  const request = ++sceneRequest;
  document.querySelector("#scene-retry").disabled = true;
  let creating = true;
  scene?.dispose();
  scene = null;
  sceneFailed = false;
  loading.hidden = false;
  try {
    if (!portfolio.racks.length) throw new Error('No racks are currently published');
    graphicsUnavailable = !window.WebGL2RenderingContext || !canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (graphicsUnavailable) throw new Error('WebGL2 is unavailable');
    const [{ createRackScene }] = await Promise.all([
      import("./scene.js?v=20261022-reader-polish-v2"),
      Promise.allSettled([
        document.fonts.load('700 32px "IBM Plex Sans"'),
        document.fonts.load('700 32px "IBM Plex Mono"'),
      ]),
    ]);
    if (request !== sceneRequest) return;
    const created = await createRackScene({
      finish: new URLSearchParams(location.search).get("finish") === "simple" ? "simple" : "realistic",
      canvas,
      collectionId: collection.id,
      mode,
      onCollectionSelect: id => { if (request === sceneRequest) activateCollection(id, { focus: true }); },
      onSelect: index => { if (request !== sceneRequest) return; if (selected === index) enterProject(selectedModule); else openProject(index); },
      onProjectOpen: index => { if (request === sceneRequest) finishEntry(index); },
      onEntryRequest: (index, moduleId) => { if (request === sceneRequest && index === selected) enterProject(moduleId); },
      onProjectScreen: screen => {
        if (request !== sceneRequest) return;
        const key = prepared?.key;
        reader.preview(screen && screen.index === selected && reader.getState().key === key && !textView ? screen.corners : null);
      },
      onModuleSelect: id => { if (request === sceneRequest) inspectModule(id); },
      onModuleOpen: id => { if (request === sceneRequest) finishEntry(selected, id); },
      onModuleChange: state => { if (request === sceneRequest && !creating && (!state.collectionId || state.collectionId === collection.id)) showModuleState(state); },
      onHover: index => {
        if (request !== sceneRequest) return;
        if (index !== null && !units[index]) return;
        if (phase === "overview") previewed = index;
        rows.forEach((row, i) => row.classList.toggle("is-hovered", i === index));
        if (phase === "overview") hint.textContent = index === null
          ? "Click a unit to open its record."
          : `${units[index].title} · ${units[index].u}U`;
      },
      onPhase: ({ phase: nextPhase, index, collectionId }) => {
        if (request !== sceneRequest || creating || (collectionId && collectionId !== collection.id)) return;
        if (index !== null && index !== selected) return;
        showPhase(nextPhase, index);
      },
      onReady: () => { if (request === sceneRequest) loading.hidden = true; },
      onError: error => { if (request === sceneRequest && !(graphicsLost && sceneFailed)) failScene(error); },
    });
    if (request !== sceneRequest) { created.dispose(); return; }
    scene = created;
    const restoreModule = selectedModule;
    creating = false;
    if (!sceneFailed) {
      document.body.classList.remove('no-scene');
      document.querySelector('#scene-error').hidden = true;
      document.querySelector('#rack-canvas').hidden = false;
      moduleButtons.forEach(button => { button.disabled = false; });
    }
    applyMotionPreference();
    // Navigation can happen while the initial scene import is still loading.
    scene.setCollection(collection.id);
    if (sceneFailed) showPhase(selected === null ? "overview" : "project", selected);
    else scene.restoreState(selected, restoreModule);
  } catch (error) {
    if (request !== sceneRequest) return;
    failScene(error);
    showPhase(selected === null ? "overview" : "project", selected);
  } finally {
    if (request === sceneRequest) document.querySelector("#scene-retry").disabled = graphicsLost;
  }
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  graphicsLost = true;
  failScene(Object.assign(new Error('The 3D graphics context was interrupted.'), { code: 'CONTEXT_LOST' }));
});
canvas.addEventListener('webglcontextrestored', () => {
  graphicsLost = false;
  document.querySelector('#scene-retry').disabled = false;
  // Let the renderer finish its own restoration before disposing and rebuilding it.
  queueMicrotask(() => { if (sceneFailed && !textView) startScene(); });
});
document.querySelector("#scene-retry").addEventListener("click", () => { if (graphicsLost || graphicsUnavailable) return; textView = false; try { sessionStorage.setItem('rack-view', '3d'); } catch {} applyTextView(); writeRoute(selected, 'replace'); startScene(); });
if (!textView) startScene();
else loading.hidden = true;

window.addEventListener("pagehide", event => {
  if (!event.persisted) scene?.dispose();
});

// Inspectable state for local prototype verification, with no network telemetry.
window.__rackPrototype = {
  getState: () => ({ selected, phase, selectedModule, modulePhase, sceneFailed, mode, isHome, previewed, textView, reading, reader: reader.getState(), collection: collection.id, scene: scene?.getState() }),
};
