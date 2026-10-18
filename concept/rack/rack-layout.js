export function hasModuleCarriers(unit) {
  return unit?.id === 'm1-toolchain' && unit.type === 'compute' && unit.u === 6 && (unit.faceTitle || unit.title) === 'M1 Toolchain' && unit.modules?.length === 15 && unit.modules.every(module => ['Language tools', 'Editor integration', 'Project tools'].includes(module.group));
}
