import { collections, allUnits } from './collections.js?v=20261022-round2-v2';
import { siteSettings, usesBundledPortfolio, portfolioError } from './site-data.js?v=20261022-round2-v2';
import { projectArt } from './project-art.js?v=20261022-round2-v2';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// The rack display and direct project route share the same document renderer.
export function renderProject(root, projectId, moduleId = null, data = {}) {
  const units = data.allUnits ?? allUnits;
  const racks = data.collections ?? collections;
  const settings = data.siteSettings ?? siteSettings;
  const bundled = data.usesBundledPortfolio ?? usesBundledPortfolio;
  const loadError = data.portfolioError ?? portfolioError;
  for (const identity of root.querySelectorAll(".identity")) { identity.textContent = settings.intro.name; identity.title = settings.intro.name; }
  const textView = new URLSearchParams(location.search).get("view") === "text" || savedTextView();
  const projectUrl = (id, module = null) => {
    const params = new URLSearchParams({ project: id });
    if (module) params.set("module", module);
    if (textView) params.set("view", "text");
    return `./project.html?${params}`;
  };
  const unit = units.find(item => item.id === projectId);
  const bundle = units.find(item => item.rackUnit.placement && item.modules.some(module => module.projectId === unit?.id));
  const collection = racks.find(item => item.units.includes(unit)) ?? racks.find(item => item.units.includes(bundle));
  const rackUnit = collection?.units.includes(unit) ? unit : bundle;
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
      parentLink.href = projectUrl('m1-toolchain');
      root.querySelector('.document-overview').append(parentLink);
    }
    const source = root.querySelector('#project-source');
    // The summary strip links to the evidence section, which owns public source links.
    source.hidden = true;
    const returnParams = new URLSearchParams();
    if (collection) returnParams.set('rack', collection.id);
    const carrier = module ?? (rackUnit !== unit ? bundle?.modules.find(item => item.projectId === unit.id) : null);
    if (carrier) returnParams.set('module', carrier.id);
    if (textView) returnParams.set('view', 'text');
    for (const link of root.querySelectorAll('[data-rack-link], .identity')) {
      link.href = `./index.html${returnParams.size ? `?${returnParams}` : ''}${collection ? `#${encodeURIComponent(rackUnit?.id ?? unit.id)}` : ''}`;
      if (link.classList.contains('identity')) continue;
      link.lastChild.textContent = module ? ' M1 Toolchain rack unit' : collection ? ` ${collection.label} rack` : ' Work directory';
    }
    root.querySelector('#project-placeholder').hidden = !unit.placeholder;
    const article = root.querySelector('#project-article');
    const artwork = unit.id === 'm1-toolchain' && unit.modules.length !== 15 ? null : projectArt(unit, module);
    article.dataset.theme = artwork?.name ?? (unit.placeholder ? 'reserved' : 'record');
    if (artwork) {
      root.querySelector('#project-art-object').innerHTML = artwork.markup;
      root.querySelector('#project-art-caption').textContent = `FIG. 1 · ${artwork.caption}`;
      root.querySelector('#project-art').hidden = false;
    }
    if (unit.placeholder) root.querySelector('#overview-title').textContent = 'Reserved project record';
    else if (collection?.id === 'experience') root.querySelector('#overview-title').textContent = 'Record';
    else if (collection?.id === 'hardware') root.querySelector('#overview-title').textContent = 'Team contribution';
    const contributionSection = renderRecord(root, unit, module, collection);
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
          const child = module.projectId && units.find(item => item.id === module.projectId);
          if (localModule || child) {
            item.className = 'document-module-item';
            link.href = child ? projectUrl(child.id) : projectUrl('m1-toolchain', module.id);
          } else {
            link.href = module.sourceUrl;
            link.target = '_blank';
            link.rel = 'noreferrer';
          }
          const arrow = element('span', localModule || child ? '→' : '↗', 'module-arrow');
          arrow.setAttribute('aria-hidden', 'true');
          link.append(
            element('strong', module.title),
            element('span', module.description, 'module-description'),
            arrow,
          );
          item.append(link);
          if ((localModule || child) && (child?.sourceUrl || module.sourceUrl)) {
            const sourceUrl = child?.sourceUrl || module.sourceUrl;
            const github = new URL(sourceUrl).hostname === 'github.com';
            const sourceLink = element('a', `${child?.sourceLabel || (github ? 'GitHub' : 'Source')} ↗`, 'document-module-source');
            sourceLink.href = sourceUrl;
            sourceLink.target = '_blank';
            sourceLink.rel = 'noreferrer';
            sourceLink.setAttribute('aria-label', `${module.title} source${github ? ' on GitHub' : ''}`);
            item.append(sourceLink);
          }
          list.append(item);
        }
        section.append(list);
        root.querySelector('#module-groups').append(section);
      }
      root.querySelector('#modules-title').textContent = unit.id === 'm1-toolchain' ? 'Included tools' : unit.modules.some(module => module.projectId) ? 'Included projects' : 'Repositories';
      root.querySelector('#project-modules').hidden = false;
    }
    if (unit.id === 'personal-projects' && !module) renderTrayMap(root, unit, units, projectUrl);
    renderSections(root, (unit.page?.sections ?? []).filter(item => item !== contributionSection), module?.sourceUrl || unit.sourceUrl);
    if (!bundled) applyPageTheme(root, unit.page.theme);
    root.querySelector('#project-article').hidden = false;
    fallback.hidden = true;
  } else {
    fallback.querySelector('h1').textContent = projectId ? 'Project not found' : 'Projects';
    fallback.querySelector('.document-summary').textContent = projectId
      ? 'That project link is not in this rack.'
      : settings.intro.bio || `Work by ${settings.intro.name}.`;
    fallback.querySelector('.document-copy').textContent = loadError || 'Choose a record below, or return to the datacenter.';
    const list = element('ul', '', 'project-choice-list');
    for (const item of units) {
      const row = element('li');
      const link = element('a', item.title);
      link.href = projectUrl(item.id);
      const arrow = element('span', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      link.append(arrow);
      row.append(link);
      list.append(row);
    }
    fallback.append(list);
    if (textView) for (const link of root.querySelectorAll('[data-rack-link], .identity, #project-fallback > a')) link.href = './index.html?view=text';
  }

  return { title: `${module?.title ?? unit?.title ?? (projectId ? "Project not found" : "Projects")} / ${settings.intro.name}`, description: module?.description ?? unit?.summary ?? settings.intro.bio, actionLabel: unit?.type === 'record' && collection?.id === 'experience' ? 'Open record →' : 'Open project →' };
}

function savedTextView() {
  try { return sessionStorage.getItem('rack-view') === 'text'; }
  catch { return false; }
}

function renderRecord(root, unit, module, collection) {
  const fact = (...labels) => unit.facts.find(item => labels.some(label => item.label.toLowerCase() === label))?.value;
  const sections = unit.page?.sections ?? [];
  const contribution = sections.find(item => item.type === 'text' && /^(what i did|my contribution|contribution|team context)$/i.test(item.title));
  const role = fact('role', 'contribution') || (collection?.id === 'experience' ? unit.title : 'Not documented');
  const started = fact('started');
  const completion = fact('expected completion');
  const dates = fact('period', 'dates') || (started ? `${started}${completion ? ` · Expected ${completion}` : ''}` : 'Not documented');
  const status = fact('status') || (unit.placeholder ? 'Placeholder' : module?.id === 'm1-eval' || unit.id === 'wavelength' ? 'Experimental' : unit.id === 'mozaproxy' ? 'Compatibility validation ongoing' : 'Not documented');
  const sourceUrl = module?.sourceUrl || unit.sourceUrl;
  const sourceLabel = unit.sourceLabel || (sourceUrl?.startsWith('https://github.com/') ? 'Source repository' : 'Public source');
  const strip = root.querySelector('#project-record-strip');
  for (const [label, value] of [['Role', role], ['Dates', dates], ['Status', status], ['Evidence', sourceUrl ? sourceLabel : unit.modules.length ? 'Linked records below' : 'Not documented']]) {
    const row = element('div');
    row.append(element('dt', label));
    const detail = element('dd');
    if (label === 'Evidence') {
      const link = element('a', value);
      link.href = '#project-evidence';
      detail.append(link);
    } else detail.textContent = value;
    row.append(detail); strip.append(row);
  }
  const contributionBody = contribution?.body?.trim() || (collection?.id === 'hardware' || collection?.id === 'experience' ? unit.description : '');
  root.querySelector('.document-contribution').hidden = !contributionBody;
  root.querySelector('#project-contribution').textContent = contributionBody;
  if (collection?.id === 'hardware') root.querySelector('#contribution-title').textContent = 'My contribution / team context';
  const hasScreenshots = sections.some(item => item.type === 'image' || item.type === 'gallery');
  const note = root.querySelector('#project-evidence-note');
  note.textContent = hasScreenshots ? 'Project images are included below.' : sourceUrl ? 'The public source is linked below. No project images are attached to this record.' : unit.modules.length ? 'Each included record links to its available source. No project images are attached to this record.' : 'No project images are attached to this record.';
  if (sourceUrl) {
    const item = element('li');
    const link = element('a', `${sourceLabel} ↗`);
    link.href = sourceUrl; link.target = '_blank'; link.rel = 'noreferrer';
    item.append(link); root.querySelector('#project-evidence-links').append(item);
  }
  return contribution;
}

function renderTrayMap(root, unit, units, projectUrl) {
  const container = root.querySelector('#module-groups');
  const overflowItems = [...container.querySelectorAll('.document-module-list > li')].slice(8);
  container.replaceChildren();
  container.classList.add('document-tray-map');
  for (let index = 0; index < 8; index++) {
    const module = unit.modules[index];
    const bay = element('section', '', `document-tray${module ? '' : ' is-spare'}`);
    bay.append(element('p', `BAY ${String(index + 1).padStart(2, '0')}`, 'tray-number'));
    bay.append(element('h3', module?.title ?? 'SPARE'));
    if (module) {
      bay.append(element('p', module.description, 'tray-description'));
      const actions = element('div', '', 'tray-actions');
      const child = units.find(item => item.id === module.projectId);
      if (child) {
        const read = element('a', 'Read →'); read.href = projectUrl(child.id);
        read.setAttribute('aria-label', `Read ${module.title}`); actions.append(read);
      }
      const sourceUrl = child?.sourceUrl || module.sourceUrl;
      if (sourceUrl) {
        const source = element('a', 'Source ↗'); source.href = sourceUrl; source.target = '_blank'; source.rel = 'noreferrer';
        source.setAttribute('aria-label', `${module.title} source`); actions.append(source);
      }
      bay.append(actions);
    } else bay.append(element('p', 'Unassigned bay', 'tray-description'));
    container.append(bay);
  }
  if (overflowItems.length) {
    const overflow = element('section', '', 'document-tray-overflow');
    overflow.append(element('h3', 'Additional projects'));
    const list = element('ul', '', 'document-module-list');
    list.append(...overflowItems); overflow.append(list); container.append(overflow);
  }
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

function renderSections(root, sections, sourceUrl) {
  if (!sections.length) return;
  const content = element('div', '', 'document-sections');
  const linkedSources = new Set(sourceUrl ? [sourceUrl] : []);
  const imageFigure = image => {
    const figure = element('figure', '', 'document-media');
    const img = element('img');
    img.src = image.url; img.alt = image.alt; img.loading = 'lazy'; img.decoding = 'async';
    figure.append(img);
    if (image.caption) figure.append(element('figcaption', image.caption));
    return figure;
  };
  for (const item of sections) {
    const sectionLinks = item.type === 'links' ? item.links.filter(link => {
      if (linkedSources.has(link.url)) return false;
      linkedSources.add(link.url);
      return true;
    }) : null;
    if (sectionLinks && !sectionLinks.length) continue;
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
      for (const itemLink of sectionLinks) {
        const row = element('li');
        const link = element('a', itemLink.label); link.href = itemLink.url;
        if (itemLink.url.startsWith('https:')) { link.target = '_blank'; link.rel = 'noreferrer'; }
        row.append(link); links.append(row);
      }
      section.append(links);
    }
    content.append(section);
  }
  if (content.childElementCount) root.querySelector('.document-footer').before(content);
}
