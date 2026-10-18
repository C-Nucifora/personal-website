import { collections } from './bundled-collections.js';
import { DEFAULT_SETTINGS, DEFAULT_THEME, validatePortfolio } from './schema.js';

export function createDefaultPortfolio() {
  const projects = [];
  const racks = collections.map(({ id, label, title, description, units }) => {
    let remaining = 24;
    for (const { u, type, faceTitle, ...project } of units) {
      remaining -= u;
      projects.push({ ...project, published: true, rackUnit: { heightU: u, type, faceTitle: faceTitle ?? project.title, placement: { rackId: id, startU: remaining + 1 } }, page: { theme: { ...DEFAULT_THEME }, sections: [] } });
    }
    return { id, label, title, description, capacityU: 24 };
  });
  return validatePortfolio({ schemaVersion: 1, settings: structuredClone(DEFAULT_SETTINGS), racks, projects });
}
