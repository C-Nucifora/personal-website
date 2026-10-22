import { collections, unplacedSoftwareUnits } from './bundled-collections.js?v=20261022-reader-polish-v2';
import { DEFAULT_SETTINGS, DEFAULT_THEME, validatePortfolio } from './schema.js?v=20261022-reader-polish-v2';

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
  for (const { u, type, faceTitle, ...project } of unplacedSoftwareUnits) {
    projects.push({ ...project, published: true, rackUnit: { heightU: u, type, faceTitle: faceTitle ?? project.title, placement: null }, page: { theme: { ...DEFAULT_THEME }, sections: [] } });
  }
  return validatePortfolio({ schemaVersion: 1, settings: structuredClone(DEFAULT_SETTINGS), racks, projects });
}
