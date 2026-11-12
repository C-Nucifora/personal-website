import { allUnits as bundledUnits } from './bundled-collections.js?v=20261023-content-v3';
import { collections, allUnits } from './collections.js?v=20261023-content-v3';
import { siteSettings, portfolioError, usesBundledPortfolio } from './site-data.js?v=20261023-content-v3';

export function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function applyIdentity(root = document) {
  for (const identity of root.querySelectorAll('.identity')) { identity.textContent = siteSettings.intro.name; identity.title = siteSettings.intro.name; }
}

export function buildPublicIndex() {
  applyIdentity();
  document.querySelector('meta[name="description"]').content = siteSettings.intro.bio;
  document.querySelector('meta[name="theme-color"]').content = siteSettings.appearance.background;
  document.documentElement.style.setProperty('--accent', siteSettings.appearance.accent);
  const directory = document.querySelector('.collection-directory');
  document.querySelector('.directory-kicker').textContent = `${siteSettings.intro.name} / Engineering + software`;
  if (!usesBundledPortfolio) {
    document.querySelector('#directory-title').textContent = siteSettings.intro.role || siteSettings.intro.name;
    document.querySelector('.directory-introduction').textContent = siteSettings.intro.bio;
    directory.querySelector('.directory-note').hidden = true;
  }
  if (portfolioError) {
    const notice = element('p', portfolioError, 'directory-note');
    notice.setAttribute('role', 'status');
    directory.querySelector('.collection-list').before(notice);
  }
  const socials = directory.querySelector('.directory-links');
  socials.replaceChildren();
  for (const social of siteSettings.socialLinks) {
    const link = element('a', social.label);
    link.href = social.url;
    if (social.url.startsWith('https:')) { link.target = '_blank'; link.rel = 'noreferrer'; }
    socials.append(link);
  }
  const header = document.querySelector('.header-links');
  header.querySelectorAll('[data-collection-nav]:not([data-collection-nav="hall"])').forEach(node => node.remove());
  const list = directory.querySelector('.collection-list');
  list.replaceChildren();
  const indexRoot = document.querySelector('.project-index');
  indexRoot.querySelectorAll('[data-collection-index]').forEach(node => node.remove());
  const detailRoot = document.querySelector('.project-details');
  const inspector = document.querySelector('#module-inspector');
  inspector.remove();
  detailRoot.querySelectorAll('[data-collection-detail]').forEach(node => node.remove());

  collections.forEach((rack, rackIndex) => {
    if (!rack.empty) {
      const url = `./index.html?rack=${encodeURIComponent(rack.id)}#rack-collection-${rack.id}`;
      const nav = element('a', rack.label);
      nav.href = url;
      nav.dataset.collectionNav = rack.id;
      header.querySelector('#show-help').before(nav);
      const entry = element('a');
      entry.href = url;
      const copy = element('span');
      copy.append(element('strong', rack.label), element('span', rack.description));
      const arrow = element('span', '→'); arrow.setAttribute('aria-hidden', 'true');
      entry.append(element('span', String(rackIndex + 1).padStart(2, '0'), 'collection-number'), copy, arrow);
      list.append(entry);
    }
    const index = element('section');
    index.dataset.collectionIndex = rack.id;
    index.id = `rack-collection-${rack.id}`;
    const heading = element('div', '', 'panel-heading');
    heading.append(element('h2', rack.title), element('span', `${rack.capacityU}U / Manifest`));
    index.append(heading, element('p', rack.description, 'collection-description'));
    const rows = element('nav', '', 'project-list');
    rows.setAttribute('aria-label', rack.title);
    const details = element('section');
    details.dataset.collectionDetail = rack.id;
    details.setAttribute('aria-label', `${rack.label} details`);
    let nextU = rack.capacityU;
    function appendBlankUnits(bottomU) {
      while (nextU >= bottomU) {
        const blank = element('div', '', 'manifest-blank');
        blank.append(element('span', `U${String(nextU).padStart(2, '0')}`, 'bay-number'), element('span', 'Blank panel'));
        rows.append(blank);
        nextU--;
      }
    }
    rack.units.forEach((unit, unitIndex) => {
      const topU = unit.startU + unit.u - 1;
      appendBlankUnits(topU + 1);
      const row = element('a', '', `project-row${unit.modules.length ? ' is-bundle' : ''}`);
      row.href = `#${unit.id}`;
      row.dataset.project = String(unitIndex);
      row.style.setProperty('--unit-span', unit.u);
      row.setAttribute('aria-label', `${unit.title}, U${String(topU).padStart(2, '0')} to U${String(unit.startU).padStart(2, '0')}, ${unit.u} rack units`);
      const copy = element('span', '', 'row-copy');
      copy.append(element('strong', unit.title), element('span', `${unit.subtitle}${unit.placeholder ? ' · Placeholder' : ''}`));
      const position = element('span', '', 'bay-number');
      position.append(element('span', `U${String(topU).padStart(2, '0')}`));
      if (unit.u > 1) position.append(element('span', `U${String(unit.startU).padStart(2, '0')}`));
      row.append(position, copy, element('span', `${unit.u}U`, 'row-size'));
      rows.append(row);
      nextU = unit.startU - 1;
      const article = element('article');
      article.id = bundledUnits.some(item => item.id === unit.id) ? unit.id : `rack-project-${unit.id}`;
      article.dataset.projectId = unit.id;
      article.dataset.detail = String(unitIndex);
      const title = element('h2', unit.title); title.tabIndex = -1;
      article.append(element('p', unit.subtitle, 'project-category'), title);
      if (unit.placeholder) article.append(element('p', 'Placeholder · Details to come', 'placeholder-note'));
      article.append(element('p', unit.summary, 'project-summary'));
      const actions = element('div', '', 'project-actions');
      const page = element('a', unit.type === 'record' && rack.id === 'experience' ? 'Open record →' : 'Open project page →', 'project-page-link');
      page.href = `./project.html?project=${encodeURIComponent(unit.id)}`;
      actions.append(page);
      if (unit.sourceUrl) {
        const source = element('a', `${unit.sourceLabel || 'Source'} ↗`, 'source-link');
        source.href = unit.sourceUrl; source.target = '_blank'; source.rel = 'noreferrer';
        actions.append(source);
      }
      article.append(actions, element('p', unit.description, 'project-description'));
      if (unit.stack.length) { const stack = element('div', '', 'project-stack'); for (const item of unit.stack) stack.append(element('span', item)); article.append(stack); }
      const facts = element('dl', '', 'project-facts');
      for (const fact of unit.facts) { const factRow = element('div'); factRow.append(element('dt', fact.label), element('dd', fact.value)); facts.append(factRow); }
      article.append(facts);
      if (unit.id === 'm1-toolchain') article.append(inspector);
      if (unit.modules.length) {
        const modules = element('section', '', 'bundle-modules');
        modules.setAttribute('aria-label', 'Included projects');
        modules.append(element('h3', unit.id === 'm1-toolchain' ? 'Included tools' : unit.modules.some(tool => tool.projectId) ? 'Included projects' : 'Repositories'));
        const groups = unit.id === 'm1-toolchain' ? [...new Set(['Language tools', 'Editor integration', 'Project tools', ...unit.modules.map(tool => tool.group)])].filter(group => unit.modules.some(tool => tool.group === group)) : [null];
        for (const group of groups) {
          let target = modules;
          if (group) {
            target = element('details', '', 'module-group'); target.open = true;
            const summary = element('summary');
            summary.append(element('span', group), element('span', String(unit.modules.filter(tool => tool.group === group).length), 'module-count'));
            target.append(summary); modules.append(target);
          }
          for (const tool of unit.modules.filter(tool => group === null || tool.group === group)) {
            const row = element('div', '', 'module-record');
            const link = element('a', '', 'module-link');
            link.dataset.moduleId = tool.id;
            link.href = tool.projectId ? `./project.html?project=${encodeURIComponent(tool.projectId)}` : `./project.html?project=${encodeURIComponent(unit.id)}&module=${encodeURIComponent(tool.id)}`;
            link.append(element('strong', tool.title), element('span', tool.description), element('i', 'Read →'));
            row.append(link);
            if (tool.sourceUrl) {
              const source = element('a', 'Source ↗', 'module-source');
              source.href = tool.sourceUrl; source.target = '_blank'; source.rel = 'noreferrer';
              source.setAttribute('aria-label', `Source for ${tool.title}`);
              row.append(source);
            }
            target.append(row);
          }
        }
        article.append(modules);
      }
      details.append(article);
    });
    appendBlankUnits(1);
    if (!rack.units.length) rows.append(element('p', 'No units are placed in this rack.', 'collection-description'));
    index.append(rows);
    indexRoot.append(index);
    detailRoot.querySelector('#next-project').before(details);
  });
  if (!inspector.isConnected) detailRoot.append(inspector);
  const bundledIds = new Set(allUnits.filter(unit => unit.rackUnit.placement).flatMap(unit => unit.modules.filter(module => module.projectId).map(module => module.projectId)));
  const unplaced = allUnits.filter(unit => !unit.rackUnit.placement && !bundledIds.has(unit.id));
  if (unplaced.length) {
    const section = element('section', '', 'unplaced-projects');
    section.append(element('h3', 'More work'));
    const records = element('nav', '', 'unplaced-list');
    records.setAttribute('aria-label', 'Published projects without rack placement');
    for (const unit of unplaced) { const link = element('a', unit.title); link.href = `./project.html?project=${encodeURIComponent(unit.id)}`; records.append(link); }
    section.append(records); directory.append(section);
  }
  document.documentElement.classList.remove('portfolio-loading');
  document.querySelector('#scene-loading').textContent = 'Loading the rack…';
}
