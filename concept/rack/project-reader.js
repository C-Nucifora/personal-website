import { renderProject } from './project-content.js?v=20261023-content-v2';

// Map the real document onto the four corners of the physical rack display.
export function projectTransform(points, width, height) {
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denominator) < 0.00001) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = (dx1 * dy3 - dx3 * dy1) / denominator;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y;
  return `matrix3d(${a / width},${d / width},0,${g / width},${b / height},${e / height},0,${h / height},0,0,1,0,${p0.x},${p0.y},0,1)`;
}

export function createProjectReader({ onReturn, onNavigate }) {
  const reader = document.createElement('main');
  reader.className = 'project-reader project-page';
  reader.hidden = true;
  reader.inert = true;
  reader.setAttribute('aria-label', 'Project record');
  document.body.append(reader);
  let templatePromise;
  let stylesheetPromise;
  let generation = 0;
  let key = null;
  let metadata = null;
  let corners = null;
  let animation = 0;
  let finishAnimation = null;
  let state = 'hidden';

  function assets() {
    if (!templatePromise) templatePromise = fetch('./project.html').then(response => {
      if (!response.ok) throw new Error('Project document could not load');
      return response.text();
    }).then(html => new DOMParser().parseFromString(html, 'text/html')).catch(error => {
      templatePromise = null;
      throw error;
    });
    if (!stylesheetPromise) stylesheetPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './project.css?v=20261023-content-v2';
      link.onload = resolve;
      link.onerror = () => { link.remove(); stylesheetPromise = null; reject(new Error('Project styles could not load')); };
      document.head.append(link);
    });
    return Promise.all([templatePromise, stylesheetPromise]);
  }
  function dimensions() {
    reader.style.width = `${state === 'preview' ? 640 : window.innerWidth}px`;
    reader.style.height = `${state === 'preview' ? 320 : window.innerHeight}px`;
  }
  function position(points) {
    corners = points;
    dimensions();
    const transform = projectTransform(points, state === 'preview' ? 640 : window.innerWidth, state === 'preview' ? 320 : window.innerHeight);
    if (transform) reader.style.transform = transform;
  }
  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    finishAnimation?.(false);
    finishAnimation = null;
  }
  async function prepare(projectId, moduleId = null) {
    const requestedKey = `${projectId}/${moduleId ?? ''}`;
    const request = ++generation;
    if (key === requestedKey) return metadata;
    const [template] = await assets();
    if (request !== generation) return null;
    const children = [...template.body.children].filter(node => node.tagName !== 'SCRIPT').map(node => {
      const imported = document.importNode(node, true);
      if (imported.tagName !== 'MAIN') return imported;
      const content = document.createElement('div');
      for (const { name, value } of imported.attributes) content.setAttribute(name, value);
      content.append(...imported.childNodes);
      return content;
    });
    reader.replaceChildren(...children);
    reader.scrollTop = 0;
    metadata = renderProject(reader, projectId, moduleId);
    const preview = document.createElement('div');
    preview.className = 'document-display-preview';
    preview.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('p'); heading.className = 'display-title';
    heading.textContent = reader.querySelector('#project-title').textContent || 'Project record';
    const titleLines = heading.textContent.length <= 12 ? 1 : heading.textContent.length <= 24 ? 2 : 3;
    const titleSize = [96, 72, 50][titleLines - 1];
    heading.style.setProperty('--display-title-size', `${titleSize}px`);
    heading.style.setProperty('--display-title-lines', titleLines);
    const summary = document.createElement('p'); summary.className = 'display-summary';
    summary.textContent = reader.querySelector('#project-category').textContent;
    const action = document.createElement('span'); action.className = 'display-open'; action.textContent = metadata.actionLabel;
    preview.append(heading, summary, action); reader.append(preview);
    key = requestedKey;
    dimensions();
    return metadata;
  }
  function preview(points) {
    if (state === 'open' || state === 'expanding') return;
    if (!key || !points) { reader.hidden = true; return; }
    state = 'preview';
    reader.dataset.display = 'preview';
    reader.hidden = false;
    position(points);
  }
  async function open(reducedMotion = false) {
    if (!key) return false;
    stopAnimation();
    const start = corners;
    state = 'expanding';
    reader.dataset.display = 'document';
    if (start) position(start);
    reader.hidden = false;
    reader.classList.add('is-expanding');
    const target = [{ x: 0, y: 0 }, { x: innerWidth, y: 0 }, { x: innerWidth, y: innerHeight }, { x: 0, y: innerHeight }];
    if (!reducedMotion && start) await new Promise(resolve => {
      finishAnimation = resolve;
      const began = performance.now();
      function step(now) {
        const progress = Math.min(1, (now - began) / 380);
        const eased = 1 - (1 - progress) ** 3;
        position(start.map((point, index) => ({ x: point.x + (target[index].x - point.x) * eased, y: point.y + (target[index].y - point.y) * eased })));
        if (progress < 1) animation = requestAnimationFrame(step);
        else { animation = 0; finishAnimation = null; resolve(true); }
      }
      animation = requestAnimationFrame(step);
    });
    if (state !== 'expanding') return false;
    state = 'open';
    reader.classList.remove('is-expanding');
    reader.classList.add('is-open');
    reader.style.transform = 'none';
    dimensions();
    reader.inert = false;
    reader.querySelector('#project-content').focus({ preventScroll: true });
    return true;
  }
  function hide({ invalidate = false } = {}) {
    state = 'hidden';
    stopAnimation();
    reader.hidden = true;
    reader.inert = true;
    reader.classList.remove('is-open', 'is-expanding');
    delete reader.dataset.display;
    corners = null;
    if (invalidate) { generation++; key = null; }
  }
  reader.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    if (link.classList.contains('skip-link')) {
      event.preventDefault();
      reader.querySelector('#project-content').focus({ preventScroll: true });
      reader.querySelector('#project-content').scrollIntoView({ block: 'start' });
    } else if (link.getAttribute('href')?.startsWith('#')) {
      const target = reader.querySelector(`#${CSS.escape(url.hash.slice(1))}`);
      if (target) { event.preventDefault(); target.scrollIntoView({ block: 'start' }); }
    } else if (link.matches('[data-rack-link], .identity')) { event.preventDefault(); onReturn(); }
    else if (url.pathname.endsWith('/project.html')) { event.preventDefault(); onNavigate(url); }
  });
  window.addEventListener('resize', () => { if (state === 'open') dimensions(); });
  return { prepare, preview, open, hide, getState: () => ({ state, key }), contains: target => reader.contains(target) };
}
