import { portfolio } from './site-data.js';

// All published records retain native routes, including units without a placement.
export const allUnits = portfolio.projects.filter(project => project.published).map(project => ({
  ...project,
  u: project.rackUnit.heightU,
  type: project.rackUnit.type,
  faceTitle: project.rackUnit.faceTitle || project.title,
  startU: project.rackUnit.placement?.startU ?? null,
}));
export const collections = portfolio.racks.map(rack => ({
  ...rack,
  units: allUnits.filter(unit => unit.rackUnit.placement?.rackId === rack.id).sort((a, b) => b.startU - a.startU),
}));
// Keep native navigation usable when no cabinets have been published.
if (!collections.length) collections.push({ id: 'empty', label: 'Work', title: 'Published work', description: 'No racks are currently published.', capacityU: 0, units: [], empty: true });
