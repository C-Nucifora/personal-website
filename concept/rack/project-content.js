import { collections, allUnits } from './collections.js?v=20261018-screen-v1';
import { siteSettings, usesBundledPortfolio, portfolioError } from './site-data.js';
import { applyIdentity } from './public-dom.js';
import { projectArt } from './project-art.js?v=20261018-screen-v1';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// The rack display and direct project route share the same document renderer.
export function renderProject(root, projectId, moduleId = null) {
  applyIdentity(root);
  const unit = allUnits.find(item => item.id === projectId);
  const collection = collections.find(item => item.units.includes(unit));
  const module = unit?.id === 'm1-toolchain' ? unit.modules?.find(item => item.id === moduleId) : null;
  const fallback = root.querySelector('#project-fallback');

  if (unit) {
    root.querySelector('#project-category').textContent = module ? `M1 Toolchain / ${module.group}` : unit.subtitle;
    root.querySelector('#project-title').textContent = module?.title ?? unit.title;
    root.querySelector('#project-summary').textContent = module?.description ?? unit.summary;
    root.querySelector('#project-description').textContent = unit.description;
    if (module) {
      root.querySelector('#overview-title').textContent = 'Part of the M1 Toolchain';
      const parentLink = element('a', 'Read about the full toolchain →', 'document-source');
      parentLink.href = './project.html?project=m1-toolchain';
      root.querySelector('.document-overview').append(parentLink);
    }
    const source = root.querySelector('#project-source');
    if (module?.sourceUrl || unit.sourceUrl) source.href = module?.sourceUrl ?? unit.sourceUrl;
    else source.hidden = true;
    if (unit.sourceLabel) source.firstChild.textContent = `${unit.sourceLabel} `;
    if (!unit.sourceLabel && unit.sourceUrl && !unit.sourceUrl.startsWith('https://github.com/')) source.firstChild.textContent = 'Source ';
    for (const link of root.querySelectorAll('[data-rack-link]')) {
      link.href = collection ? `./index.html?rack=${collection.id}#${encodeURIComponent(unit.id)}` : './index.html';
      link.lastChild.textContent = module ? ' M1 Toolchain rack unit' : collection ? ` ${collection.label} rack` : ' Work directory';
    }
    root.querySelector('#project-placeholder').hidden = !unit.placeholder;
    const article = root.querySelector('#project-article');
    const artwork = unit.id === 'm1-toolchain' && unit.modules.length !== 15 ? null : projectArt(unit, module);
    article.dataset.theme = artwork?.name ?? (unit.placeholder ? 'reserved' : 'record');
    if (artwork) {
      root.querySelector('#project-art-object').innerHTML = artwork.markup;
      root.querySelector('#project-art-caption').textContent = artwork.caption;
      root.querySelector('#project-art').hidden = false;
    }
    if (unit.placeholder) root.querySelector('#overview-title').textContent = 'Reserved project record';
    else if (collection?.id === 'experience') root.querySelector('#overview-title').textContent = 'Record';
    else if (collection?.id === 'hardware') root.querySelector('#overview-title').textContent = 'Team contribution';
    const stack = module ? [] : unit.stack;
    if (!stack.length) {
      root.querySelector('#project-stack-title').hidden = true;
      root.querySelector('#project-stack').hidden = true;
    }
    root.querySelector('#project-article').dataset.collection = collection?.id ?? 'unplaced';
    for (const technology of stack) {
      root.querySelector('#project-stack').append(element('li', technology));
    }
    const facts = module ? [{ label: 'Bundle', value: 'M1 Toolchain' }, { label: 'Group', value: module.group }] : unit.facts;
    for (const fact of facts) {
      const row = element('div');
      row.append(element('dt', fact.label), element('dd', fact.value));
      root.querySelector('#project-facts').append(row);
    }
    if (unit.modules?.length && !module) {
      const groups = unit.id === 'm1-toolchain'
        ? [...new Set(['Language tools', 'Editor integration', 'Project tools', ...unit.modules.map(item => item.group)])].filter(group => unit.modules.some(item => item.group === group))
        : [null];
      for (const group of groups) {
        const section = element('section', '', 'document-module-group');
        if (group) section.append(element('h3', group));
        const list = element('ul', '', 'document-module-list');
        for (const module of unit.modules.filter((item) => group === null || item.group === group)) {
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
        root.querySelector('#module-groups').append(section);
      }
      root.querySelector('#modules-title').textContent = unit.id === 'm1-toolchain' ? 'Included tools' : 'Repositories';
      root.querySelector('#project-modules').hidden = false;
    }
    renderSections(root, unit.page?.sections ?? []);
    if (!usesBundledPortfolio) applyPageTheme(root, unit.page.theme);
    root.querySelector('#project-article').hidden = false;
    fallback.hidden = true;
  } else {
    fallback.querySelector('h1').textContent = projectId ? 'Project not found' : 'Projects';
    fallback.querySelector('.document-summary').textContent = projectId
      ? 'That project link is not in this rack.'
      : siteSettings.intro.bio || `Work by ${siteSettings.intro.name}.`;
    fallback.querySelector('.document-copy').textContent = portfolioError || 'Choose a record below, or return to the datacenter.';
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

  return { title: `${module?.title ?? unit?.title ?? (projectId ? "Project not found" : "Projects")} / ${siteSettings.intro.name}`, description: module?.description ?? unit?.summary ?? siteSettings.intro.bio };
}

function applyPageTheme(root, theme) {
  const host = root.body ?? root;
  host.style.setProperty('--background', theme.background);
  host.style.setProperty('--foreground', theme.text);
  host.style.setProperty('--accent', theme.accent);
  if (theme.background !== '#121212' || theme.text !== '#efeeea') {
    host.style.setProperty('--muted', `color-mix(in srgb, ${theme.text} 80%, ${theme.background})`);
    host.style.setProperty('--subtle', `color-mix(in srgb, ${theme.text} 70%, ${theme.background})`);
    host.style.setProperty('--line', `color-mix(in srgb, ${theme.text} 24%, ${theme.background})`);
  }
  const meta = root.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme.background;
  host.style.background = theme.background;
  host.style.color = theme.text;
  host.style.fontFamily = 'var(--sans)';
  host.style.setProperty('--sans', theme.font === 'serif' ? 'Georgia, serif' : theme.font === 'mono' ? '"IBM Plex Mono", monospace' : '"IBM Plex Sans", sans-serif');
  host.querySelector('.project-document').dataset.layout = theme.layout;
}

function renderSections(root, sections) {
  if (!sections.length) return;
  const content = element('div', '', 'document-sections');
  const imageFigure = image => {
    const figure = element('figure', '', 'document-media');
    const img = element('img');
    img.src = image.url; img.alt = image.alt; img.loading = 'lazy'; img.decoding = 'async';
    figure.append(img);
    if (image.caption) figure.append(element('figcaption', image.caption));
    return figure;
  };
  for (const item of sections) {
    const section = element('section', '', `document-section section-${item.type}`);
    section.id = `section-${item.id}`;
    if (item.title) section.append(element('h2', item.title));
    if (item.type === 'text') section.append(element('p', item.body, 'document-copy section-prose'));
    if (item.type === 'image') section.append(imageFigure(item));
    if (item.type === 'gallery') {
      const gallery = element('div', '', 'document-gallery');
      for (const image of item.images) gallery.append(imageFigure(image));
      section.append(gallery);
    }
    if (item.type === 'code') {
      if (item.language) section.append(element('p', item.language, 'document-category'));
      const pre = element('pre'); pre.append(element('code', item.code)); section.append(pre);
    }
    if (item.type === 'links') {
      const links = element('ul', '', 'project-choice-list');
      for (const itemLink of item.links) {
        const row = element('li');
        const link = element('a', itemLink.label); link.href = itemLink.url;
        if (itemLink.url.startsWith('https:')) { link.target = '_blank'; link.rel = 'noreferrer'; }
        row.append(link); links.append(row);
      }
      section.append(links);
    }
    content.append(section);
  }
  root.querySelector('.document-footer').before(content);
}
