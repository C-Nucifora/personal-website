import { validatePortfolio, RACK_TYPES, DEFAULT_THEME } from './schema.js?v=20261023-content-v3';
import { createDefaultPortfolio } from './default-portfolio.js?v=20261023-content-v3';

const $ = (selector) => document.querySelector(selector);
const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clone = (value) => structuredClone(value);
const state = { config: null, baseline: '', revision: null, publishedRevision: null, history: [], csrf: '', local: false, busy: false, selected: 0, tab: 'project', dragged: null, capabilities: {} };
const get = (path) => path.split('.').reduce((value, key) => value?.[key], state.config);
function set(path, value) { const keys = path.split('.'); const last = keys.pop(); const parent = keys.reduce((object, key) => object[key], state.config); parent[last] = value; }
const dirty = () => state.config && JSON.stringify(state.config) !== state.baseline;
const project = () => state.config.projects[state.selected];
const projectPath = () => `projects.${state.selected}`;
const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
function notice(message, error = false) { const node = $('#notice'); node.textContent = message; node.classList.toggle('error', error); node.hidden = !message; }
function report(error) { notice(error.status === 409 ? 'A newer draft was saved elsewhere. Export your changes, reload this editor, then merge or import them before saving again.' : error.issues?.join(' · ') || error.message || 'The action failed. Your draft is still in this tab.', true); }
function status() {
  $('#draft-state').textContent = `${dirty() ? 'Unsaved changes' : state.local ? 'Local draft' : 'Draft saved'}${state.local ? '' : ` · Revision ${state.revision ?? 0} · Published ${state.publishedRevision ?? 'none'}`}`;
  $('#save').disabled = state.local || state.busy || !dirty();
  $('#publish').disabled = state.local || state.busy || dirty();
  $('#history').disabled = state.local || state.busy;
  for (const id of ['save', 'publish', 'history']) $(`#${id}`).title = state.local ? 'Unavailable in local preview. Export JSON to keep your changes.' : '';
  $('#sign-out').disabled = state.busy;
  $('.arrangement').inert = state.busy;
  $('.editor-column').inert = state.busy;
  $('#import').disabled = state.busy;
  $('#export').disabled = state.busy;
}
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...(state.csrf ? { 'x-csrf-token': state.csrf } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || data.message || `Request failed (${response.status}).`); error.status = response.status; error.issues = data.issues; throw error; }
  return data;
}
function field(label, path, type = 'text', options = {}) {
  const value = get(path) ?? '';
  const extra = Object.entries(options).map(([key, val]) => `${key}="${escape(val)}"`).join(' ');
  const control = type === 'textarea' ? `<textarea data-path="${path}" ${extra}>${escape(value)}</textarea>` : type === 'checkbox' ? `<input data-path="${path}" type="checkbox" ${value ? 'checked' : ''} ${extra}>` : `<input data-path="${path}" type="${type}" value="${escape(value)}" ${extra}>`;
  return `<label>${type === 'checkbox' ? control + escape(label) : escape(label) + control}</label>`;
}
function select(label, path, options) { return `<label>${escape(label)}<select data-path="${path}">${options.map((option) => { const [value, name] = Array.isArray(option) ? option : [option, option]; return `<option value="${escape(value)}" ${get(path) === value ? 'selected' : ''}>${escape(name)}</option>`; }).join('')}</select></label>`; }
function controls(path, index, count, title = 'item') { return `<div class="repeat-controls"><button data-array="${path}" data-index="${index}" data-op="up" ${index === 0 ? 'disabled' : ''} aria-label="Move ${escape(title)} up">↑</button><button data-array="${path}" data-index="${index}" data-op="down" ${index === count - 1 ? 'disabled' : ''} aria-label="Move ${escape(title)} down">↓</button><button data-array="${path}" data-index="${index}" data-op="remove" class="danger" aria-label="Remove ${escape(title)}">Remove</button></div>`; }
function listEditor(path, kind, title, row) {
  const list = get(path);
  return `<fieldset><legend>${title}</legend>${list.map((item, index) => {
    const label = escape(item.title || item.label || `${title.slice(0, -1)} ${index + 1}`);
    const content = `<div class="repeat-heading">${kind === 'module' ? '' : `<h3>${label}</h3>`}${controls(path, index, list.length, item.title || title)}</div>${row(`${path}.${index}`, item, index)}`;
    return kind === 'module' ? `<details class="repeat-item module-editor"><summary>${label}</summary>${content}</details>` : `<div class="repeat-item">${content}</div>`;
  }).join('')}<button data-add="${kind}" data-array="${path}">+ Add ${escape(kind)}</button></fieldset>`;
}
function linkFields(path) { return `<div class="field-grid">${field('Label', `${path}.label`)}${field('URL', `${path}.url`, 'url', { placeholder: 'https:// or mailto:' })}</div>`; }
function imageFields(path) { return `${field('Image URL or local asset path', `${path}.url`, 'text', { placeholder: 'https://… or /assets/…' })}<div class="field-grid">${field('Alternative text', `${path}.alt`)}${field('Caption', `${path}.caption`)}</div>`; }
function renderArrangement() {
  const chosen = project();
  $('#rack-list').innerHTML = state.config.racks.map((rack, rackIndex) => {
    const units = state.config.projects.filter((item) => item.rackUnit.placement?.rackId === rack.id);
    const capacity = rack.capacityU;
    return `<section class="rack-shell" aria-label="${escape(rack.label)} rack"><div class="rack-header"><button data-edit-rack="${rackIndex}" title="Edit ${escape(rack.label)}">${escape(rack.label)}</button><span class="rack-count">${units.reduce((sum, unit) => sum + unit.rackUnit.heightU, 0)}/${capacity}U</span></div><div class="rack-grid" style="grid-template-rows:repeat(${capacity},22px)">${Array.from({ length: capacity }, (_, row) => { const u = capacity - row; return `<span class="rack-u" style="grid-row:${row + 1}">${String(u).padStart(2, '0')}</span><button class="rack-slot" data-rack="${escape(rack.id)}" data-u="${u}" style="grid-row:${row + 1}" aria-label="Place selected project at ${escape(rack.label)} U${String(u).padStart(2, '0')}"></button>`; }).join('')}${units.map((item) => { const start = capacity - item.rackUnit.placement.startU - item.rackUnit.heightU + 2; return `<button draggable="true" data-project="${escape(item.id)}" aria-label="${escape(item.title)} · ${item.rackUnit.heightU}U · ${escape(item.rackUnit.type)}" class="rack-unit ${item.rackUnit.heightU === 1 ? 'single-u' : ''} ${item.id === chosen?.id ? 'selected' : ''} ${item.published ? '' : 'unpublished'}" style="grid-row:${start}/span ${item.rackUnit.heightU}" title="${escape(item.title)} · ${item.rackUnit.heightU}U"><span>${escape(item.rackUnit.faceTitle || item.title)}</span><small>${item.rackUnit.heightU}U · ${escape(item.rackUnit.type)}</small></button>`; }).join('')}</div></section>`;
  }).join('') || '<p class="empty">Add a rack to place equipment.</p>';
  const query = $('#search').value.trim().toLowerCase(); const filter = $('#filter').value;
  const inventory = state.config.projects.filter((item) => {
    const placed = !!item.rackUnit.placement;
    return (filter !== 'unplaced' || !placed) && (filter !== 'placed' || placed) && (filter !== 'unpublished' || !item.published) && `${item.title} ${item.subtitle} ${item.summary} ${item.stack.join(' ')}`.toLowerCase().includes(query);
  });
  $('#inventory').innerHTML = inventory.map((item) => { const place = item.rackUnit.placement; const rack = state.config.racks.find((r) => r.id === place?.rackId); return `<button draggable="true" data-project="${escape(item.id)}" class="inventory-item ${item.id === chosen?.id ? 'selected' : ''}"><span class="unit-size">${item.rackUnit.heightU}U</span><span class="inventory-title"><strong>${escape(item.title)}</strong><small>${place ? `${escape(rack?.label || place.rackId)} · U${String(place.startU).padStart(2, '0')}` : 'Unplaced'}${item.published ? '' : ' · Unpublished'}</small></span><span class="status-dot ${item.published ? '' : 'unpublished'}" aria-hidden="true"></span></button>`; }).join('') || '<p class="empty">No projects match this view.</p>';
}
function sectionEditor(path, section, index) {
  let content = section.type === 'image' ? imageFields(path) : field('Section title', `${path}.title`);
  if (section.type === 'text') content += field('Body', `${path}.body`, 'textarea', { rows: 6 });
  if (section.type === 'code') content += field('Language', `${path}.language`) + field('Code', `${path}.code`, 'textarea', { rows: 8, spellcheck: 'false' });
  if (section.type === 'gallery') content += listEditor(`${path}.images`, 'image', 'Images', imageFields);
  if (section.type === 'links') content += listEditor(`${path}.links`, 'link', 'Links', linkFields);
  return `<div class="repeat-item"><div class="repeat-heading"><h3>${index + 1}. ${escape(section.type)}</h3>${controls(path.slice(0, path.lastIndexOf('.')), index, get(path.slice(0, path.lastIndexOf('.'))).length, 'section')}</div>${field('Section ID', `${path}.id`)}${content}</div>`;
}
function pageAppearance(path) {
  return `<fieldset><legend>Reading page appearance</legend><div class="field-grid three">${field('Background', `${path}.theme.background`, 'color')}${field('Text', `${path}.theme.text`, 'color')}${field('Accent', `${path}.theme.accent`, 'color')}</div><div class="field-grid">${select('Font', `${path}.theme.font`, [['sans', 'Plex sans'], ['serif', 'Serif'], ['mono', 'Plex mono']])}${select('Layout', `${path}.theme.layout`, ['standard', 'wide', 'editorial'])}</div></fieldset>`;
}
function sectionControls(path) {
  return `<div class="section-add"><select aria-label="New section type"><option value="text">Text</option><option value="image">Image</option><option value="gallery">Gallery</option><option value="code">Code</option><option value="links">Links</option></select><button data-action="add-section" data-sections="${path}">+ Add section</button></div>`;
}
function moduleFields(path, module) {
  const record = `<div class="field-grid">${field('Module ID', `${path}.id`)}${field('Group', `${path}.group`)}</div>${field('Title', `${path}.title`)}${field('Description', `${path}.description`, 'textarea', { rows: 3 })}${field('Source URL', `${path}.sourceUrl`, 'url')}${select('Linked project page', `${path}.projectId`, [['', 'No linked project'], ...state.config.projects.filter(item => item.id !== project().id).map(item => [item.id, item.title])])}`;
  if (project().id !== 'm1-toolchain') return record;
  return `${record}<button data-preview-module="${escape(module.id)}">Preview tool page</button><label>Stack, one entry per line<textarea data-path="${path}.stack" data-lines="true" rows="3">${escape(module.stack.join('\n'))}</textarea></label>${listEditor(`${path}.facts`, 'fact', 'Tool facts', p => `<div class="field-grid">${field('Label', `${p}.label`)}${field('Value', `${p}.value`)}</div>`)}<label><input type="checkbox" data-module-theme="${path}" ${module.page.theme ? 'checked' : ''}>Custom tool page appearance</label>${module.page.theme ? pageAppearance(`${path}.page`) : '<p class="help">Uses the toolchain page appearance.</p>'}<fieldset><legend>Tool page sections</legend>${module.page.sections.map((section, index) => sectionEditor(`${path}.page.sections.${index}`, section, index)).join('')}${sectionControls(`${path}.page.sections`)}</fieldset>`;
}
function bundleWarning(item) {
  const parents = state.config.projects.filter(parent => parent.modules.some(module => module.projectId === item.id));
  const children = item.modules.map(module => state.config.projects.find(child => child.id === module.projectId)).filter(child => child?.rackUnit.placement);
  const messages = [];
  if (item.rackUnit.placement && parents.length) messages.push(`This project is placed separately and linked inside ${parents.map(parent => parent.title).join(', ')}. Both routes will be visible.`);
  if (children.length) messages.push(`These linked projects also have separate rack units: ${children.map(child => child.title).join(', ')}.`);
  return messages.length ? `<p class="bundle-warning">${escape(messages.join(' '))} Edit Nested modules to remove a bundle link if you only want the separate unit.</p>` : '';
}
function renderProject() {
  const item = project();
  if (!item) return '<p class="empty">Create a project to begin. Each project owns its equipment unit and reading page.</p>';
  const path = projectPath(); const unit = item.rackUnit; const placement = unit.placement;
  return `<div class="editor-intro"><div><h2>${escape(item.title)}</h2><p>${escape(item.id)}</p></div><button data-action="preview-page">Preview page</button></div>
    <div class="check-row">${field('Published project', `${path}.published`, 'checkbox')}${field('Placeholder content', `${path}.placeholder`, 'checkbox')}</div><p class="help">Published projects appear on the live site after publishing this draft. Placement only controls whether their equipment appears in a rack.</p>
    <fieldset><legend>Equipment & position</legend><div class="field-grid three">${field('Height in U', `${path}.rackUnit.heightU`, 'number', { min: 1, max: 48, step: 1 })}${select('Model type', `${path}.rackUnit.type`, RACK_TYPES)}${field('Face label', `${path}.rackUnit.faceTitle`)}</div><p class="placement-status">${placement ? `Placed at ${escape(placement.rackId)} U${String(placement.startU).padStart(2, '0')}–U${String(placement.startU + unit.heightU - 1).padStart(2, '0')}` : 'Unplaced · Still available as a published reading page'}</p><div class="placement-fields"><label>Rack<select id="placement-rack">${state.config.racks.map((rack) => `<option value="${escape(rack.id)}" ${rack.id === placement?.rackId ? 'selected' : ''}>${escape(rack.label)}</option>`).join('')}</select></label><label>Bottom U<input id="placement-u" type="number" min="1" max="48" value="${placement?.startU ?? 1}"></label></div><div class="inline-actions"><button data-action="place" ${state.config.racks.length ? '' : 'disabled'}>Set position</button><button data-action="unplace" ${placement ? '' : 'disabled'}>Remove from rack</button><button data-action="move-up" ${placement ? '' : 'disabled'}>↑ 1U</button><button data-action="move-down" ${placement ? '' : 'disabled'}>↓ 1U</button></div><p class="help">A unit occupies its bottom U and the positions above it. Overlaps and out-of-rack moves are rejected.</p></fieldset>
    ${bundleWarning(item)}<fieldset><legend>Project record</legend><label>Project ID / page URL<input value="${escape(item.id)}" data-project-id="${state.selected}" pattern="[a-z0-9]+(-[a-z0-9]+)*"></label>${field('Title', `${path}.title`)}${field('Subtitle', `${path}.subtitle`)}${field('Summary', `${path}.summary`, 'textarea', { rows: 3 })}${field('Description', `${path}.description`, 'textarea', { rows: 7 })}<div class="field-grid">${field('Source URL', `${path}.sourceUrl`, 'url')}${field('Source link label', `${path}.sourceLabel`)}</div><label>Stack, one entry per line<textarea data-path="${path}.stack" data-lines="true" rows="3">${escape(item.stack.join('\n'))}</textarea></label></fieldset>
    ${listEditor(`${path}.facts`, 'fact', 'Facts', (p) => `<div class="field-grid">${field('Label', `${p}.label`)}${field('Value', `${p}.value`)}</div>`)}
    ${listEditor(`${path}.modules`, 'module', 'Nested modules', moduleFields)}
    ${pageAppearance(`${path}.page`)}
    <fieldset><legend>Page sections</legend><p class="help">Sections follow the project record. Use text, images, galleries, code and links. Text is plain text and never executes HTML or scripts.</p><div class="asset-upload"><p>${state.local ? 'Local preview supports existing image URLs. Upload requires owner sign-in and configured media storage.' : 'Upload an image, then paste the returned URL into an image or gallery section. PNG, JPEG, WebP or GIF, up to 3 MB.'}</p><input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" ${state.local || state.capabilities.uploads === false ? 'disabled' : ''} aria-label="Upload image"><output id="asset-result"></output></div>${item.page.sections.map((section, index) => sectionEditor(`${path}.page.sections.${index}`, section, index)).join('')}${sectionControls(`${path}.page.sections`)}</fieldset>
    <fieldset><legend>Inventory order</legend><div class="inline-actions"><button data-action="project-up" ${state.selected === 0 ? 'disabled' : ''}>Move earlier</button><button data-action="project-down" ${state.selected === state.config.projects.length - 1 ? 'disabled' : ''}>Move later</button></div></fieldset><div class="delete-area"><button data-action="delete-project" class="danger">Delete project</button><p class="help">Deletion removes this record and its bundle links from this draft. Previous saved revisions remain in history.</p></div>`;
}
function renderRacks() {
  return `<div class="editor-intro"><div><h2>Racks</h2><p>Equipment positions follow their rack ID</p></div></div><p class="help">Rack order controls navigation and the front row. Deleting a rack moves its equipment into the unplaced inventory.</p>${state.config.racks.map((rack, index) => { const path = `racks.${index}`; return `<fieldset id="rack-editor-${index}"><legend>${escape(rack.label)}</legend><div class="repeat-heading"><h3>Rack ${index + 1}</h3>${controls('racks', index, state.config.racks.length, rack.label)}</div><label>Rack ID<input value="${escape(rack.id)}" data-rack-id="${index}" pattern="[a-z0-9]+(-[a-z0-9]+)*"></label><div class="field-grid">${field('Navigation label', `${path}.label`)}${field('Capacity in U', `${path}.capacityU`, 'number', { min: 1, max: 48, step: 1 })}</div>${field('Title', `${path}.title`)}${field('Description', `${path}.description`, 'textarea', { rows: 3 })}</fieldset>`; }).join('')}<button data-action="new-rack">+ Add rack</button>`;
}
function renderSite() {
  return `<div class="editor-intro"><div><h2>Site & story</h2><p>Introduction, links and datacenter appearance</p></div></div><fieldset><legend>Introduction</legend>${field('Name', 'settings.intro.name')}${field('Role', 'settings.intro.role')}${field('Personal introduction', 'settings.intro.bio', 'textarea', { rows: 6 })}</fieldset>${listEditor('settings.socialLinks', 'link', 'Social links', linkFields)}<fieldset><legend>Datacenter appearance</legend><div class="field-grid">${field('Background', 'settings.appearance.background', 'color')}${field('Floor color', 'settings.appearance.floorColor', 'color')}${field('Rack color', 'settings.appearance.rackColor', 'color')}${field('Accent color', 'settings.appearance.accent', 'color')}</div><div class="field-grid">${field('Exposure', 'settings.appearance.exposure', 'number', { min: 0, max: 3, step: .05 })}${field('Environment intensity', 'settings.appearance.environmentIntensity', 'number', { min: 0, max: 3, step: .05 })}${field('Material roughness', 'settings.appearance.materialRoughness', 'number', { min: 0, max: 1, step: .05 })}${field('Material metalness', 'settings.appearance.materialMetalness', 'number', { min: 0, max: 1, step: .05 })}</div>${field('Cast shadows', 'settings.appearance.shadows', 'checkbox')}${field('Reduce motion for everyone', 'settings.appearance.reducedMotion', 'checkbox')}</fieldset>`;
}
function renderEditor() {
  const editor = $('#editor');
  const projectId = state.tab === 'project' ? project()?.id ?? '' : '';
  const openModules = new Set(editor.dataset.projectId === projectId ? [...editor.querySelectorAll('.module-editor[open]')].map(node => node.querySelector('input[data-path$=".id"]').value) : []);
  document.querySelectorAll('[data-tab]').forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.tab === state.tab)));
  editor.innerHTML = state.tab === 'racks' ? renderRacks() : state.tab === 'site' ? renderSite() : renderProject();
  editor.dataset.projectId = projectId;
  for (const node of editor.querySelectorAll('.module-editor')) node.open = openModules.has(node.querySelector('input[data-path$=".id"]').value);
}
function render() { renderArrangement(); renderEditor(); status(); }
function choose(id) { if (state.busy) return; state.selected = state.config.projects.findIndex((item) => item.id === id); state.tab = 'project'; render(); }
function change(mutator, { validate = false } = {}) {
  if (state.busy) return false;
  const old = clone(state.config);
  try { mutator(); if (validate) state.config = validatePortfolio(state.config); render(); notice(''); return true; }
  catch (error) { state.config = old; report(error); return false; }
}
function place(rackId, startU, projectId = project()?.id) {
  if (!projectId) return;
  change(() => { const item = state.config.projects.find((p) => p.id === projectId); item.rackUnit.placement = { rackId, startU: Number(startU) }; }, { validate: true });
}
function makeProject() { return { id: uid('project'), title: 'New project', subtitle: '', summary: '', description: '', sourceUrl: '', sourceLabel: '', stack: [], facts: [], modules: [], placeholder: false, published: false, rackUnit: { heightU: 1, type: 'record', faceTitle: 'New project', placement: null }, page: { theme: clone(DEFAULT_THEME), sections: [] } }; }
function addRack() { change(() => { state.config.racks.push({ id: uid('rack'), label: 'New rack', title: 'New rack', description: '', capacityU: 24 }); state.tab = 'racks'; }); }
function localPreview() { state.local = true; state.config = createDefaultPortfolio(); state.baseline = JSON.stringify(state.config); state.revision = null; $('#gate').hidden = true; $('#workspace').hidden = false; $('#mode-banner').hidden = false; render(); }
async function save() {
  if (state.local || state.busy) return;
  try {
    const config = validatePortfolio(state.config); state.busy = true; status();
    const data = await api('/api/admin', { method: 'PUT', body: JSON.stringify({ config, expectedRevision: state.revision }) });
    accept(data, config); notice('Draft saved. The published site has not changed.');
  } catch (error) { report(error); } finally { state.busy = false; status(); }
}
function accept(data, fallback) {
  state.config = validatePortfolio(data.config || fallback || state.config); state.revision = data.revision ?? state.revision; state.publishedRevision = data.publishedRevision ?? state.publishedRevision; state.history = data.history ?? state.history; state.csrf = data.csrfToken || state.csrf; state.baseline = JSON.stringify(state.config); state.selected = Math.max(0, Math.min(state.selected, state.config.projects.length - 1)); render();
}
async function action(name, revision) {
  if (state.local || state.busy) return;
  if (dirty()) { notice('Save or export your current changes before publishing or restoring a revision.', true); return; }
  if (!confirm(name === 'publish' ? 'Publish this saved draft to the public portfolio?' : `Restore revision ${revision} as the current draft?`)) return;
  try { state.busy = true; status(); const data = await api('/api/admin', { method: 'POST', body: JSON.stringify({ action: name, expectedRevision: state.revision, ...(revision !== undefined ? { revision } : {}) }) }); accept(data); $('#history-dialog').close(); notice(name === 'publish' ? 'The saved draft is now published.' : 'Revision restored as a draft. Review it before publishing.'); }
  catch (error) { report(error); } finally { state.busy = false; status(); }
}
async function signIn() {
  try { const { csrfToken } = await api('/api/auth/csrf'); const form = new URLSearchParams({ csrfToken, callbackUrl: location.href }); const response = await fetch('/api/auth/signin/github', { method: 'POST', body: form, credentials: 'same-origin', headers: { 'X-Auth-Return-Redirect': '1' } }); const data = await response.json(); if (!response.ok || !data.url) throw new Error('GitHub sign-in is unavailable. Check the authentication setup.'); const url = new URL(data.url, location.origin); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid sign-in redirect.'); location.assign(url.href); } catch (error) { $('#gate-message').textContent = error.message; }
}
async function signOut() {
  if (state.busy) return;
  if (dirty() && !confirm('Leave with unsaved changes? Export your draft first to keep a copy.')) return;
  state.busy = true; status();
  try { const { csrfToken } = await api('/api/auth/csrf'); const response = await fetch('/api/auth/signout', { method: 'POST', body: new URLSearchParams({ csrfToken, callbackUrl: location.href }), credentials: 'same-origin' }); if (!response.ok) throw new Error('Sign-out failed. Please retry.'); state.baseline = JSON.stringify(state.config); location.reload(); } catch (error) { report(error); } finally { state.busy = false; status(); }
}
let previewRequest = 0;
async function previewPage(moduleId = null) {
  const request = ++previewRequest;
  let config;
  try { config = validatePortfolio(clone(state.config)); } catch (error) { report(error); return; }
  const item = config.projects[state.selected];
  const module = item.modules.find(module => module.id === moduleId);
  const target = $('#page-preview');
  target.replaceChildren();
  const label = document.createElement('p'); label.className = 'preview-label'; label.textContent = 'Unsaved draft · Actual reading page';
  const plate = document.createElement('div'); plate.className = 'equipment-preview';
  const face = document.createElement('strong'); face.textContent = item.rackUnit.faceTitle || item.title;
  const caption = document.createElement('small'); caption.textContent = `${item.rackUnit.heightU}U · Front label · Schematic preview`;
  plate.append(face, caption);
  const loading = document.createElement('p'); loading.textContent = 'Preparing page preview…';
  target.append(label, plate, loading);
  $('#preview-dialog').showModal();
  try {
    const [response, { renderProject: renderPage }] = await Promise.all([fetch('./project.html'), import('./project-content.js?v=20261023-content-v3')]);
    if (!response.ok) throw new Error('The page template could not load.');
    const template = new DOMParser().parseFromString(await response.text(), 'text/html');
    template.querySelectorAll('script').forEach(node => node.remove());
    const base = template.createElement('base'); base.href = new URL('./', location.href).href; template.head.prepend(base);
    if (request !== previewRequest || !$('#preview-dialog').open) return;
    const frame = document.createElement('iframe'); frame.title = `Draft page for ${module?.title ?? item.title}`; frame.className = 'draft-page-frame';
    frame.addEventListener('load', () => {
      if (request !== previewRequest || !frame.contentDocument) return;
      const allUnits = config.projects.map(project => ({ ...project, u: project.rackUnit.heightU, type: project.rackUnit.type, faceTitle: project.rackUnit.faceTitle || project.title, startU: project.rackUnit.placement?.startU ?? null }));
      const collections = config.racks.map(rack => ({ ...rack, units: allUnits.filter(unit => unit.rackUnit.placement?.rackId === rack.id).sort((a, b) => b.startU - a.startU) }));
      renderPage(frame.contentDocument, item.id, moduleId, { allUnits, collections, siteSettings: config.settings, usesBundledPortfolio: false });
      frame.contentDocument.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); });
      loading.remove();
    }, { once: true });
    frame.srcdoc = '<!doctype html>' + template.documentElement.outerHTML;
    target.append(frame);
  } catch (error) { loading.textContent = error.message || 'Page preview could not load.'; }
}

function showHistory() {
  $('#history-list').innerHTML = state.history.length ? state.history.map((entry) => `<div class="history-row"><div><p>Revision ${escape(entry.revision ?? entry.id)}${(entry.revision ?? entry.id) === state.publishedRevision ? ' · Published' : ''}</p><small>${escape(entry.createdAt || entry.created_at || entry.timestamp || '')}${entry.message ? ` · ${escape(entry.message)}` : ''}</small></div><button data-restore="${escape(entry.revision ?? entry.id)}">Restore draft</button></div>`).join('') : '<p class="empty">No previous revisions.</p>';
  $('#history-dialog').showModal();
}
async function upload(file) {
  if (state.local || state.busy || !file) return;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 3 * 1024 * 1024) { notice('Choose a PNG, JPEG, WebP or GIF image no larger than 3 MB.', true); return; }
  state.busy = true; status();
  try { const data = await api('/api/media', { method: 'POST', headers: { 'Content-Type': file.type }, body: file }); const node = $('#asset-result'); node.replaceChildren(); const label = document.createElement('label'); label.textContent = 'Uploaded asset URL'; const input = document.createElement('input'); input.value = data.url; input.readOnly = true; input.addEventListener('focus', () => input.select()); label.append(input); node.append(label); notice('Image uploaded. Copy its URL into an image or gallery section.'); }
  catch (error) { report(error); } finally { state.busy = false; status(); }
}
$('#local-preview').addEventListener('click', localPreview);
$('#sign-in').addEventListener('click', signIn);
$('#sign-out').addEventListener('click', signOut);
$('#save').addEventListener('click', save);
$('#publish').addEventListener('click', () => action('publish'));
$('#history').addEventListener('click', showHistory);
$('#new-rack').addEventListener('click', addRack);
$('#new-project').addEventListener('click', () => change(() => { state.config.projects.push(makeProject()); state.selected = state.config.projects.length - 1; state.tab = 'project'; }));
$('#search').addEventListener('input', renderArrangement);
$('#filter').addEventListener('change', renderArrangement);
$('#export').addEventListener('click', () => {
  try { const config = validatePortfolio(state.config); const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `portfolio-${state.local ? 'local' : state.revision}-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Validated draft exported.'); } catch (error) { report(error); }
});
$('#import').addEventListener('click', () => { if (!state.busy) $('#import-file').click(); });
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file || state.busy) return;
  state.busy = true; status();
  try { if (file.size > 3 * 1024 * 1024) throw new Error('JSON import is limited to 3 MB.'); const config = validatePortfolio(JSON.parse(await file.text())); if (!confirm(`Replace this tab's draft with ${config.projects.length} projects and ${config.racks.length} racks?${dirty() ? ' Current unsaved changes will be replaced.' : ''}`)) return; state.config = config; state.selected = 0; render(); notice('JSON imported and validated. Review the draft before saving.'); } catch (error) { report(error); } finally { event.target.value = ''; state.busy = false; status(); }
});
document.addEventListener('focusin', (event) => {
  const node = event.target;
  if (node.dataset.path?.endsWith('.heightU') || node.dataset.path?.endsWith('.capacityU')) node.dataset.previous = String(get(node.dataset.path));
});
document.addEventListener('input', (event) => {
  if (state.busy) return;
  const node = event.target;
  if (!node.dataset.path) return;
  set(node.dataset.path, node.dataset.lines ? node.value.split('\n').map((value) => value.trim()).filter(Boolean) : node.type === 'checkbox' ? node.checked : node.type === 'number' ? Number(node.value) : node.value);
  status();
});
document.addEventListener('change', (event) => {
  if (state.busy) return;
  const node = event.target;
  if (node.dataset.path) {
    if (node.dataset.path.endsWith('.heightU') || node.dataset.path.endsWith('.capacityU')) {
      try { validatePortfolio(state.config); } catch (error) { set(node.dataset.path, Number(node.dataset.previous)); node.value = node.dataset.previous; report(error); }
    }
    renderArrangement(); status();
  }
  if (node.dataset.projectId !== undefined) {
    const index = Number(node.dataset.projectId); const oldId = state.config.projects[index].id;
    if (!change(() => { state.config.projects[index].id = node.value; for (const item of state.config.projects) for (const module of item.modules) if (module.projectId === oldId) module.projectId = node.value; }, { validate: true })) node.value = state.config.projects[index].id;
  }
  if (node.dataset.rackId !== undefined) {
    const index = Number(node.dataset.rackId); const oldId = state.config.racks[index].id;
    change(() => { state.config.racks[index].id = node.value; state.config.projects.forEach((item) => { if (item.rackUnit.placement?.rackId === oldId) item.rackUnit.placement.rackId = node.value; }); }, { validate: true });
  }
  if (node.dataset.moduleTheme) change(() => { const page = get(`${node.dataset.moduleTheme}.page`); if (node.checked) page.theme = clone(project().page.theme); else delete page.theme; });
  if (node.id === 'asset-file') upload(node.files[0]);
});
document.addEventListener('click', (event) => {
  const node = event.target.closest('button'); if (!node) return;
  if (node.dataset.close) { $(`#${node.dataset.close}`).close(); return; }
  if (state.busy) return;
  if (node.dataset.project) { choose(node.dataset.project); return; }
  if (node.dataset.previewModule) { previewPage(node.dataset.previewModule); return; }
  if (node.dataset.tab) { state.tab = node.dataset.tab; renderEditor(); return; }
  if (node.dataset.editRack !== undefined) { state.tab = 'racks'; renderEditor(); $(`#rack-editor-${node.dataset.editRack}`)?.scrollIntoView({ block: 'nearest' }); return; }
  if (node.dataset.rack) { place(node.dataset.rack, node.dataset.u); return; }
  if (node.dataset.restore) { action('restore', Number(node.dataset.restore)); return; }
  if (node.dataset.op) {
    const list = get(node.dataset.array); const index = Number(node.dataset.index);
    if (node.dataset.op === 'remove' && !confirm(`Remove this ${node.dataset.array === 'racks' ? 'rack and unplace its equipment' : 'item'} from the draft?`)) return;
    change(() => { if (node.dataset.op === 'remove') { if (node.dataset.array === 'racks') state.config.projects.forEach((item) => { if (item.rackUnit.placement?.rackId === list[index].id) item.rackUnit.placement = null; }); list.splice(index, 1); } else { const next = index + (node.dataset.op === 'up' ? -1 : 1); [list[index], list[next]] = [list[next], list[index]]; } }); return;
  }
  if (node.dataset.add) { const kind = node.dataset.add; change(() => get(node.dataset.array).push(kind === 'fact' ? { label: 'New fact', value: '' } : kind === 'module' ? { projectId: '', id: uid('module'), group: '', title: 'New module', description: '', sourceUrl: '', facts: [], stack: [], page: { sections: [] } } : kind === 'image' ? { url: '', alt: '', caption: '' } : { label: 'New link', url: '' })); return; }
  const command = node.dataset.action; const item = project();
  if (command === 'place') place($('#placement-rack').value, $('#placement-u').value);
  if (command === 'unplace') change(() => { item.rackUnit.placement = null; });
  if (command === 'move-up' || command === 'move-down') { const p = item.rackUnit.placement; place(p.rackId, p.startU + (command === 'move-up' ? 1 : -1)); }
  if (command === 'preview-page') previewPage();
  if (command === 'new-rack') addRack();
  if (command === 'add-section') {
    const type = node.previousElementSibling.value;
    change(() => get(node.dataset.sections).push({ id: uid('section'), type, ...(type === 'image' ? { url: '', alt: '', caption: '' } : { title: '', ...(type === 'text' ? { body: '' } : type === 'code' ? { language: '', code: '' } : type === 'gallery' ? { images: [] } : { links: [] }) }) }));
  }
  if (command === 'delete-project' && confirm(`Delete ${item.title} from this draft?`)) change(() => { state.config.projects.splice(state.selected, 1); for (const project of state.config.projects) project.modules = project.modules.filter(module => module.projectId !== item.id); state.selected = Math.min(state.selected, state.config.projects.length - 1); });
  if (command === 'project-up' || command === 'project-down') change(() => { const next = state.selected + (command === 'project-up' ? -1 : 1); const list = state.config.projects; [list[state.selected], list[next]] = [list[next], list[state.selected]]; state.selected = next; });
});
document.addEventListener('dragstart', (event) => { const node = event.target.closest('[data-project]'); if (!node) return; state.dragged = node.dataset.project; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', state.dragged); });
document.addEventListener('dragover', (event) => { const node = event.target.closest('[data-rack][data-u]'); if (!node || !state.dragged) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; node.classList.add('drop-target'); });
document.addEventListener('dragleave', (event) => event.target.closest('.drop-target')?.classList.remove('drop-target'));
document.addEventListener('drop', (event) => { const node = event.target.closest('[data-rack][data-u]'); if (!node || !state.dragged) return; event.preventDefault(); const id = state.dragged; state.dragged = null; place(node.dataset.rack, node.dataset.u, id); });
document.addEventListener('dragend', () => { state.dragged = null; document.querySelectorAll('.drop-target').forEach((node) => node.classList.remove('drop-target')); });
window.addEventListener('beforeunload', (event) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 's' && state.config) { event.preventDefault(); if (!state.local) save(); else notice('Local preview cannot save. Export JSON to keep your draft.'); } });
async function start() {
  try {
    const data = await api('/api/admin'); state.capabilities = data.capabilities || {}; accept(data); $('#gate').hidden = true; $('#workspace').hidden = false; $('#sign-out').hidden = false;
  } catch (error) {
    const unavailable = error.status === 503 || !error.status || error.status === 404;
    $('#gate-message').textContent = unavailable ? 'The private editor needs GitHub owner authentication and database setup before it can save drafts. You can review the full editor in local preview.' : error.status === 403 ? 'This GitHub account is not allowed to edit the portfolio. Sign in with the configured owner account.' : 'Sign in with the configured GitHub owner account to edit and publish the portfolio.';
    $('#sign-in').hidden = unavailable; $('#local-preview').hidden = false;
  }
}
start();
