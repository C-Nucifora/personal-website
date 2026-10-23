import { renderProject } from './project-content.js?v=20261023-content-v2';

const params = new URLSearchParams(location.search);
const record = renderProject(document, params.get('project'), params.get('module'));
document.title = record.title;
document.querySelector('meta[name="description"]').content = record.description;
const referrer = document.referrer ? new URL(document.referrer) : null;
const returnThroughHistory = referrer?.origin === location.origin && /(?:\/|\/index\.html)$/.test(referrer.pathname) && history.length > 1;
if (returnThroughHistory) {
  for (const link of document.querySelectorAll('[data-rack-link]')) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.back();
    });
  }
}
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.key !== 'Escape' || event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  const link = document.querySelector('[data-rack-link]');
  if (!link) return;
  event.preventDefault();
  if (returnThroughHistory) history.back();
  else location.assign(link.href);
});
