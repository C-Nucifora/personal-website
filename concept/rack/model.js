import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { units } from './catalog.js';

export const U = 0.4;
export const FACE_Z = 2.31;
export const EXTRACTION = 4.42;
const COLORS = {
  frame: '#353b3c', edge: '#60696b', silver: '#b8c2c8', bright: '#dce3e5',
  darkSilver: '#7d898e', graphite: '#51514c', black: '#101719', rubber: '#242a2b',
  pcb: '#315b50', trace: '#9e9a68', copper: '#ad7952', orange: '#dd8451', green: '#a5c9a6',
};

function roundedPath(path, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
}

function roundedBox(width, height, depth, radius = 0.025) {
  const shape = new THREE.Shape();
  roundedPath(shape, -width / 2, -height / 2, width, height, radius);
  const bevel = Math.min(0.012, depth / 5, radius / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, depth - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}

export function createRackModel(renderer) {
  const geometries = new Set();
  const textures = [];
  const allMaterials = [];
  let randomSeed = 7621;
  const random = () => {
    randomSeed ^= randomSeed << 13;
    randomSeed ^= randomSeed >>> 17;
    randomSeed ^= randomSeed << 5;
    return (randomSeed >>> 0) / 4294967296;
  };
  const brushedCanvas = document.createElement('canvas');
  brushedCanvas.width = 1024;
  brushedCanvas.height = 256;
  const brushedContext = brushedCanvas.getContext('2d');
  brushedContext.fillStyle = '#f4f4f4';
  brushedContext.fillRect(0, 0, 1024, 256);
  for (let line = 0; line < 320; line++) {
    const value = Math.round(225 + random() * 25);
    brushedContext.strokeStyle = `rgba(${value},${value},${value},0.25)`;
    brushedContext.lineWidth = 1 + random() * 2;
    const y = random() * 256;
    const x = random() * 1024;
    brushedContext.beginPath();
    brushedContext.moveTo(x, y);
    brushedContext.lineTo(x + 90 + random() * 700, y + random() * 0.3);
    brushedContext.stroke();
  }
  const brushed = new THREE.CanvasTexture(brushedCanvas);
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
  brushed.repeat.set(1, 1);
  brushed.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  textures.push(brushed);
  const polymerCanvas = document.createElement('canvas');
  polymerCanvas.width = polymerCanvas.height = 128;
  const polymerContext = polymerCanvas.getContext('2d');
  polymerContext.fillStyle = '#eeeeee';
  polymerContext.fillRect(0, 0, 128, 128);
  for (let grain = 0; grain < 5000; grain++) {
    const value = Math.round(230 + random() * 25);
    polymerContext.fillStyle = `rgba(${value},${value},${value},0.2)`;
    polymerContext.fillRect(Math.floor(random() * 128), Math.floor(random() * 128), 1, 1);
  }
  const polymerGrain = new THREE.CanvasTexture(polymerCanvas);
  polymerGrain.wrapS = polymerGrain.wrapT = THREE.RepeatWrapping;
  polymerGrain.repeat.set(2, 2);
  textures.push(polymerGrain);
  // Vertex colours let all the different metal finishes share a draw call per chassis.
  const materials = {
    // Roughness grain survives minification; micro-bump on these tiny bevels caused specular shimmer.
    metal: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 1, roughness: 0.5, roughnessMap: brushed }),
    painted: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0, roughness: 0.72, roughnessMap: polymerGrain }),
    plastic: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.1, roughness: 0.64, roughnessMap: polymerGrain }),
    board: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.26, roughness: 0.62 }),
    light: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.08, metalness: 0.2, roughness: 0.35 }),
  };
  allMaterials.push(...Object.values(materials));

  function batch(parent, castsShadow = true) {
    const parts = new Map();
    function add(geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], finish = 'metal') {
      if (geometry.index) {
        const indexed = geometry;
        geometry = geometry.toNonIndexed();
        indexed.dispose();
      }
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
      geometry.applyMatrix4(matrix);
      if (finish === 'metal' && ['frame', 'graphite', 'black'].includes(color)) finish = 'painted';
      const rgb = new THREE.Color(COLORS[color] || color);
      if (finish === 'metal') rgb.multiplyScalar(0.985 + random() * 0.03);
      const attribute = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < attribute.length; i += 3) {
        attribute[i] = rgb.r;
        attribute[i + 1] = rgb.g;
        attribute[i + 2] = rgb.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(attribute, 3));
      const list = parts.get(finish) || [];
      list.push(geometry);
      parts.set(finish, list);
    }
    return {
      box(color, dimensions, position, rotation = [0, 0, 0], finish = 'metal') { add(new THREE.BoxGeometry(...dimensions), color, position, rotation, finish); },
      rounded(color, dimensions, position, radius = 0.025, rotation = [0, 0, 0], finish = 'metal') { add(roundedBox(...dimensions, radius), color, position, rotation, finish); },
      cylinder(color, radius, depth, position, rotation = [Math.PI / 2, 0, 0], segments = 16, finish = 'metal') { add(new THREE.CylinderGeometry(radius, radius, depth, segments), color, position, rotation, finish); },
      torus(color, radius, tube, position, rotation = [0, 0, 0], finish = 'metal') { add(new THREE.TorusGeometry(radius, tube, 5, 20), color, position, rotation, finish); },
      geometry: add,
      finish() {
        for (const [finish, list] of parts) {
          const geometry = mergeGeometries(list, false);
          list.forEach((item) => item.dispose());
          if (!geometry) throw new Error('Rack geometry could not be assembled');
          geometries.add(geometry);
          const mesh = new THREE.Mesh(geometry, materials[finish]);
          mesh.castShadow = castsShadow && finish !== 'light' && finish !== 'board';
          mesh.receiveShadow = true;
          parent.add(mesh);
        }
      },
    };
  }
  function texturePlane(parent, width, height, position, paint, rotation = [0, 0, 0], resolution = 2048) {
    const surface = document.createElement('canvas');
    surface.width = resolution;
    surface.height = Math.max(128, Math.round(resolution * height / width));
    const ctx = surface.getContext('2d');
    const sx = surface.width / width;
    const sy = surface.height / height;
    const graphic = {
      text(text, x, y, size = 0.075, color = '#d1d9d6', align = 'left', weight = 500) {
        ctx.font = `${weight} ${size * sy}px monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, (x + width / 2) * sx, (height / 2 - y) * sy);
      },
      rect(x, y, w, h, color, radius = 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect((x - w / 2 + width / 2) * sx, (height / 2 - y - h / 2) * sy, w * sx, h * sy, radius * sx);
        ctx.fill();
      },
      line(points, color = '#93c6ae', lineWidth = 0.007) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth * sx;
        ctx.beginPath();
        points.forEach(([x, y], index) => {
          if (index === 0) ctx.moveTo((x + width / 2) * sx, (height / 2 - y) * sy);
          else ctx.lineTo((x + width / 2) * sx, (height / 2 - y) * sy);
        });
        ctx.stroke();
      },
    };
    paint(graphic);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    allMaterials.push(material);
    const geometry = new THREE.PlaneGeometry(width, height);
    geometries.add(geometry);
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(...position);
    plane.rotation.set(...rotation);
    parent.add(plane);
    return graphic;
  }
  function screw(parts, x, y, z = FACE_Z + 0.065, radius = 0.036) {
    parts.cylinder('darkSilver', radius * 1.38, 0.014, [x, y, z]);
    parts.cylinder('bright', radius, 0.026, [x, y, z + 0.012]);
    parts.box('black', [radius * 1.3, radius * 0.23, 0.005], [x, y, z + 0.028], [0, 0, 0], 'plastic');
    parts.box('black', [radius * 0.23, radius * 1.3, 0.005], [x, y, z + 0.029], [0, 0, 0], 'plastic');
  }
  function knob(parts, x, y, radius = 0.13, color = 'silver') {
    parts.cylinder('black', radius * 1.12, 0.035, [x, y, FACE_Z + 0.055], [Math.PI / 2, 0, 0], 28, 'plastic');
    parts.cylinder(color, radius, 0.15, [x, y, FACE_Z + 0.14], [Math.PI / 2, 0, 0], 32);
    parts.cylinder('darkSilver', radius * 0.84, 0.008, [x, y, FACE_Z + 0.22], [Math.PI / 2, 0, 0], 32);
    for (let tooth = 0; tooth < 28; tooth++) {
      const angle = tooth * Math.PI * 2 / 28;
      parts.box('darkSilver', [0.008, 0.025, 0.12], [x + Math.sin(angle) * radius, y + Math.cos(angle) * radius, FACE_Z + 0.14], [0, 0, -angle]);
    }
    parts.box('bright', [0.014, radius * 0.45, 0.006], [x, y + radius * 0.5, FACE_Z + 0.225]);
  }
  function handle(parts, x, y, height, color = 'silver') {
    const z = FACE_Z + 0.18;
    parts.rounded(color, [0.095, 0.105, 0.24], [x, y + height / 2 - 0.045, z], 0.024);
    parts.rounded(color, [0.095, 0.105, 0.24], [x, y - height / 2 + 0.045, z], 0.024);
    parts.rounded(color, [0.09, height, 0.09], [x, y, z + 0.1], 0.04);
    parts.rounded('rubber', [0.096, height * 0.5, 0.096], [x, y, z + 0.102], 0.03, [0, 0, 0], 'plastic');
  }

  function createCover(parent, unit, index, h) {
    const width = 4.12;
    const depth = 4.15;
    const y = h / 2 - 0.05;
    const z = 0.075;
    const shape = new THREE.Shape();
    roundedPath(shape, -width / 2, -depth / 2, width, depth, 0.035);
    const details = batch(parent);
    const painted = ['compute', 'control', 'display', 'console'].includes(unit.type);
    const color = painted ? (unit.type === 'compute' ? 'graphite' : 'frame') : 'darkSilver';
    const hole = (x, py, w, ph, radius) => {
      const path = new THREE.Path();
      roundedPath(path, x - w / 2, py - ph / 2, w, ph, radius);
      shape.holes.push(path);
    };
    const screwRows = unit.u === 6 ? [-1.82, 0, 1.82] : [-1.82, 1.82];
    for (const x of [-1.87, 1.87]) for (const py of screwRows) {
      hole(x, py, 0.105, 0.105, 0.0525);
      const pz = z - py;
      details.cylinder('black', 0.049, 0.012, [x, y + 0.009, pz], [0, 0, 0], 16, 'plastic');
      details.cylinder('silver', 0.034, 0.008, [x, y + 0.016, pz], [0, 0, 0], 16);
      details.box('black', [0.042, 0.003, 0.008], [x, y + 0.021, pz], [0, 0, 0], 'plastic');
      details.box('black', [0.008, 0.003, 0.042], [x, y + 0.021, pz], [0, 0, 0], 'plastic');
    }
    // Rear slots are actual apertures; the dark inset closes the view into an unmodelled chassis.
    const ventRows = unit.type === 'compute' ? 3 : unit.type === 'audio' || unit.type === 'instrument' ? 1 : 2;
    const ventColumns = unit.type === 'compute' ? 14 : 10;
    const ventPitch = unit.type === 'compute' ? 0.235 : 0.31;
    for (let row = 0; row < ventRows; row++) for (let column = 0; column < ventColumns; column++) {
      const x = (column - (ventColumns - 1) / 2) * ventPitch;
      const py = 0.58 + row * 0.39;
      hole(x, py, 0.073, ventRows === 1 ? 0.75 : 0.28, 0.028);
    }
    details.rounded('black', [3.65, 0.018, 1.62], [0, y - 0.052, -0.93], 0.02, [0, 0, 0], 'plastic');
    // Folded side flanges and a narrow rear seam make the cover read as a removable sheet.
    for (const x of [-2.045, 2.045]) details.box(color, [0.022, 0.066, 4.07], [x, y - 0.027, z]);
    details.box('black', [3.48, 0.004, 0.013], [0, y + 0.025, -1.565], [0, 0, 0], 'plastic');
    details.finish();

    const surface = document.createElement('canvas');
    surface.width = surface.height = 1024;
    const relief = document.createElement('canvas');
    relief.width = relief.height = 1024;
    const colorContext = surface.getContext('2d');
    const bumpContext = relief.getContext('2d');
    colorContext.fillStyle = COLORS[color];
    colorContext.fillRect(0, 0, 1024, 1024);
    bumpContext.fillStyle = '#ffffff';
    bumpContext.fillRect(0, 0, 1024, 1024);
    const sx = 1024 / width;
    const sy = 1024 / depth;
    const text = (value, x, py, size, weight = 500) => {
      for (const [ctx, ink] of [[colorContext, painted ? '#bfc5c1' : '#283234'], [bumpContext, '#050505']]) {
        ctx.font = `${weight} ${size * sy}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink;
        ctx.fillText(value, (x + width / 2) * sx, (depth / 2 - py) * sy);
      }
    };
    text(`${String(index + 1).padStart(2, '0')} / ${unit.u}U`, -1.62, -0.34, 0.084);
    text(unit.title, -1.62, -0.71, unit.title.length > 18 ? 0.17 : 0.21, 600);
    text(unit.subtitle, -1.62, -1.0, 0.083);
    text('Open project ↗', -1.62, -1.49, 0.135, 600);
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(relief);
    for (const texture of [map, bumpMap]) {
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      textures.push(texture);
    }
    // The colour and bump maps make a lit etch, rather than floating, unlit text.
    const material = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.0015, metalness: painted ? 0 : 1, roughness: painted ? 0.72 : 0.5, roughnessMap: painted ? polymerGrain : brushed });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: COLORS[color], metalness: painted ? 0 : 1, roughness: painted ? 0.72 : 0.5, roughnessMap: painted ? polymerGrain : brushed });
    allMaterials.push(material, rimMaterial);
    // The etch belongs to the extrusion's top face, with no second sheet to shadow or fight it.
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 1, curveSegments: 3 });
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let vertex = 0; vertex < positions.count; vertex++) uv.setXY(vertex, (positions.getX(vertex) + width / 2) / width, (positions.getY(vertex) + depth / 2) / depth);
    geometries.add(geometry);
    const cap = new THREE.Mesh(geometry, [material, rimMaterial]);
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, y, z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    parent.add(cap);

    const linkGeometry = new THREE.PlaneGeometry(3.48, 1.5);
    geometries.add(linkGeometry);
    const linkMaterial = new THREE.MeshBasicMaterial({ visible: false });
    allMaterials.push(linkMaterial);
    const link = new THREE.Mesh(linkGeometry, linkMaterial);
    link.rotation.x = -Math.PI / 2;
    link.position.set(0, y + 0.029, z + 0.96);
    link.userData = { index, projectId: unit.id, kind: 'project-link', href: `project.html?project=${encodeURIComponent(unit.id)}` };
    parent.add(link);
    projectLinkTargets.push(link);
  }

  const totalU = units.reduce((sum, unit) => sum + unit.u, 0);
  const stackHeight = totalU * U;
  const height = stackHeight + 0.8;
  const rack = new THREE.Group();
  const rackParts = batch(rack);
  const half = height / 2;
  rackParts.rounded('frame', [4.92, 0.21, 4.84], [0, half - 0.105, 0], 0.07);
  rackParts.rounded('frame', [4.92, 0.23, 4.84], [0, -half + 0.115, 0], 0.06);
  rackParts.rounded('frame', [0.115, height - 0.35, 4.78], [-2.395, 0, 0], 0.036);
  rackParts.rounded('frame', [0.115, height - 0.35, 4.78], [2.395, 0, 0], 0.036);
  for (const x of [-2.26, 2.26]) {
    rackParts.rounded('darkSilver', [0.15, stackHeight + 0.16, 0.12], [x, 0, 2.29], 0.015);
    rackParts.box('edge', [0.1, stackHeight + 0.12, 0.1], [x, 0, -2.25]);
    for (let u = 0; u < totalU; u++) {
      for (const offset of [-0.115, 0, 0.115]) {
        rackParts.rounded('black', [0.055, 0.055, 0.018], [x, stackHeight / 2 - U / 2 - u * U + offset, 2.36], 0.008, [0, 0, 0], 'plastic');
      }
    }
  }
  // Removable side covers have an inset border, rear ventilation and captive hardware.
  for (const x of [-2.46, 2.46]) {
    rackParts.rounded('black', [0.008, height - 1.0, 3.95], [x, -0.03, -0.07], 0.02, [0, 0, 0], 'plastic');
    rackParts.rounded('frame', [0.012, height - 1.08, 3.86], [x * 1.001, -0.03, -0.07], 0.02);
    for (let v = 0; v < 24; v++) {
      rackParts.box('black', [0.018, 0.035, 1.8], [x * 1.004, -half + 1.0 + v * 0.1, -0.57], [0, 0, 0], 'plastic');
    }
    for (const z of [-1.77, 1.65]) {
      rackParts.rounded('black', [0.44, 0.2, 0.63], [x * 0.84, -half - 0.1, z], 0.06, [0, 0, 0], 'plastic');
    }
  }
  rackParts.box('black', [4.5, stackHeight + 0.1, 0.06], [0, 0, -2.28], [0, 0, 0], 'plastic');
  for (let v = 0; v < 21; v++) rackParts.rounded('black', [0.065, 0.014, 2.2], [-1.4 + v * 0.14, half + 0.007, -0.1], 0.016, [0, 0, 0], 'plastic');
  rackParts.finish();
  texturePlane(rack, 4.34, 0.21, [0, half - 0.24, 2.428], g => {
    g.text('CHRISTIAN NUCIFORA / PROJECTS', -1.97, 0, 0.077, '#c0c9c5');
    g.text(`${totalU}U`, 1.99, 0, 0.075, '#9eaaa4', 'right');
    g.rect(1.58, 0, 0.035, 0.035, '#a5c9a6', 0.01);
  });
  for (const side of [-1, 1]) {
    texturePlane(rack, 0.11, stackHeight, [side * 2.365, 0, 2.371], g => {
      for (let u = 0; u < totalU; u++) g.text(String(totalU - u).padStart(2, '0'), 0, stackHeight / 2 - U / 2 - u * U, 0.053, '#9eaaa9', 'center');
    }, [0, 0, 0], 64);
  }

  const bays = [];
  const interiors = [];
  const hitTargets = [];
  // Separate targets let the scene enable project links only after extraction and focus finish.
  const projectLinkTargets = [];
  const highlights = [];
  const slotY = [];
  const heights = [];
  let usedU = 0;
  for (let index = 0; index < units.length; index++) {
    const unit = units[index];
    const h = unit.u * U - 0.025;
    const y = stackHeight / 2 - usedU * U - unit.u * U / 2;
    usedU += unit.u;
    slotY.push(y);
    heights.push(h);
    const bay = new THREE.Group();
    bay.position.y = y;
    rack.add(bay);
    bays.push(bay);
    const parts = batch(bay);
    const inside = new THREE.Group();
    inside.visible = false;
    bay.add(inside);
    interiors.push(inside);
    const bottom = -h / 2 + 0.045;
    const caseHeight = Math.min(h, Math.max(0.2, h - 0.05));
    parts.rounded('darkSilver', [4.19, 0.048, 4.25], [0, bottom, 0.075], 0.025);
    parts.rounded('darkSilver', [0.045, caseHeight, 4.2], [-2.05, -0.01, 0.075], 0.015);
    parts.rounded('darkSilver', [0.045, caseHeight, 4.2], [2.05, -0.01, 0.075], 0.015);
    parts.rounded('darkSilver', [4.12, caseHeight, 0.05], [0, -0.01, -2.0], 0.018);
    const holes = [];
    const paintCommands = [];
    const raisedPaintCommands = [];
    const cut = (x, py, w, ph, r = 0.01) => holes.push({ x, y: py, width: w, height: ph, radius: r });
    const display = (x, py, w, ph, content) => {
      cut(x, py, w, ph, 0.018);
      parts.rounded('black', [w + 0.035, ph + 0.035, 0.09], [x, py, FACE_Z - 0.055], 0.022, [0, 0, 0], 'plastic');
      paintCommands.push(g => { g.rect(x, py, w - 0.012, ph - 0.012, '#0b1518', 0.008); content(g, x, py, w, ph); });
    };
    const led = (x, py, color = 'green') => {
      parts.cylinder('black', 0.025, 0.015, [x, py, FACE_Z + 0.05], [Math.PI / 2, 0, 0], 12, 'plastic');
      parts.cylinder(color, 0.013, 0.018, [x, py, FACE_Z + 0.065], [Math.PI / 2, 0, 0], 12, 'light');
    };
    const rj45 = (x, py, w = 0.2, ph = 0.13) => {
      cut(x, py, w, ph, 0.008);
      parts.box('black', [w + 0.01, ph + 0.015, 0.065], [x, py, FACE_Z - 0.055], [0, 0, 0], 'plastic');
      for (const side of [-1, 1]) {
        parts.box('darkSilver', [0.012, ph - 0.008, 0.055], [x + side * (w / 2 - 0.009), py, FACE_Z - 0.005]);
        parts.box('darkSilver', [w - 0.012, 0.012, 0.055], [x, py + side * (ph / 2 - 0.008), FACE_Z - 0.005]);
      }
      for (let pin = 0; pin < 6; pin++) parts.box('trace', [0.008, 0.026, 0.04], [x - w * 0.3 + pin * w * 0.12, py + ph * 0.19, FACE_Z - 0.01]);
      parts.box('rubber', [w * 0.38, ph * 0.19, 0.015], [x, py - ph * 0.39, FACE_Z - 0.016], [0, 0, 0], 'plastic');
    };
    const sfp = (x, py) => {
      cut(x, py, 0.24, 0.115, 0.008);
      parts.rounded('black', [0.25, 0.12, 0.08], [x, py, FACE_Z - 0.05], 0.01, [0, 0, 0], 'plastic');
      parts.box('silver', [0.21, 0.018, 0.045], [x, py - 0.042, FACE_Z + 0.012]);
      parts.box('orange', [0.14, 0.025, 0.023], [x, py - 0.033, FACE_Z + 0.039]);
    };
    const bnc = (x, py) => {
      parts.cylinder('darkSilver', 0.059, 0.035, [x, py, FACE_Z + 0.058]);
      parts.cylinder('silver', 0.045, 0.11, [x, py, FACE_Z + 0.12]);
      parts.cylinder('black', 0.027, 0.006, [x, py, FACE_Z + 0.177], [Math.PI / 2, 0, 0], 16, 'plastic');
      parts.cylinder('trace', 0.009, 0.008, [x, py, FACE_Z + 0.182]);
      for (const dx of [-1, 1]) parts.box('silver', [0.02, 0.027, 0.045], [x + dx * 0.043, py, FACE_Z + 0.11]);
    };
    const vents = (x, py, w, ph, columns, rows, color = 'black') => {
      const cellX = w / columns;
      const cellY = ph / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const px = x - w / 2 + cellX * (col + 0.5);
          const vy = py - ph / 2 + cellY * (row + 0.5);
          cut(px, vy, cellX * 0.62, cellY * 0.42, 0.013);
        }
      }
      parts.box(color, [w + 0.04, ph + 0.02, 0.03], [x, py, FACE_Z - 0.075], [0, 0, 0], 'plastic');
    };
    const button = (x, py, w = 0.14, ph = 0.13, color = 'rubber') => {
      parts.rounded('black', [w + 0.024, ph + 0.024, 0.03], [x, py, FACE_Z + 0.042], 0.022, [0, 0, 0], 'plastic');
      parts.rounded(color, [w, ph, 0.045], [x, py, FACE_Z + 0.07], 0.018, [0, 0, 0], color === 'green' || color === 'orange' ? 'light' : 'plastic');
    };
    const lightFace = ['network', 'router', 'instrument', 'audio', 'appliance', 'storage', 'utility'].includes(unit.type);
    const faceColor = unit.type === 'compute' ? 'graphite' : lightFace ? 'silver' : 'frame';
    const ink = lightFace ? '#333e43' : '#c3ccc7';
    const faceLabel = (text, x, py, size = 0.07, align = 'left') => paintCommands.push(g => g.text(text, x, py, size, ink, align));

    if (unit.type === 'network') {
      display(-1.57, 0, 0.42, 0.225, (g, x, py) => {
        g.text('CI', x, py + 0.042, 0.07, '#d3e8df', 'center');
        g.text('RUNNERS', x, py - 0.052, 0.036, '#92b8a7', 'center');
      });
      for (let col = 0; col < 24; col++) rj45(-1.2 + col * 0.12, -0.044, 0.102, 0.095);
      for (let col = 0; col < 24; col++) faceLabel(String(col + 1), -1.2 + col * 0.12, -0.126, 0.025, 'center');
      sfp(1.81, -0.038);
      faceLabel('CI RUNNER', -1.19, 0.106, 0.05);
      led(-1.92, 0.09);
      led(-1.92, -0.02, 'orange');
    } else if (unit.type === 'router') {
      for (let col = 0; col < 4; col++) sfp(-1.64 + col * 0.32, -0.023);
      display(0.06, 0, 0.96, 0.23, (g, x, py) => {
        g.text('ARTIFACTS', x - 0.41, py + 0.05, 0.058, '#d4e8dc');
        g.text('SELF-HOSTED PUBLISHING', x - 0.41, py - 0.054, 0.037, '#9bada3');
      });
      vents(1.18, 0, 0.94, 0.21, 12, 2);
      led(1.89, 0.06);
      parts.cylinder('rubber', 0.049, 0.04, [1.89, -0.063, FACE_Z + 0.067], [Math.PI / 2, 0, 0], 20, 'plastic');
    } else if (unit.type === 'instrument') {
      faceLabel('NVIM / STM32', -1.8, h / 2 - 0.09, 0.075);
      display(-0.97, -0.02, 1.44, 0.39, (g, x, py, w) => {
        g.text('FIRMWARE TOOLS', x - w / 2 + 0.07, py + 0.127, 0.057, '#c4d2c8');
        g.line([[x - 0.64, py + 0.045], [x + 0.64, py + 0.045]], '#384942', 0.006);
        g.text('BUILD / FLASH', x - w / 2 + 0.07, py - 0.025, 0.06, '#b0c5b8');
        g.text('ST-LINK / UART', x - w / 2 + 0.07, py - 0.134, 0.043, '#8caaa1');
      });
      for (let port = 0; port < 3; port++) bnc(0.14 + port * 0.3, -0.17);
      knob(parts, 1.36, 0.018, 0.17);
      for (let b = 0; b < 3; b++) button(0.12 + b * 0.28, 0.14, 0.15, 0.105, b === 0 ? 'green' : 'rubber');
      faceLabel('BUILD / FLASH', 1.36, -0.24, 0.052, 'center');
      led(1.83, 0.22);
    } else if (unit.type === 'control') {
      display(-1.19, 0.02, 1.05, 0.39, (g, x, py, w) => {
        g.text('MOZAPROXY', x - w / 2 + 0.07, py + 0.105, 0.055, '#c8dcd3');
        g.text('WHEEL SETTINGS', x - w / 2 + 0.07, py - 0.009, 0.045, '#80a7a2');
        g.text('INPUT MONITOR', x - w / 2 + 0.07, py - 0.114, 0.043, '#d5b693');
      });
      for (let row = 0; row < 2; row++) for (let col = 0; col < 6; col++) button(-0.22 + col * 0.235, 0.13 - row * 0.265, 0.15, 0.17, row === 1 && col === 3 ? 'orange' : col === 0 ? 'green' : 'rubber');
      knob(parts, 1.59, 0, 0.165, 'darkSilver');
      faceLabel('MOZAPROXY', -1.76, h / 2 - 0.085, 0.068);
      faceLabel('WHEEL CONTROL', 1.18, -h / 2 + 0.075, 0.044, 'center');
    } else if (unit.type === 'compute') {
      faceLabel('M1 / LANGUAGE TOOLCHAIN', -1.68, h / 2 - 0.155, 0.096);
      display(-0.95, h / 2 - 0.49, 1.42, 0.29, (g, x, py) => {
        g.text('M1 TOOLCHAIN', x - 0.63, py + 0.065, 0.056, '#d0d9cd');
        g.text('15 MODULES / RUST / LUA', x - 0.63, py - 0.064, 0.043, '#8eb3a2');
      });
      for (let i = 0; i < 3; i++) rj45(0.43 + i * 0.36, h / 2 - 0.5, 0.23, 0.15);
      led(1.6, h / 2 - 0.45, 'orange');
      led(1.6, h / 2 - 0.58);
      // Fifteen shallow cartridges make the language ecosystem one substantial 6U assembly.
      for (let row = 0; row < 5; row++) {
        for (let column = 0; column < 3; column++) {
          const x = -1.16 + column * 1.16;
          const cy = 0.28 - row * 0.313;
          const moduleIndex = row * 3 + column;
          parts.rounded('black', [1.095, 0.291, 0.07], [x, cy, FACE_Z + 0.053], 0.025, [0, 0, 0], 'plastic');
          parts.rounded(column === 1 ? 'edge' : 'graphite', [1.067, 0.269, 0.065], [x, cy, FACE_Z + 0.092], 0.018);
          for (let slit = 0; slit < 7; slit++) parts.rounded('black', [0.083, 0.041, 0.008], [x - 0.392 + slit * 0.127, cy + 0.053, FACE_Z + 0.13], 0.015, [0, 0, 0], 'plastic');
          parts.rounded('darkSilver', [0.72, 0.037, 0.068], [x - 0.036, cy - 0.023, FACE_Z + 0.171], 0.014);
          parts.rounded('orange', [0.101, 0.049, 0.042], [x + 0.421, cy - 0.02, FACE_Z + 0.178], 0.013);
          led(x - 0.463, cy - 0.029, moduleIndex % 4 === 0 ? 'orange' : 'green');
          raisedPaintCommands.push(g => g.text(unit.modules?.[moduleIndex]?.id || `MODULE ${String(moduleIndex + 1).padStart(2, '0')}`, x, cy - 0.093, 0.034, '#c8ccc0', 'center'));
        }
      }
      handle(parts, -1.88, -0.03, h - 0.36, 'darkSilver');
      handle(parts, 1.88, -0.03, h - 0.36, 'darkSilver');
    } else if (unit.type === 'audio') {
      faceLabel('WAVELENGTH', -1.78, h / 2 - 0.095, 0.09);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
        const x = -1.5 + col * 0.49;
        const py = 0.2 - row * 0.42;
        knob(parts, x, py, 0.102, col === 0 && row === 1 ? 'orange' : 'silver');
        faceLabel(['GENRE', 'ARTIST', 'ALBUM', 'PLAYLIST'][col], x, py - 0.155, 0.042, 'center');
      }
      display(1.15, 0.035, 1.05, 0.65, (g, x, py) => {
        g.text('PLAYLISTS', x - 0.43, py + 0.235, 0.06, '#c6d2c7');
        const trackWidths = [0.53, 0.41, 0.58];
        for (let row = 0; row < 3; row++) {
          const rowY = py + 0.1 - row * 0.13;
          g.rect(x - 0.375, rowY, 0.1, 0.1, ['#9caa92', '#b39a7d', '#829b92'][row], 0.012);
          g.rect(x - 0.255 + trackWidths[row] / 2, rowY + 0.019, trackWidths[row], 0.021, '#9aafa2', 0.007);
          g.rect(x - 0.255 + 0.145, rowY - 0.022, 0.29, 0.013, '#496354', 0.005);
        }
        g.text('GENRES / ARTISTS', x - 0.43, py - 0.25, 0.041, '#8da397');
      });
      led(1.83, 0.36);
      bnc(1.8, -0.28);
    } else if (unit.type === 'display') {
      display(-0.32, 0.055, 2.69, 0.79, (g, x, py, w, ph) => {
        g.text('ISLET', x - w / 2 + 0.12, py + ph / 2 - 0.12, 0.075, '#d5e0d7');
        // Static top-edge activity sketch for the Islet screen.
        g.line([[x - 1.2, py + 0.19], [x + 1.2, py + 0.19]], '#394d44', 0.006);
        g.rect(x, py + 0.19, 0.63, 0.17, '#020607', 0.053);
        g.rect(x + 0.225, py + 0.2, 0.027, 0.027, '#30403b', 0.012);
        const activities = ['TIMER', 'MEDIA', 'FILES'];
        activities.forEach((title, i) => {
          const cx = x - 0.79 + i * 0.79;
          g.rect(cx, py - 0.065, 0.66, 0.245, '#1e2c27', 0.035);
          g.text(title, cx, py - 0.05, 0.057, '#bac8ba', 'center');
          g.line([[cx - 0.2, py - 0.121], [cx + 0.2, py - 0.121]], '#617b68', 0.01);
        });
        g.text('MACOS / TOP EDGE', x + 1.16, py - 0.29, 0.043, '#91a699', 'right');
      });
      knob(parts, 1.48, 0.11, 0.17, 'darkSilver');
      for (let i = 0; i < 3; i++) button(1.12 + i * 0.28, -0.31, 0.15, 0.1, i === 0 ? 'green' : 'rubber');
      led(1.84, 0.4);
      faceLabel('ISLET', -1.83, -0.47, 0.065);
    } else if (unit.type === 'console') {
      display(-0.13, 0.02, 2.91, 0.49, (g, x, py) => {
        g.text('cn.', x - 1.29, py + 0.07, 0.15, '#cfd9d1');
        g.text('CHRISTIAN NUCIFORA', x - 0.79, py + 0.105, 0.063, '#bdcabe');
        g.text('Software / hardware / systems', x - 0.79, py - 0.025, 0.049, '#829c91');
        g.line([[x - 0.78, py - 0.125], [x + 1.25, py - 0.125]], '#354943', 0.007);
      });
      knob(parts, 1.66, 0, 0.114, 'darkSilver');
      led(-1.87, 0.075);
      button(-1.87, -0.13, 0.09, 0.085);
      faceLabel('PERSONAL WEBSITE', -1.56, -h / 2 + 0.058, 0.05);
    } else if (unit.type === 'appliance') {
      for (let i = 0; i < 4; i++) rj45(-1.63 + i * 0.31, -0.005);
      display(0.48, 0, 1.27, 0.22, (g, x, py) => {
        g.text('RECONCILE', x - 0.55, py + 0.045, 0.057, '#bbd2c7');
        g.text('SHARED EXPENSES', x - 0.55, py - 0.052, 0.042, '#95ad9e');
        g.text('=', x + 0.45, py + 0.025, 0.13, '#b8ae8d', 'center');
      });
      vents(1.49, 0, 0.49, 0.22, 6, 2);
      led(-1.92, 0.05);
    } else if (unit.type === 'storage') {
      for (let drive = 0; drive < 4; drive++) {
        const x = -1.35 + drive * 0.83;
        parts.rounded('black', [0.76, 0.29, 0.06], [x, 0, FACE_Z + 0.05], 0.027, [0, 0, 0], 'plastic');
        parts.rounded('darkSilver', [0.7, 0.245, 0.055], [x, 0, FACE_Z + 0.088], 0.02);
        parts.rounded('silver', [0.53, 0.045, 0.06], [x, -0.065, FACE_Z + 0.14], 0.017);
        for (let slit = 0; slit < 6; slit++) parts.rounded('black', [0.052, 0.034, 0.008], [x - 0.25 + slit * 0.101, 0.04, FACE_Z + 0.121], 0.012, [0, 0, 0], 'plastic');
        led(x + 0.29, -0.01);
      }
      display(1.64, 0, 0.38, 0.2, (g, x, py) => {
        g.text('mountd', x, py + 0.035, 0.051, '#bacfc1', 'center');
        g.text('NFS/SMB', x, py - 0.043, 0.038, '#91b7a4', 'center');
      });
    } else if (unit.type === 'archive') {
      for (let drive = 0; drive < 2; drive++) {
        const x = -1.04 + drive * 1.47;
        cut(x, 0, 1.27, 0.22, 0.02);
        parts.rounded('black', [1.28, 0.23, 0.08], [x, 0, FACE_Z - 0.028], 0.02, [0, 0, 0], 'plastic');
        parts.rounded('edge', [1.17, 0.16, 0.025], [x, -0.012, FACE_Z + 0.01], 0.017);
        parts.box('black', [0.91, 0.023, 0.006], [x, 0.008, FACE_Z + 0.028], [0, 0, 0], 'plastic');
        parts.rounded('orange', [0.14, 0.027, 0.05], [x + 0.45, -0.035, FACE_Z + 0.057], 0.009);
      }
      display(1.55, 0, 0.51, 0.22, (g, x, py) => {
        g.text('ARCHIVE', x, py + 0.044, 0.045, '#bed5ca', 'center');
        g.text('ALBUMS', x, py - 0.05, 0.039, '#c9ac83', 'center');
      });
      led(-1.88, 0.05, 'orange');
    } else {
      display(-0.97, 0, 1.43, 0.23, (g, x, py) => {
        g.text('> SMALL UTILITIES', x - 0.63, py + 0.04, 0.054, '#b8cebe');
        g.text('SCRIPTS / SHORTCUTS', x - 0.63, py - 0.056, 0.04, '#86a797');
      });
      for (let i = 0; i < 3; i++) {
        cut(0.18 + i * 0.37, 0, 0.21, 0.092, 0.028);
        parts.rounded('black', [0.22, 0.105, 0.06], [0.18 + i * 0.37, 0, FACE_Z - 0.03], 0.03, [0, 0, 0], 'plastic');
        parts.rounded('darkSilver', [0.145, 0.028, 0.03], [0.18 + i * 0.37, 0, FACE_Z + 0.005], 0.012);
      }
      for (let i = 0; i < 3; i++) button(1.34 + i * 0.2, 0, 0.09, 0.09, i === 0 ? 'orange' : 'rubber');
    }

    // True apertures in the beveled faceplate leave the sockets and displays recessed.
    const panelShape = new THREE.Shape();
    roundedPath(panelShape, -2.115, -h / 2, 4.23, h, 0.025);
    holes.forEach(hole => {
      const path = new THREE.Path();
      roundedPath(path, hole.x - hole.width / 2, hole.y - hole.height / 2, hole.width, hole.height, hole.radius);
      panelShape.holes.push(path);
    });
    const panel = new THREE.ExtrudeGeometry(panelShape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 3 });
    parts.geometry(panel, faceColor, [0, 0, FACE_Z - 0.032]);
    for (const x of [-2.017, 2.017]) {
      if (unit.u === 1) screw(parts, x, 0, FACE_Z + 0.04, 0.027);
      else for (const py of [-h / 2 + 0.11, h / 2 - 0.11]) screw(parts, x, py, FACE_Z + 0.04, 0.031);
    }
    if (unit.type !== 'compute' && unit.u >= 3) {
      handle(parts, -1.93, 0, h - 0.27, 'darkSilver');
      handle(parts, 1.93, 0, h - 0.27, 'darkSilver');
    }
    // Side rails track the entire extracted assembly rather than floating between projects.
    for (const x of [-2.13, 2.13]) {
      parts.rounded('silver', [0.035, 0.055, 3.8], [x, bottom + 0.07, 0.09], 0.01);
      parts.box('edge', [0.021, 0.028, 3.3], [x * 1.01, bottom + 0.08, 0.08]);
    }

    createCover(inside, unit, index, h);
    parts.finish();
    texturePlane(bay, 4.2, h, [0, 0, FACE_Z + 0.041], g => paintCommands.forEach(paint => paint(g)));
    if (raisedPaintCommands.length) texturePlane(bay, 4.2, h, [0, 0, FACE_Z + 0.139], g => raisedPaintCommands.forEach(paint => paint(g)));
    const hitGeometry = new THREE.BoxGeometry(4.25, h, 0.18);
    geometries.add(hitGeometry);
    const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
    allMaterials.push(hitMaterial);
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.z = FACE_Z;
    hit.userData.index = index;
    bay.add(hit);
    hitTargets.push(hit);
    const highlightGeometry = roundedBox(0.026, Math.min(0.27, h - 0.08), 0.012, 0.01);
    geometries.add(highlightGeometry);
    const highlightMaterial = new THREE.MeshStandardMaterial({ color: '#c58352', metalness: 0.15, roughness: 0.6 });
    allMaterials.push(highlightMaterial);
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.position.set(-2.1, unit.u === 1 ? 0 : h / 2 - 0.2, FACE_Z + 0.06);
    highlight.visible = false;
    bay.add(highlight);
    highlights.push(highlight);
  }
  return {
    rack, bays, interiors, hitTargets, projectLinkTargets, highlights, slotY, heights, totalU, height,
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      allMaterials.forEach(material => material.dispose());
    },
  };
}
