import { renderProject } from './project-content.js?v=20261018-curated-rack-v1';

const params = new URLSearchParams(location.search);
const record = renderProject(document, params.get('project'), params.get('module'));
document.title = record.title;
document.querySelector('meta[name="description"]').content = record.description;
const referrer = document.referrer ? new URL(document.referrer) : null;
if (referrer?.origin === location.origin && /(?:\/|\/index\.html)$/.test(referrer.pathname) && history.length > 1) {
  for (const link of document.querySelectorAll('[data-rack-link]')) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.back();
    });
  }
}
