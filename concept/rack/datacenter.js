import * as THREE from './vendor/three.module.js';
import { setFinishUVs } from './finishes.js?v=20261018-admin-materials-v1';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { portfolio, siteSettings, usesBundledPortfolio } from './site-data.js';

export const RACK_SLOTS = portfolio.racks.map((rack, index) => ({ id: rack.id, label: rack.label, position: [(index - Math.floor(portfolio.racks.length / 2)) * 6, 0, 0] }));

// The content racks form the front equipment row. Repeated rows behind it supply depth.
export function createDatacenter({ floorY = -5.42, rackHeight = 10.4, surfaces = null } = {}) {
  const group = new THREE.Group();
  group.name = 'Datacenter equipment rows';
  const parts = new Map();
  const geometries = [];
  const materials = [];
  const textures = [];
  const floorLabels = [];
  const backgroundHeight = Math.max(12.8, rackHeight + 2.4);
  const roofY = floorY + backgroundHeight;
  const ceilingY = roofY + 4;
  const trayY = roofY + 1.25;
  const endZ = -43.2;
  const reservedSlots = RACK_SLOTS.map(({ position: [x, , z] }) => [x, z]);
  const rows = [];
  const cableManagers = [];
  const feet = [];

  function finish(name, color, roughness = 0.8, metalness = 0.1, basic = false, surface = null) {
    const settings = surface ? { ...surfaces?.settings(surface) } : {};
    if (surface === 'metal') settings.metalness = THREE.MathUtils.clamp((settings.metalness ?? metalness) * siteSettings.appearance.materialMetalness, 0, 1);
    const material = basic
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshPhysicalMaterial({ color, roughness, metalness, envMapIntensity: 0.3, ...settings });
    material.name = name;
    materials.push(material);
    parts.set(material, []);
    return material;
  }
  const floor = finish('Raised floor', siteSettings.appearance.floorColor, 0.9, 0, false, 'floor');
  const wall = finish('Painted containment', '#95979b', 0.84, 0.05, false, 'painted');
  const ceiling = finish('Ceiling deck', '#282a2e', 0.92, 0.1, false, 'painted');
  const cabinet = finish('Powder-coated cabinet steel', '#24262a', 0.78, 0.12, false, 'painted');
  const recess = finish('Deep recess', '#090b0e', 0.94, 0);
  const panel = finish('Painted server faceplates', '#41454b', 0.72, 0.18, false, 'painted');
  const silver = finish('Galvanised tray and rails', '#8e949c', 0.57, 0.82, false, 'metal');
  const rubber = finish('Leveling pads and gaskets', '#16171a', 0.98, 0, false, 'plastic');
  const cable = finish('Blue cable bundles', '#39597a', 0.83, 0.05, false, 'plastic');
  const lamp = finish('White fixture diffusers', '#f0f2f5', 1, 0, true);
  const amber = finish('Equipment indicators', usesBundledPortfolio ? '#bca77b' : siteSettings.appearance.accent, 1, 0, true);

  function box(material, width, height, depth, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    setFinishUVs(geometry);
    geometry.translate(x, y, z);
    parts.get(material).push(geometry);
  }
  function pipe(material, radius, start, end) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6, 1);
    setFinishUVs(geometry);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    geometry.translate(...a.add(b).multiplyScalar(0.5).toArray());
    parts.get(material).push(geometry);
  }

  box(floor, 60, 0.24, 78, 0, floorY - 0.12, -9);
  for (let x = -27; x <= 27; x += 3) box(recess, 0.027, 0.008, 75, x, floorY + 0.004, -9);
  for (let z = -45; z <= 27; z += 3) box(recess, 57, 0.008, 0.027, 0, floorY + 0.004, z);
  // Supply grilles run across each service aisle, clear of the extracted chassis.
  for (const z of [5.2, -6.8, -18.8, -30.8]) {
    for (let x = -24; x <= 24; x += 6) {
      box(recess, 2.3, 0.025, 1.7, x, floorY + 0.013, z);
      for (const edge of [-1, 1]) {
        box(panel, 0.075, 0.07, 1.7, x + edge * 1.1125, floorY + 0.035, z);
        box(panel, 2.3, 0.07, 0.075, x, floorY + 0.035, z + edge * 0.8125);
      }
      // Raised metal slats sit over a recessed, opaque supply plenum.
      for (let slat = 0; slat < 7; slat++) box(silver, 0.13, 0.055, 1.54, x - 0.84 + slat * 0.28, floorY + 0.0425, z);
    }
  }

  box(wall, 0.35, ceilingY - floorY, 74, -29, (ceilingY + floorY) / 2, -9);
  box(wall, 0.35, ceilingY - floorY, 74, 29, (ceilingY + floorY) / 2, -9);
  box(ceiling, 58, 0.2, 74, 0, ceilingY, -9);
  box(wall, 58, ceilingY - floorY, 0.32, 0, (ceilingY + floorY) / 2, endZ - 0.5);

  function addCabinet(x, z, height, index) {
    const baseY = floorY + (z === 0 ? 0.22 : 0);
    const y = baseY + height / 2;
    const top = baseY + height;
    const archetype = ['compute', 'storage', 'network', 'power'][(index + Math.floor(index / 4)) % 4];
    const layout = { x, z, height, archetype, bays: [] };
    rows.push(layout);
    // Closed cases and overlapping front uprights leave only narrow assembly seams.
    box(cabinet, 4.92, height, 4.84, x, y, z);
    // An overlapping folded lid closes the top while retaining a service seam.
    box(recess, 4.76, 0.035, 4.7, x, top - 0.055, z);
    box(panel, 4.98, 0.075, 4.9, x, top + 0.0075, z);
    for (const side of [-1, 1]) {
      box(panel, 0.055, height - 0.4, 4.54, x + side * 2.48, y, z);
      box(cabinet, 0.2, height, 0.22, x + side * 2.36, y, z + 2.42);
      box(silver, 0.1, height - 0.28, 0.12, x + side * 2.24, y, z + 2.48);
      // The removable side panel has an inset gasket and two broad quarter-turn latches.
      box(rubber, 0.035, height - 0.52, 0.045, x + side * 2.519, y, z);
      for (const latch of [-1, 1]) {
        box(recess, 0.045, 0.28, 0.14, x + side * 2.52, y + latch * height * 0.28, z + 1.75);
        box(silver, 0.055, 0.15, 0.045, x + side * 2.545, y + latch * height * 0.28, z + 1.75);
      }
      // Foreground cases stand on four levelers; the rear rows already meet the floor.
      if (z === 0) {
        for (const end of [-1, 1]) {
          const footX = x + side * 1.86;
          const footZ = z + end * 1.77;
          pipe(rubber, 0.2, [footX, floorY, footZ], [footX, floorY + 0.065, footZ]);
          pipe(silver, 0.07, [footX, floorY + 0.065, footZ], [footX, baseY + 0.035, footZ]);
          box(cabinet, 0.31, 0.085, 0.31, footX, baseY + 0.005, footZ);
          feet.push({ x: footX, z: footZ, bottom: floorY, top: baseY });
        }
      }
      // Hinged rail covers protect the vertical wiring channel.
      for (const hinge of [-1, 0, 1]) {
        box(silver, 0.11, 0.23, 0.12, x + side * 2.32, y + hinge * height * 0.34, z + 2.565);
        box(recess, 0.025, 0.19, 0.035, x + side * 2.32, y + hinge * height * 0.34, z + 2.64);
      }
    }
    box(recess, 4.46, height - 0.65, 0.13, x, y, z + 2.43);
    for (const edge of [-1, 1]) box(panel, 4.7, 0.22, 0.18, x, y + edge * (height / 2 - 0.14), z + 2.49);
    box(silver, 1.08, 0.13, 0.12, x + 1.45, top - 0.42, z + 2.57);
    box(rubber, 0.18, 0.68, 0.08, x + 2.31, y + 0.15, z + 2.61);
    box(silver, 0.075, 0.5, 0.1, x + 2.31, y + 0.15, z + 2.68);
    const recipes = {
      compute: [['server', 2], ['server', 1], ['server', 1], ['blank', 1], ['server', 2], ['server', 1]],
      storage: [['storage', 3], ['storage', 2], ['storage', 3], ['blank', 1], ['storage', 2]],
      network: [['blank', 2], ['manager', 1], ['patch', 1], ['switch', 1], ['manager', 1], ['patch', 1], ['switch', 1]],
      power: [['ups', 4], ['battery', 3], ['blank', 2], ['power', 2], ['blank', 3], ['monitor', 1]],
    };
    const recipe = recipes[archetype];
    const capacity = Math.floor((height - 1.15) / 0.52);
    let used = 0;
    let bay = 0;
    while (used < capacity) {
      const [type, requestedUnits] = archetype === 'power' && bay >= recipe.length
        ? ['blank', capacity - used]
        : recipe[bay % recipe.length];
      const units = Math.min(requestedUnits, capacity - used);
      const unitHeight = units * 0.52;
      const bottom = baseY + 0.45 + used * 0.52;
      const center = bottom + unitHeight / 2;
      layout.bays.push({ type, units, bottom, top: bottom + unitHeight });
      const face = type === 'ups' || type === 'battery' || type === 'manager' ? cabinet
        : type === 'patch' || type === 'switch' ? silver : panel;
      box(face, 4.25, unitHeight - 0.055, 0.13, x, center, z + 2.53);
      if (type === 'storage') {
        const driveRows = units >= 3 ? 2 : 1;
        for (let row = 0; row < driveRows; row++) {
          const driveY = center + (row - (driveRows - 1) / 2) * 0.62;
          for (let drive = 0; drive < 6; drive++) {
            const driveX = x - 1.66 + drive * 0.66;
            box(recess, 0.56, 0.5, 0.07, driveX, driveY, z + 2.62);
            box(silver, 0.39, 0.09, 0.065, driveX, driveY - 0.13, z + 2.68);
          }
        }
      } else if (type === 'server') {
        for (let vent = 0; vent < 3; vent++) box(recess, 0.84, unitHeight * 0.54, 0.08, x - 1.22 + vent * 0.91, center, z + 2.63);
        box(cabinet, 0.48, unitHeight * 0.66, 0.09, x + 1.45, center, z + 2.63);
      } else if (type === 'patch' || type === 'switch') {
        const ports = type === 'patch' ? 10 : 8;
        for (let port = 0; port < ports; port++) box(recess, 0.22, 0.17, 0.075, x - 1.66 + port * 0.32, center, z + 2.64);
        if (type === 'switch') box(cabinet, 0.52, 0.25, 0.08, x + 1.58, center, z + 2.64);
        // Patch leads drop into the horizontal manager, then return to the side channel.
        if (type === 'patch') {
          for (let lead = 0; lead < 3; lead++) {
            const portX = x - 1.66 + lead * 0.64;
            const dropY = center - 0.34 - lead * 0.065;
            pipe(cable, 0.032, [portX, center, z + 2.7], [portX, dropY, z + 2.87]);
            pipe(cable, 0.032, [portX, dropY, z + 2.87], [x - 1.93, dropY, z + 2.87]);
            pipe(cable, 0.032, [x - 1.93, dropY, z + 2.87], [x - 1.93, center - 0.58, z + 2.73]);
          }
        }
      } else if (type === 'manager') {
        box(recess, 3.72, 0.2, 0.09, x, center, z + 2.65);
        for (const side of [-1, 1]) box(panel, 0.12, 0.32, 0.11, x + side * 1.92, center, z + 2.67);
      } else if (type === 'ups' || type === 'battery') {
        for (const side of [-1, 1]) {
          box(recess, 1.55, unitHeight * 0.64, 0.08, x + side * 0.99, center - 0.08, z + 2.63);
          box(silver, 0.09, unitHeight * 0.56, 0.11, x + side * 1.92, center, z + 2.67);
        }
        if (type === 'ups') {
          box(panel, 0.62, 0.37, 0.085, x, center + unitHeight * 0.25, z + 2.65);
          box(recess, 0.42, 0.18, 0.06, x, center + unitHeight * 0.25, z + 2.71);
        }
      } else if (type === 'power' || type === 'monitor') {
        box(recess, 1.05, unitHeight * 0.48, 0.08, x - 0.93, center, z + 2.63);
        for (let socket = 0; socket < 4; socket++) box(cabinet, 0.32, unitHeight * 0.48, 0.08, x + 0.25 + socket * 0.44, center, z + 2.63);
      }
      if (type !== 'blank' && type !== 'manager' && type !== 'battery') box(amber, 0.09, 0.05, 0.06, x + 1.77, center + 0.07, z + 2.71);
      if (type === 'server' || type === 'storage') {
        for (const side of [-1, 1]) box(silver, 0.09, unitHeight * 0.6, 0.12, x + side * 1.95, center, z + 2.67);
      }
      used += units;
      bay++;
    }
    box(recess, 0.22, height - 1.1, 0.24, x - 2.12, y, z + 2.58);
    for (let run = 0; run < 3; run++) pipe(cable, 0.035, [x - 2.02 + run * 0.065, floorY + 1.4, z + 2.72], [x - 2.02 + run * 0.065, trayY - 0.2, z + 2.72]);
  }

  // The content cabinets sit inside this row, with ordinary equipment on both sides.
  for (const z of [0, -12, -24, -36]) {
    const height = z === 0 ? rackHeight : backgroundHeight;
    for (let index = 0; index < 9; index++) {
      const x = -24 + index * 6;
      if (!reservedSlots.some(([slotX, slotZ]) => slotX === x && slotZ === z)) addCabinet(x, z, height, index + Math.abs(z) / 12);
    }
    for (let join = 0; join < 8; join++) {
      const x = -21 + join * 6;
      const columnHeight = height + (z === 0 ? 0.22 : 0);
      const y = floorY + columnHeight / 2;
      cableManagers.push({ x, z, height });
      box(cabinet, 1.04, columnHeight, 4.78, x, y, z);
      box(panel, 0.86, columnHeight - 0.24, 0.08, x, y, z + 2.43);
      for (const edge of [-1, 1]) box(recess, 0.035, columnHeight - 0.25, 0.035, x + edge * 0.45, y, z + 2.49);
      box(recess, 0.07, 0.35, 0.045, x + 0.25, y + 0.1, z + 2.5);
      box(silver, 0.045, 0.22, 0.055, x + 0.25, y + 0.1, z + 2.54);
      box(panel, 0.92, 0.08, 4.66, x, floorY + columnHeight - 0.02, z);
    }
  }

  // Ladder trays and service lights repeat across the room, above the cabinet rows.
  for (const z of [0, -12, -24, -36]) {
    for (const edge of [-1, 1]) box(silver, 54, 0.31, 0.1, 0, trayY, z + edge * 0.91);
    for (let x = -27; x <= 27; x += 1.8) box(silver, 0.085, 0.07, 1.92, x, trayY - 0.12, z);
    for (let bundle = 0; bundle < 6; bundle++) pipe(cable, 0.075, [-27, trayY + 0.03, z - 0.65 + bundle * 0.25], [27, trayY + 0.03, z - 0.65 + bundle * 0.25]);
    for (let x = -24; x <= 24; x += 6) box(silver, 0.08, ceilingY - trayY, 0.08, x, (ceilingY + trayY) / 2, z);
  }
  for (const z of [6, -6, -18, -30]) {
    box(silver, 57, 0.3, 0.22, 0, ceilingY - 0.65, z);
    for (const x of [-21, -9, 3, 15]) {
      box(cabinet, 8.5, 0.16, 0.5, x, roofY + 2.2, z);
      box(lamp, 8.25, 0.055, 0.34, x, roofY + 2.1, z);
      for (const edge of [-1, 1]) box(silver, 0.05, 1.05, 0.05, x + edge * 3.7, roofY + 2.8, z);
    }
  }

  // The far wall has an opaque containment door, avoiding transparent sorting.
  const portalY = floorY + 6.4;
  for (const x of [-5.1, 0, 5.1]) box(silver, 0.2, 12.8, 0.22, x, portalY, endZ);
  for (const y of [floorY + 0.12, floorY + 11.1, floorY + 12.7]) box(silver, 10.4, 0.22, 0.22, 0, y, endZ);
  for (const side of [-1, 1]) {
    box(ceiling, 4.86, 10.7, 0.14, side * 2.55, floorY + 5.6, endZ + 0.02);
    box(silver, 0.09, 1.1, 0.25, side * 0.4, floorY + 5.5, endZ + 0.2);
  }
  box(wall, 9.8, 1.2, 0.2, 0, floorY + 11.9, endZ + 0.02);
  box(lamp, 4.5, 0.08, 0.16, 0, floorY + 12.5, endZ + 0.2);

  parts.forEach((items, material) => {
    if (!items.length) return;
    const geometry = mergeGeometries(items, false);
    items.forEach(item => item.dispose());
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = material.name;
    mesh.receiveShadow = material === floor;
    mesh.castShadow = material === cabinet || material === rubber;
    group.add(mesh);
  });
  // Fixed floor planes clear the raised seams and fit between cabinet fronts and grilles.
  RACK_SLOTS.forEach(({ id, label: rackLabel, position: [x, , z] }, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 240;
    const context = canvas.getContext('2d');
    context.fillStyle = '#151618';
    context.fillRect(16, 38, 1248, 164);
    context.textBaseline = 'middle';
    context.font = '500 82px "IBM Plex Sans", Arial, sans-serif';
    context.fillStyle = usesBundledPortfolio ? '#cf9e77' : siteSettings.appearance.accent;
    context.fillText(String(index + 1).padStart(2, '0'), 68, 122);
    context.font = '500 102px "IBM Plex Sans", Arial, sans-serif';
    context.fillStyle = '#f1ede5';
    context.fillText(rackLabel.toUpperCase(), 218, 122, 1000);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false, toneMapped: false });
    materials.push(material);
    const geometry = new THREE.PlaneGeometry(5, 0.9375);
    geometries.push(geometry);
    const label = new THREE.Mesh(geometry, material);
    label.name = `${id} floor wayfinding`;
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, floorY + 0.018, z + 3.4);
    group.add(label);
    floorLabels.push({ id, position: label.position.toArray(), size: [5, 0.9375] });
  });
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const stats = {
    cabinets: rows.length,
    cabinetLayouts: rows,
    cableManagers: cableManagers.length,
    levelingFeet: feet.length,
    footContact: { minY: Math.min(...feet.map(foot => foot.bottom)), maxY: Math.max(...feet.map(foot => foot.bottom)), floorY },
    frontRoofY: floorY + 0.22 + rackHeight,
    floorLabels,
    drawCalls: group.children.length,
    triangles: geometries.reduce((sum, geometry) => sum + geometry.index.count / 3, 0),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    cabinetHeight: rackHeight,
    backgroundHeight,
    reservedSlots,
  };
  return {
    group,
    stats,
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      group.clear();
    },
  };
}
