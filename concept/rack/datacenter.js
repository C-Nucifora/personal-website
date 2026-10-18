import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Authored geometry informed by Google's New Albany aisle photographs. The three
// front-left positions belong to the interactive portfolio models in scene.js.
export function createDatacenter({ floorY = -5.42, rackHeight = 10.4 } = {}) {
  const group = new THREE.Group();
  group.name = 'Datacenter cold aisle';
  const parts = new Map();
  const geometries = [];
  const materials = [];
  const cabinetHeight = Math.max(12.8, rackHeight + 2.4);
  const roofY = floorY + cabinetHeight;
  const ceilingY = roofY + 4;
  const trayY = roofY + 1.25;
  const endZ = -53.2;

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

  box(floor, 48, 0.24, 84, 0, floorY - 0.12, -18);
  // Tile seams are actual, broad geometry. Fine hatch textures shimmer at the far end.
  for (let x = -20; x <= 20; x += 3) box(recess, 0.027, 0.008, 81, x, floorY + 0.004, -18);
  for (let z = -57; z <= 21; z += 3) box(recess, 42, 0.008, 0.027, 0, floorY + 0.004, z);
  for (const side of [-1, 1]) {
    // The supply vents sit at the rack fronts, outside the clear walking route.
    for (let z = 0; z >= -48; z -= 6) {
      const x = side * 3.7;
      box(panel, 1.7, 0.015, 2.3, x, floorY + 0.012, z);
      for (let slat = 0; slat < 7; slat++) box(recess, 1.38, 0.012, 0.12, x, floorY + 0.025, z - 0.84 + slat * 0.28);
    }
    box(silver, 0.07, 0.012, 55, side * 4.85, floorY + 0.014, -24);
  }

  // The room continues behind the rows, rather than ending at each cabinet's roof.
  box(wall, 0.35, ceilingY - floorY, 79, -18, (ceilingY + floorY) / 2, -18);
  box(wall, 0.35, ceilingY - floorY, 79, 18, (ceilingY + floorY) / 2, -18);
  box(ceiling, 36, 0.2, 79, 0, ceilingY, -18);
  box(wall, 36, ceilingY - floorY, 0.32, 0, (ceilingY + floorY) / 2, endZ - 0.5);

  const rows = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 9; index++) {
      if (side === -1 && index < 3) continue;
      const x = side * 8;
      const z = -index * 6;
      const frontX = side * 4.98;
      const y = floorY + cabinetHeight / 2;
      rows.push({ side, index, x, z });
      box(cabinet, 6, cabinetHeight, 4.92, x, y, z);
      // Removable end panels are visible at the aisle entrance and row gaps.
      for (const end of [-1, 1]) {
        box(panel, 5.64, cabinetHeight - 0.42, 0.055, x, y, z + end * 2.49);
        box(recess, 0.045, cabinetHeight - 0.55, 0.02, x, y, z + end * 2.526);
        for (const half of [-1, 1]) {
          box(recess, 0.09, 0.44, 0.03, x + half * 0.27, y + 0.2, z + end * 2.54);
          box(silver, 0.055, 0.28, 0.045, x + half * 0.27, y + 0.2, z + end * 2.56);
        }
      }
      // Dark inset equipment aperture, bounded by substantial mounting uprights.
      box(recess, 0.12, cabinetHeight - 0.68, 4.48, frontX, y, z);
      for (const edge of [-1, 1]) {
        box(silver, 0.14, cabinetHeight - 0.26, 0.1, frontX - side * 0.11, y, z + edge * 2.27);
        box(cabinet, 0.23, cabinetHeight, 0.18, frontX - side * 0.03, y, z + edge * 2.4);
        box(recess, 0.7, 0.16, 0.4, x - side * 1.8, floorY + 0.08, z + edge * 1.85);
      }
      for (const edge of [-1, 1]) box(panel, 0.18, 0.22, 4.7, frontX - side * 0.12, y + edge * (cabinetHeight / 2 - 0.16), z);
      box(silver, 0.12, 0.18, 1.08, frontX - side * 0.15, roofY - 0.42, z + 1.5);
      // A mixture of 1U/2U server fronts and dense storage trays, with broad,
      // resolvable recesses in place of an aliased perforation pattern.
      let cursor = floorY + 0.46;
      let server = 0;
      while (cursor < roofY - 0.95) {
        const height = (server + index) % 4 === 0 ? 1.04 : 0.55;
        if (cursor + height > roofY - 0.75) break;
        const center = cursor + height / 2;
        box(panel, 0.13, height - 0.055, 4.25, frontX - side * 0.17, center, z);
        if ((server + index) % 3 === 0) {
          for (let drive = 0; drive < 6; drive++) {
            const driveZ = z - 1.66 + drive * 0.66;
            box(recess, 0.07, height * 0.65, 0.55, frontX - side * 0.25, center, driveZ);
            box(silver, 0.06, 0.07, 0.37, frontX - side * 0.3, center - height * 0.2, driveZ);
          }
        } else {
          box(recess, 0.08, height * 0.52, 2.82, frontX - side * 0.25, center, z - 0.3);
          box(cabinet, 0.09, height * 0.68, 0.5, frontX - side * 0.25, center, z + 1.45);
          for (const end of [-1, 1]) box(silver, 0.12, height * 0.6, 0.09, frontX - side * 0.29, center, z + end * 1.95);
        }
        if (server % 2 === 0) box(amber, 0.06, 0.05, 0.09, frontX - side * 0.31, center + 0.07, z + 1.5);
        cursor += height;
        server++;
      }
      // Vertical cable managers sit at the edge of the mounted equipment.
      box(recess, 0.24, cabinetHeight - 1.1, 0.22, frontX - side * 0.19, y, z - 2.12);
      for (let run = 0; run < 3; run++) pipe(cable, 0.035, [frontX - side * 0.36, floorY + 1.4, z - 2.02 + run * 0.065], [frontX - side * 0.36, trayY - 0.2, z - 2.02 + run * 0.065]);
    }
  }

  // Cable-manager columns close the cabinet pitch into continuous rows. The
  // first left columns match the shallower interactive cases without crossing them.
  const cableManagers = [];
  for (const side of [-1, 1]) {
    for (let join = 0; join < 8; join++) {
      const besidePortfolio = side === -1 && join < 3;
      const depth = besidePortfolio ? 4.78 : 6;
      const height = besidePortfolio ? rackHeight : cabinetHeight;
      const x = side * 8;
      const z = -3 - join * 6;
      const centerY = floorY + height / 2;
      const frontX = x - side * (depth / 2 + 0.035);
      cableManagers.push({ side, z, depth, height });
      box(cabinet, depth, height, 1.04, x, centerY, z);
      box(panel, 0.08, height - 0.24, 0.86, frontX, centerY, z);
      for (const edge of [-1, 1]) box(recess, 0.035, height - 0.25, 0.035, frontX - side * 0.055, centerY, z + edge * 0.45);
      box(recess, 0.045, 0.35, 0.07, frontX - side * 0.06, centerY + 0.1, z + 0.25);
      box(silver, 0.055, 0.22, 0.045, frontX - side * 0.09, centerY + 0.1, z + 0.25);
      box(panel, depth - 0.12, 0.08, 0.92, x, floorY + height + 0.02, z);
    }
  }

  // Long suspended ladder trays run parallel to the rows. Crossmembers and
  // drops make their repeated supports legible from the entrance camera.
  for (const side of [-1, 1]) {
    const x = side * 6.2;
    for (const edge of [-1, 1]) box(silver, 0.1, 0.31, 56, x + edge * 0.91, trayY, -24);
    for (let z = 3; z >= -51; z -= 1.8) box(silver, 1.92, 0.07, 0.085, x, trayY - 0.12, z);
    for (let bundle = 0; bundle < 6; bundle++) pipe(cable, 0.075, [x - 0.65 + bundle * 0.25, trayY + 0.03, 3.5], [x - 0.65 + bundle * 0.25, trayY + 0.03, -51.5]);
    for (let z = 0; z >= -48; z -= 6) {
      box(silver, 0.08, ceilingY - trayY, 0.08, x, (ceilingY + trayY) / 2, z);
      box(cabinet, 2.3, 0.13, 0.17, x, trayY - 0.22, z);
    }
  }
  for (let z = 4; z >= -50; z -= 6) {
    box(silver, 33, 0.3, 0.22, 0, ceilingY - 0.65, z);
    // Two long fixtures above the aisle keep a usable white industrial light rhythm.
    for (const x of [-2.5, 2.5]) {
      box(cabinet, 0.5, 0.16, 4.5, x, roofY + 2.2, z - 2);
      box(lamp, 0.34, 0.055, 4.25, x, roofY + 2.1, z - 2);
      box(silver, 0.05, 1.05, 0.05, x, roofY + 2.8, z - 2);
    }
  }

  // An end containment portal closes the vanishing point. Inset dark panels
  // suggest glazing without transparent sorting or high-cost transmission.
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
    cabinetHeight,
    reservedSlots: [[-8, 0], [-8, -6], [-8, -12]],
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
