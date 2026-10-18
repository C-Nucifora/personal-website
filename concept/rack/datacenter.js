import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

export const RACK_SLOTS = [
  { id: 'software', position: [-6, 0, 0] },
  { id: 'hardware', position: [0, 0, 0] },
  { id: 'experience', position: [6, 0, 0] },
];

// The content racks form the front equipment row. Repeated rows behind it supply depth.
export function createDatacenter({ floorY = -5.42, rackHeight = 10.4 } = {}) {
  const group = new THREE.Group();
  group.name = 'Datacenter equipment rows';
  const parts = new Map();
  const geometries = [];
  const materials = [];
  const backgroundHeight = Math.max(12.8, rackHeight + 2.4);
  const roofY = floorY + backgroundHeight;
  const ceilingY = roofY + 4;
  const trayY = roofY + 1.25;
  const endZ = -43.2;
  const reservedSlots = RACK_SLOTS.map(({ position: [x, , z] }) => [x, z]);
  const rows = [];
  const cableManagers = [];

  function finish(name, color, roughness = 0.8, metalness = 0.1, basic = false) {
    const material = basic
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.3 });
    material.name = name;
    materials.push(material);
    parts.set(material, []);
    return material;
  }
  const floor = finish('Raised floor', '#77777a', 0.88, 0);
  const wall = finish('Painted containment', '#95979b', 0.84, 0.05);
  const ceiling = finish('Ceiling deck', '#282a2e', 0.92, 0.1);
  const cabinet = finish('Cabinet steel', '#24262a', 0.7, 0.45);
  const recess = finish('Deep recess', '#090b0e', 0.94, 0);
  const panel = finish('Server faceplates', '#41454b', 0.7, 0.4);
  const silver = finish('Galvanised tray and rails', '#8e949c', 0.63, 0.6);
  const cable = finish('Blue cable bundles', '#39597a', 0.83, 0.05);
  const lamp = finish('White fixture diffusers', '#f0f2f5', 1, 0, true);
  const amber = finish('Equipment indicators', '#bca77b', 1, 0, true);

  function box(material, width, height, depth, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(x, y, z);
    parts.get(material).push(geometry);
  }
  function pipe(material, radius, start, end) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6, 1);
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
      box(panel, 2.3, 0.015, 1.7, x, floorY + 0.012, z);
      for (let slat = 0; slat < 7; slat++) box(recess, 0.12, 0.012, 1.38, x - 0.84 + slat * 0.28, floorY + 0.025, z);
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
    rows.push({ x, z, height });
    // Closed cases and overlapping front uprights leave only narrow assembly seams.
    box(cabinet, 4.92, height, 4.84, x, y, z);
    for (const side of [-1, 1]) {
      box(panel, 0.055, height - 0.4, 4.54, x + side * 2.48, y, z);
      box(cabinet, 0.2, height, 0.22, x + side * 2.36, y, z + 2.42);
      box(silver, 0.1, height - 0.28, 0.12, x + side * 2.24, y, z + 2.48);
      box(recess, 0.4, 0.22, 0.7, x + side * 1.85, floorY + 0.11, z - 1.75);
    }
    box(recess, 4.46, height - 0.65, 0.13, x, y, z + 2.43);
    for (const edge of [-1, 1]) box(panel, 4.7, 0.22, 0.18, x, y + edge * (height / 2 - 0.14), z + 2.49);
    box(silver, 1.08, 0.13, 0.12, x + 1.45, top - 0.42, z + 2.57);
    let cursor = baseY + 0.45;
    let server = 0;
    while (cursor < top - 0.9) {
      const unitHeight = (server + index) % 4 === 0 ? 1.04 : 0.55;
      if (cursor + unitHeight > top - 0.7) break;
      const center = cursor + unitHeight / 2;
      box(panel, 4.25, unitHeight - 0.055, 0.13, x, center, z + 2.53);
      if ((server + index) % 3 === 0) {
        for (let drive = 0; drive < 6; drive++) {
          const driveX = x - 1.66 + drive * 0.66;
          box(recess, 0.55, unitHeight * 0.65, 0.07, driveX, center, z + 2.62);
          box(silver, 0.37, 0.07, 0.06, driveX, center - unitHeight * 0.2, z + 2.68);
        }
      } else {
        box(recess, 2.82, unitHeight * 0.52, 0.08, x - 0.3, center, z + 2.63);
        box(cabinet, 0.5, unitHeight * 0.68, 0.09, x + 1.45, center, z + 2.63);
        for (const edge of [-1, 1]) box(silver, 0.09, unitHeight * 0.6, 0.12, x + edge * 1.95, center, z + 2.67);
      }
      if (server % 2 === 0) box(amber, 0.09, 0.05, 0.06, x + 1.5, center + 0.07, z + 2.69);
      cursor += unitHeight;
      server++;
    }
    box(recess, 0.22, height - 1.1, 0.24, x - 2.12, y, z + 2.58);
    for (let run = 0; run < 3; run++) pipe(cable, 0.035, [x - 2.02 + run * 0.065, floorY + 1.4, z + 2.72], [x - 2.02 + run * 0.065, trayY - 0.2, z + 2.72]);
  }

  // The content cabinets sit inside this row, with ordinary equipment on both sides.
  for (const z of [0, -12, -24, -36]) {
    const height = z === 0 ? rackHeight : backgroundHeight;
    for (let index = 0; index < 9; index++) {
      const x = -24 + index * 6;
      if (!reservedSlots.some(([slotX, slotZ]) => slotX === x && slotZ === z)) addCabinet(x, z, height, index + Math.abs(z));
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
    group.add(mesh);
  });
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const stats = {
    cabinets: rows.length,
    cableManagers: cableManagers.length,
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
      group.clear();
    },
  };
}
