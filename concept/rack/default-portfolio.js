import { collections, unplacedSoftwareUnits } from './bundled-collections.js?v=20261023-content-v3';
import { DEFAULT_SETTINGS, DEFAULT_THEME, validatePortfolio } from './schema.js?v=20261023-content-v3';

import { softwareContent } from './software-content.js?v=20261023-content-v3';
import { experienceContent } from './experience-content.js?v=20261023-content-v3';
import { m1Content } from './m1-content.js?v=20261023-content-v3';

function withContent(project) {
  const content = softwareContent[project.id] ?? experienceContent[project.id];
  if (content) {
    if (content.title !== undefined) project.title = content.title;
    if (content.subtitle !== undefined) project.subtitle = content.subtitle;
    if (content.description !== undefined) project.description = content.description;
    if (content.summary !== undefined) project.summary = content.summary;
    if (content.placeholder !== undefined) project.placeholder = content.placeholder;
    project.facts = [...(project.facts ?? []).filter(fact => !(content.facts ?? []).some(item => item.label.toLowerCase() === fact.label.toLowerCase())), ...(content.facts ?? [])];
    project.page.sections = structuredClone(content.sections ?? []);
  }
  project.modules = (project.modules ?? []).map(module => {
    const content = project.id === 'm1-toolchain' ? m1Content[module.id] : null;
    return content ? { ...module, description: content.description ?? module.description, facts: structuredClone(content.facts ?? []), stack: structuredClone(content.stack ?? []), page: { sections: structuredClone(content.sections ?? []) } } : module;
  });
  return project;
}

export function createDefaultPortfolio() {
  const projects = [];
  const racks = collections.map(({ id, label, title, description, units }) => {
    let remaining = 24;
    for (const { u, type, faceTitle, ...project } of units) {
      remaining -= u;
      projects.push(withContent({ ...project, published: true, rackUnit: { heightU: u, type, faceTitle: faceTitle ?? project.title, placement: { rackId: id, startU: remaining + 1 } }, page: { theme: { ...DEFAULT_THEME }, sections: [] } }));
    }
    return { id, label, title, description, capacityU: 24 };
  });
  for (const { u, type, faceTitle, ...project } of unplacedSoftwareUnits) {
    projects.push(withContent({ ...project, published: true, rackUnit: { heightU: u, type, faceTitle: faceTitle ?? project.title, placement: null }, page: { theme: { ...DEFAULT_THEME }, sections: [] } }));
  }
  return validatePortfolio({ schemaVersion: 1, settings: structuredClone(DEFAULT_SETTINGS), racks, projects });
}
