import { createDefaultPortfolio } from './default-portfolio.js?v=20261022-round2-v2';
import { DEFAULT_SETTINGS, publicPortfolio } from './schema.js?v=20261022-round2-v2';

async function loadPublished() {
  if (location.protocol === 'file:') return { config: createDefaultPortfolio(), bundled: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('/api/portfolio', { credentials: 'omit', signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (response.status === 404 || (response.status === 503 && body?.configured === false)) {
      return { config: createDefaultPortfolio(), bundled: true };
    }
    if (!response.ok) throw new Error(body?.error || 'Published work could not load. Please try again later.');
    return { config: publicPortfolio(body.config), bundled: false };
  } catch (error) {
    console.warn('Published portfolio unavailable', error.message);
    return { config: { schemaVersion: 1, settings: structuredClone(DEFAULT_SETTINGS), racks: [], projects: [] }, error: 'Published work could not load. Please try again later.', bundled: false };
  } finally {
    clearTimeout(timeout);
  }
}

const loaded = await loadPublished();
export const portfolio = loaded.config;
export const siteSettings = portfolio.settings;
export const portfolioError = loaded.error;
export const usesBundledPortfolio = loaded.bundled;
