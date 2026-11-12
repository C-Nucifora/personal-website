export function hasModuleCarriers(unit) {
  if (unit?.id === 'personal-projects') return unit.type === 'storage' && unit.u === 4 && unit.modules?.length > 0 && unit.modules.length <= 8 && unit.modules.every(module => module.projectId);
  return unit?.id === 'm1-toolchain' && unit.type === 'compute' && unit.u === 6 && (unit.faceTitle || unit.title) === 'M1 Toolchain' && unit.modules?.length === 15 && unit.modules.every(module => ['Language tools', 'Editor integration', 'Project tools'].includes(module.group));
}
