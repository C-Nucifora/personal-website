import { units } from './catalog.js';

const projectId = new URLSearchParams(window.location.search).get('project');
const unit = units.find((item) => item.id === projectId);
const fallback = document.querySelector('#project-fallback');

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

if (unit) {
  document.title = `${unit.title} / Christian Nucifora`;
  document.querySelector('meta[name="description"]').content = unit.summary;
  document.querySelector('#project-category').textContent = unit.subtitle;
  document.querySelector('#project-title').textContent = unit.title;
  document.querySelector('#project-summary').textContent = unit.summary;
  document.querySelector('#project-description').textContent = unit.description;
  const source = document.querySelector('#project-source');
  source.href = unit.sourceUrl;
  if (unit.id === 'small-utilities') source.firstChild.textContent = 'GitHub profile ';
  if (unit.id === 'm1-toolchain') source.firstChild.textContent = 'Toolchain on GitHub ';
  for (const link of document.querySelectorAll('[data-rack-link]')) {
    link.href = `./index.html#${encodeURIComponent(unit.id)}`;
  }
  for (const technology of unit.stack) {
    document.querySelector('#project-stack').append(element('li', technology));
  }
  for (const fact of unit.facts) {
    const row = element('div');
    row.append(element('dt', fact.label), element('dd', fact.value));
    document.querySelector('#project-facts').append(row);
  }
  if (unit.modules?.length) {
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
        link.href = module.sourceUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        const arrow = element('span', '↗', 'module-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        link.append(
          element('strong', module.title),
          element('span', module.description, 'module-description'),
          arrow,
        );
        item.append(link);
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
    : 'Software projects by Christian Nucifora.';
  fallback.querySelector('.document-copy').textContent = 'Choose a project below, or return to the rack.';
  const list = element('ul', '', 'project-choice-list');
  for (const item of units) {
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
