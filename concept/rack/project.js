import { collections, allUnits } from './collections.js?v=20261018-mechanics-v2';
import { projectArt } from './project-art.js?v=20261018-mechanics-v2';

const projectId = new URLSearchParams(window.location.search).get('project');
const unit = allUnits.find((item) => item.id === projectId);
const collection = collections.find(item => item.units.includes(unit));
const moduleId = new URLSearchParams(window.location.search).get('module');
const module = unit?.id === 'm1-toolchain' ? unit.modules.find(item => item.id === moduleId) : null;
const fallback = document.querySelector('#project-fallback');

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

if (unit) {
  document.title = `${module?.title ?? unit.title} / Christian Nucifora`;
  document.querySelector('meta[name="description"]').content = module?.description ?? unit.summary;
  document.querySelector('#project-category').textContent = module ? `M1 Toolchain / ${module.group}` : unit.subtitle;
  document.querySelector('#project-title').textContent = module?.title ?? unit.title;
  document.querySelector('#project-summary').textContent = module?.description ?? unit.summary;
  document.querySelector('#project-description').textContent = unit.description;
  if (module) {
    document.querySelector('#overview-title').textContent = 'Part of the M1 Toolchain';
    const parentLink = element('a', 'Read about the full toolchain →', 'document-source');
    parentLink.href = './project.html?project=m1-toolchain';
    document.querySelector('.document-overview').append(parentLink);
  }
  const source = document.querySelector('#project-source');
  if (module?.sourceUrl || unit.sourceUrl) source.href = module?.sourceUrl ?? unit.sourceUrl;
  else source.hidden = true;
  if (unit.sourceLabel) source.firstChild.textContent = `${unit.sourceLabel} `;
  if (unit.id === 'small-utilities') source.firstChild.textContent = 'GitHub profile ';
  if (unit.id === 'm1-toolchain') source.firstChild.textContent = module ? 'Source on GitHub ' : 'Toolchain on GitHub ';
  for (const link of document.querySelectorAll('[data-rack-link]')) {
    link.href = `./index.html?rack=${collection.id}#${encodeURIComponent(unit.id)}`;
    link.lastChild.textContent = module ? ' M1 Toolchain rack unit' : ` ${collection.label} rack`;
  }
  const referrer = document.referrer ? new URL(document.referrer) : null;
  if (referrer?.origin === location.origin && ['/', '/index.html'].includes(referrer.pathname) && history.length > 1) {
    for (const link of document.querySelectorAll('[data-rack-link]')) {
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        history.back();
      });
    }
  }
  document.querySelector('#project-placeholder').hidden = !unit.placeholder;
  const article = document.querySelector('#project-article');
  const artwork = projectArt(unit, module);
  article.dataset.theme = artwork?.name ?? (unit.placeholder ? 'reserved' : 'record');
  if (artwork) {
    document.querySelector('#project-art-object').innerHTML = artwork.markup;
    document.querySelector('#project-art-caption').textContent = artwork.caption;
    document.querySelector('#project-art').hidden = false;
  }
  if (unit.placeholder) document.querySelector('#overview-title').textContent = 'Reserved project record';
  else if (collection.id === 'experience') document.querySelector('#overview-title').textContent = 'Record';
  else if (collection.id === 'hardware') document.querySelector('#overview-title').textContent = 'Team contribution';
  const stack = module ? [] : unit.stack;
  if (!stack.length) {
    document.querySelector('#project-stack-title').hidden = true;
    document.querySelector('#project-stack').hidden = true;
  }
  document.querySelector('#project-article').dataset.collection = collection.id;
  for (const technology of stack) {
    document.querySelector('#project-stack').append(element('li', technology));
  }
  const facts = module ? [{ label: 'Bundle', value: 'M1 Toolchain' }, { label: 'Group', value: module.group }] : unit.facts;
  for (const fact of facts) {
    const row = element('div');
    row.append(element('dt', fact.label), element('dd', fact.value));
    document.querySelector('#project-facts').append(row);
  }
  if (unit.modules?.length && !module) {
    const groups = unit.id === 'm1-toolchain'
      ? ['Language tools', 'Editor integration', 'Project tools']
      : [null];
    for (const group of groups) {
      const section = element('section', '', 'document-module-group');
      if (group) section.append(element('h3', group));
      const list = element('ul', '', 'document-module-list');
      for (const module of unit.modules.filter((item) => !group || item.group === group)) {
        const item = element('li');
        const link = element('a', '', 'document-module-link');
        const localModule = unit.id === 'm1-toolchain';
        if (localModule) {
          item.className = 'document-module-item';
          link.href = `./project.html?project=m1-toolchain&module=${encodeURIComponent(module.id)}`;
        } else {
          link.href = module.sourceUrl;
          link.target = '_blank';
          link.rel = 'noreferrer';
        }
        const arrow = element('span', localModule ? '→' : '↗', 'module-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        link.append(
          element('strong', module.title),
          element('span', module.description, 'module-description'),
          arrow,
        );
        item.append(link);
        if (localModule) {
          const sourceLink = element('a', 'GitHub ↗', 'document-module-source');
          sourceLink.href = module.sourceUrl;
          sourceLink.target = '_blank';
          sourceLink.rel = 'noreferrer';
          sourceLink.setAttribute('aria-label', `${module.title} source on GitHub`);
          item.append(sourceLink);
        }
        list.append(item);
      }
      section.append(list);
      document.querySelector('#module-groups').append(section);
    }
    document.querySelector('#modules-title').textContent = unit.id === 'm1-toolchain' ? 'Included tools' : 'Repositories';
    document.querySelector('#project-modules').hidden = false;
  }
  document.querySelector('#project-article').hidden = false;
  fallback.hidden = true;
} else {
  document.title = `${projectId ? 'Project not found' : 'Projects'} / Christian Nucifora`;
  fallback.querySelector('h1').textContent = projectId ? 'Project not found' : 'Projects';
  fallback.querySelector('.document-summary').textContent = projectId
    ? 'That project link is not in this rack.'
    : 'Software, hardware and experience by Christian Nucifora.';
  fallback.querySelector('.document-copy').textContent = 'Choose a record below, or return to the datacenter.';
  const list = element('ul', '', 'project-choice-list');
  for (const item of allUnits) {
    const row = element('li');
    const link = element('a', item.title);
    link.href = `./project.html?project=${encodeURIComponent(item.id)}`;
    const arrow = element('span', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
    row.append(link);
    list.append(row);
  }
  fallback.append(list);
}
