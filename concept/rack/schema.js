export const RACK_TYPES = ['network', 'router', 'instrument', 'control', 'archive', 'utility', 'compute', 'audio', 'display', 'console', 'appliance', 'storage', 'engineering', 'record'];
export const DEFAULT_SETTINGS = {
  intro: { name: 'Christian Nucifora', role: 'Engineering and software.', bio: "I'm studying engineering and computer science at UQ, contributing to perception and electrical systems with UQ Racing, and building software alongside that." },
  socialLinks: [{ label: 'GitHub', url: 'https://github.com/C-Nucifora' }, { label: 'LinkedIn', url: 'https://www.linkedin.com/in/christian-nucifora-501432387/' }, { label: 'Email', url: 'mailto:cgnucifora@proton.me' }],
  appearance: { background: '#121212', floorColor: '#77777a', rackColor: '#37383a', accent: '#e79b70', exposure: 1, environmentIntensity: 1, shadows: true, reducedMotion: false, materialRoughness: 0.5, materialMetalness: 1 },
};
export const DEFAULT_THEME = { background: '#121212', text: '#efeeea', accent: '#e79b70', font: 'sans', layout: 'standard' };

export class SchemaError extends Error {
  constructor(issues) { super(issues.join('; ')); this.name = 'SchemaError'; this.issues = issues; }
}

// Return a fresh object containing only the supported, validated fields.
export function validatePortfolio(input) {
  const issues = [];
  const fail = (path, message) => issues.push(`${path}: ${message}`);
  const object = (value, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) { fail(path, 'expected an object'); return {}; }
    return value;
  };
  const keys = (value, allowed, path) => {
    const item = object(value, path);
    for (const key of Object.keys(item)) if (!allowed.includes(key)) fail(`${path}.${key}`, 'unknown field');
    return item;
  };
  const text = (value, path, max = 500, required = false) => {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) { fail(path, `expected text up to ${max} characters`); return ''; }
    if (required && !value.trim()) fail(path, 'cannot be blank');
    return value;
  };
  const id = (value, path) => {
    const result = text(value, path, 80, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) fail(path, 'use lowercase letters, numbers and hyphens');
    return result;
  };
  const moduleId = (value, path) => { const result = text(value, path, 80, true); if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(result)) fail(path, 'invalid module id'); return result; };
  const integer = (value, path, min, max) => { if (!Number.isInteger(value) || value < min || value > max) { fail(path, `expected an integer ${min} to ${max}`); return min; } return value; };
  const number = (value, path, min, max) => { if (!Number.isFinite(value) || value < min || value > max) fail(path, `expected a number ${min} to ${max}`); return value; };
  const boolean = (value, path, fallback = false) => { if (value === undefined) return fallback; if (typeof value !== 'boolean') fail(path, 'expected true or false'); return value; };
  const choice = (value, values, path, fallback) => { const result = value ?? fallback; if (!values.includes(result)) fail(path, `expected ${values.join(', ')}`); return result; };
  const color = (value, path, fallback) => { const result = value ?? fallback; if (typeof result !== 'string' || !/^#[0-9a-f]{6}$/i.test(result)) fail(path, 'expected a six-digit hex color'); return result; };
  const array = (value, path, max = 100) => { if (!Array.isArray(value) || value.length > max) { fail(path, `expected a list of at most ${max} items`); return []; } return value; };
  const url = (value, path, image = false) => {
    const result = text(value, path, 2048);
    if (!result) return result;
    if (image && /^\/(?!\/)[a-zA-Z0-9/_%.~!$&'()*+,;=:@-]+$/.test(result) && !result.includes('..')) return result;
    try { const parsed = new URL(result); if (!['https:', ...(image ? [] : ['mailto:'])].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); }
    catch { fail(path, image ? 'expected an HTTPS image URL or absolute local asset path' : 'expected an HTTPS or mailto URL'); }
    return result;
  };
  const unique = (items, path) => { const seen = new Set(); for (const item of items) { if (seen.has(item.id)) fail(path, `duplicate id ${item.id}`); seen.add(item.id); } };
  const links = (value, path) => array(value ?? [], path, 30).map((item, index) => { const p = `${path}[${index}]`; const v = keys(item, ['label', 'url'], p); return { label: text(v.label, `${p}.label`, 120, true), url: url(v.url, `${p}.url`) }; });
  const image = (value, path) => { const v = keys(value, ['url', 'alt', 'caption'], path); const result = { url: url(v.url, `${path}.url`, true), alt: text(v.alt, `${path}.alt`, 500), caption: text(v.caption, `${path}.caption`, 1000) }; if (!result.url) fail(`${path}.url`, 'required'); return result; };
  const section = (value, path) => {
    const v = object(value, path);
    const common = { id: id(v.id, `${path}.id`), type: choice(v.type, ['text', 'image', 'gallery', 'code', 'links'], `${path}.type`) };
    if (v.type === 'image') { keys(v, ['id', 'type', 'url', 'alt', 'caption'], path); return { ...common, ...image({ url: v.url, alt: v.alt, caption: v.caption }, path) }; }
    const title = text(v.title, `${path}.title`, 200);
    if (v.type === 'text') { keys(v, ['id', 'type', 'title', 'body'], path); return { ...common, title, body: text(v.body, `${path}.body`, 30000) }; }
    if (v.type === 'code') { keys(v, ['id', 'type', 'title', 'language', 'code'], path); return { ...common, title, language: text(v.language, `${path}.language`, 40), code: text(v.code, `${path}.code`, 40000) }; }
    if (v.type === 'gallery') { keys(v, ['id', 'type', 'title', 'images'], path); return { ...common, title, images: array(v.images, `${path}.images`, 30).map((item, i) => image(item, `${path}.images[${i}]`)) }; }
    keys(v, ['id', 'type', 'title', 'links'], path); return { ...common, title, links: links(v.links, `${path}.links`) };
  };
  const root = keys(input, ['schemaVersion', 'settings', 'racks', 'projects'], 'config');
  if (root.schemaVersion !== 1) fail('schemaVersion', 'expected 1');
  const settings = keys(root.settings ?? {}, ['intro', 'socialLinks', 'appearance'], 'settings');
  const intro = keys(settings.intro ?? DEFAULT_SETTINGS.intro, ['name', 'role', 'bio'], 'settings.intro');
  const appearance = keys(settings.appearance ?? {}, Object.keys(DEFAULT_SETTINGS.appearance), 'settings.appearance');
  const result = { schemaVersion: 1, settings: { intro: { name: text(intro.name, 'settings.intro.name', 160, true), role: text(intro.role, 'settings.intro.role', 300), bio: text(intro.bio, 'settings.intro.bio', 5000) }, socialLinks: links(settings.socialLinks ?? DEFAULT_SETTINGS.socialLinks, 'settings.socialLinks'), appearance: {} }, racks: [], projects: [] };
  for (const key of ['background', 'floorColor', 'rackColor', 'accent']) result.settings.appearance[key] = color(appearance[key], `settings.appearance.${key}`, DEFAULT_SETTINGS.appearance[key]);
  for (const [key, max] of [['exposure', 3], ['environmentIntensity', 3], ['materialRoughness', 1], ['materialMetalness', 1]]) result.settings.appearance[key] = number(appearance[key] ?? DEFAULT_SETTINGS.appearance[key], `settings.appearance.${key}`, 0, max);
  for (const key of ['shadows', 'reducedMotion']) result.settings.appearance[key] = boolean(appearance[key], `settings.appearance.${key}`, DEFAULT_SETTINGS.appearance[key]);
  result.racks = array(root.racks, 'racks', 7).map((item, i) => { const p = `racks[${i}]`; const v = keys(item, ['id', 'label', 'title', 'description', 'capacityU'], p); return { id: id(v.id, `${p}.id`), label: text(v.label, `${p}.label`, 80, true), title: text(v.title, `${p}.title`, 200, true), description: text(v.description, `${p}.description`, 2000), capacityU: integer(v.capacityU, `${p}.capacityU`, 1, 48) }; });
  unique(result.racks, 'racks');
  result.projects = array(root.projects, 'projects', 300).map((item, i) => {
    const p = `projects[${i}]`; const v = keys(item, ['id', 'title', 'subtitle', 'summary', 'description', 'sourceUrl', 'sourceLabel', 'stack', 'facts', 'modules', 'placeholder', 'published', 'rackUnit', 'page'], p);
    const unit = keys(v.rackUnit, ['heightU', 'type', 'faceTitle', 'placement'], `${p}.rackUnit`);
    let placement = null;
    if (unit.placement !== null && unit.placement !== undefined) { const place = keys(unit.placement, ['rackId', 'startU'], `${p}.rackUnit.placement`); placement = { rackId: id(place.rackId, `${p}.rackUnit.placement.rackId`), startU: integer(place.startU, `${p}.rackUnit.placement.startU`, 1, 48) }; }
    const page = keys(v.page ?? {}, ['theme', 'sections'], `${p}.page`); const theme = keys(page.theme ?? {}, Object.keys(DEFAULT_THEME), `${p}.page.theme`);
    const sections = array(page.sections ?? [], `${p}.page.sections`, 80).map((s, n) => section(s, `${p}.page.sections[${n}]`)); unique(sections, `${p}.page.sections`);
    const modules = array(v.modules ?? [], `${p}.modules`, 100).map((item, n) => { const mp = `${p}.modules[${n}]`; const m = keys(item, ['id', 'group', 'title', 'description', 'sourceUrl', 'projectId'], mp); return { ...(m.projectId !== undefined && m.projectId !== '' ? { projectId: id(m.projectId, `${mp}.projectId`) } : {}), id: moduleId(m.id, `${mp}.id`), group: text(m.group, `${mp}.group`, 120), title: text(m.title, `${mp}.title`, 200, true), description: text(m.description, `${mp}.description`, 5000), sourceUrl: url(m.sourceUrl, `${mp}.sourceUrl`) }; }); unique(modules, `${p}.modules`);
    return { id: id(v.id, `${p}.id`), title: text(v.title, `${p}.title`, 200, true), subtitle: text(v.subtitle, `${p}.subtitle`, 300), summary: text(v.summary, `${p}.summary`, 2000), description: text(v.description, `${p}.description`, 30000), sourceUrl: url(v.sourceUrl, `${p}.sourceUrl`), sourceLabel: text(v.sourceLabel, `${p}.sourceLabel`, 120), stack: array(v.stack ?? [], `${p}.stack`, 50).map((s, n) => text(s, `${p}.stack[${n}]`, 120, true)), facts: array(v.facts ?? [], `${p}.facts`, 50).map((f, n) => { const fp = `${p}.facts[${n}]`; const fact = keys(f, ['label', 'value'], fp); return { label: text(fact.label, `${fp}.label`, 120, true), value: text(fact.value, `${fp}.value`, 2000) }; }), modules, placeholder: boolean(v.placeholder, `${p}.placeholder`), published: boolean(v.published, `${p}.published`), rackUnit: { heightU: integer(unit.heightU, `${p}.rackUnit.heightU`, 1, 48), type: choice(unit.type, RACK_TYPES, `${p}.rackUnit.type`), faceTitle: text(unit.faceTitle, `${p}.rackUnit.faceTitle`, 120), placement }, page: { theme: { background: color(theme.background, `${p}.page.theme.background`, DEFAULT_THEME.background), text: color(theme.text, `${p}.page.theme.text`, DEFAULT_THEME.text), accent: color(theme.accent, `${p}.page.theme.accent`, DEFAULT_THEME.accent), font: choice(theme.font, ['sans', 'serif', 'mono'], `${p}.page.theme.font`, DEFAULT_THEME.font), layout: choice(theme.layout, ['standard', 'wide', 'editorial'], `${p}.page.theme.layout`, DEFAULT_THEME.layout) }, sections } };
  });
  unique(result.projects, 'projects');
  for (const project of result.projects) for (const module of project.modules) {
    if (module.projectId && (module.projectId === project.id || !result.projects.some(item => item.id === module.projectId))) fail(project.id, `module ${module.id} must link to another existing project`);
  }
  const occupied = new Map();
  for (const project of result.projects) {
    const unit = project.rackUnit; if (!unit.placement) continue;
    const rack = result.racks.find(r => r.id === unit.placement.rackId);
    if (!rack) { fail(project.id, 'placement refers to a missing rack'); continue; }
    const end = unit.placement.startU + unit.heightU - 1;
    if (end > rack.capacityU) fail(project.id, 'rack unit exceeds rack capacity');
    for (let u = unit.placement.startU; u <= end && u <= 48; u++) { const key = `${rack.id}:${u}`; if (occupied.has(key)) fail(project.id, `overlaps ${occupied.get(key)} at ${rack.id} U${u}`); occupied.set(key, project.id); }
  }
  if (issues.length) throw new SchemaError(issues.slice(0, 100));
  return result;
}

export function publicPortfolio(config) {
  const result = validatePortfolio(config);
  result.projects = result.projects.filter(project => project.published);
  const visibleIds = new Set(result.projects.map(project => project.id));
  for (const project of result.projects) project.modules = project.modules.filter(module => !module.projectId || visibleIds.has(module.projectId));
  return result;
}
