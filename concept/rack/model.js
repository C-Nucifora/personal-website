import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { softwareUnits } from './catalog.js?v=20261018-front-row-v2';

export const U = 0.4;
export const FACE_Z = 2.31;
export const EXTRACTION = 4.42;
const CASE_WIDTH = 4.19;
const CASE_FRONT = FACE_Z - 0.01;
const CASE_REAR = -2.05;
const CASE_DEPTH = CASE_FRONT - CASE_REAR;
const CASE_Z = (CASE_FRONT + CASE_REAR) / 2;
const COLORS = {
  frame: '#37383a', edge: '#696b6e', silver: '#bfc2c5', bright: '#e2e3e5',
  darkSilver: '#888b8f', graphite: '#505052', black: '#141416', rubber: '#28282b',
  navy: '#344559', red: '#843f3d', cream: '#dedbd4', pcb: '#3b3b40', trace: '#bca17e', copper: '#ad7952', orange: '#dd8451', indicator: '#e4b17f',
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

export function createRackModel(renderer, units = softwareUnits, label = 'Software', detailScale = 1) {
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
    resolution = Math.max(64, Math.round(resolution * detailScale));
    surface.width = resolution;
    surface.height = Math.max(128, Math.round(resolution * height / width));
    const ctx = surface.getContext('2d');
    const sx = surface.width / width;
    const sy = surface.height / height;
    const graphic = {
      text(text, x, y, size = 0.075, color = '#d8d7d3', align = 'left', weight = 500, angle = 0) {
        ctx.font = `${weight} ${size * sy}px monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate((x + width / 2) * sx, (height / 2 - y) * sy);
        ctx.rotate(angle);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      },
      rect(x, y, w, h, color, radius = 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect((x - w / 2 + width / 2) * sx, (height / 2 - y - h / 2) * sy, w * sx, h * sy, radius * sx);
        ctx.fill();
      },
      line(points, color = '#c8a487', lineWidth = 0.007) {
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
    for (let tooth = 0; tooth < 16; tooth++) {
      const angle = tooth * Math.PI * 2 / 16;
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
    const width = CASE_WIDTH;
    const depth = CASE_DEPTH;
    const y = h / 2 - 0.05;
    const z = CASE_Z;
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
    for (const x of [-2.07, 2.07]) details.box(color, [0.035, 0.066, depth - 0.04], [x, y - 0.027, z]);
    details.box('black', [3.48, 0.004, 0.013], [0, y + 0.025, -1.565], [0, 0, 0], 'plastic');
    details.finish();

    const surface = document.createElement('canvas');
    surface.width = surface.height = Math.round(1024 * detailScale);
    const relief = document.createElement('canvas');
    relief.width = relief.height = surface.width;
    const colorContext = surface.getContext('2d');
    const bumpContext = relief.getContext('2d');
    colorContext.fillStyle = COLORS[color];
    colorContext.fillRect(0, 0, 1024, 1024);
    bumpContext.fillStyle = '#ffffff';
    bumpContext.fillRect(0, 0, 1024, 1024);
    const sx = surface.width / width;
    const sy = surface.height / depth;
    const text = (value, x, py, size, weight = 500) => {
      for (const [ctx, ink] of [[colorContext, painted ? '#c5c4c0' : '#303034'], [bumpContext, '#050505']]) {
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
    g.text(`CHRISTIAN NUCIFORA / ${label.toUpperCase()}`, -1.97, 0, 0.077, '#c9c8c4');
    g.text(`${totalU}U`, 1.99, 0, 0.075, '#aaa8a4', 'right');
    g.rect(1.58, 0, 0.035, 0.035, '#e4b17f', 0.01);
  });
  for (const side of [-1, 1]) {
    texturePlane(rack, 0.11, stackHeight, [side * 2.365, 0, 2.371], g => {
      for (let u = 0; u < totalU; u++) g.text(String(totalU - u).padStart(2, '0'), 0, stackHeight / 2 - U / 2 - u * U, 0.053, '#aaa8a4', 'center');
    }, [0, 0, 0], 64);
  }

  const bays = [];
  const interiors = [];
  const hitTargets = [];
  // Separate targets let the scene enable project links only after extraction and focus finish.
  const projectLinkTargets = [];
  const moduleAssemblies = [];
  const moduleTargets = [];
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
    inside.visible = true;
    bay.add(inside);
    interiors.push(inside);
    const bottom = -h / 2 + 0.047;
    const caseHeight = h - 0.069;
    // Folded sheets overlap at their joins and meet the back of the faceplate.
    parts.box('darkSilver', [CASE_WIDTH, 0.054, CASE_DEPTH], [0, bottom, CASE_Z]);
    for (const x of [-2.068, 2.068]) parts.box('darkSilver', [0.054, caseHeight, CASE_DEPTH], [x, -0.0125, CASE_Z]);
    parts.box('darkSilver', [CASE_WIDTH, caseHeight, 0.055], [0, -0.0125, CASE_REAR + 0.0275]);
    const holes = [];
    const paintCommands = [];
    const raisedPaintCommands = [];
    const cut = (x, py, w, ph, r = 0.01) => holes.push({ x, y: py, width: w, height: ph, radius: r });
    const display = (x, py, w, ph, content) => {
      cut(x, py, w, ph, 0.018);
      parts.rounded('black', [w + 0.035, ph + 0.035, 0.09], [x, py, FACE_Z - 0.055], 0.022, [0, 0, 0], 'plastic');
      paintCommands.push(g => { g.rect(x, py, w - 0.012, ph - 0.012, '#101013', 0.008); content(g, x, py, w, ph); });
    };
    const led = (x, py, color = 'indicator') => {
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
      for (let pin = 0; pin < 8; pin++) parts.box('trace', [0.006, 0.026, 0.04], [x - w * 0.33 + pin * w * 0.094, py + ph * 0.19, FACE_Z - 0.01]);
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
      parts.rounded(color, [w, ph, 0.045], [x, py, FACE_Z + 0.07], 0.018, [0, 0, 0], color === 'indicator' || color === 'orange' ? 'light' : 'plastic');
    };
    const lightFace = ['network', 'router', 'instrument', 'appliance'].includes(unit.type);
    const faceColor = unit.type === 'audio' ? 'navy' : unit.type === 'compute' ? 'silver' : lightFace ? 'silver' : 'frame';
    const ink = lightFace || unit.type === 'compute' ? '#37383c' : '#cccac5';
    const faceLabel = (text, x, py, size = 0.07, align = 'left') => paintCommands.push(g => g.text(text, x, py, size, ink, align));
    const usb = (x, py) => {
      cut(x, py, 0.14, 0.065, 0.007);
      parts.box('black', [0.148, 0.074, 0.07], [x, py, FACE_Z - 0.04], [0, 0, 0], 'plastic');
      parts.box('navy', [0.105, 0.021, 0.035], [x, py - 0.008, FACE_Z - 0.003], [0, 0, 0], 'plastic');
    };
    const jack = (x, py) => {
      cut(x, py, 0.068, 0.068, 0.034);
      parts.cylinder('black', 0.034, 0.035, [x, py, FACE_Z - 0.02], [Math.PI / 2, 0, 0], 16, 'plastic');
      parts.torus('silver', 0.033, 0.009, [x, py, FACE_Z + 0.035]);
    };

    if (unit.type === 'network') {
      // USW-Pro-24: an empty left half, two rows of twelve, then stacked uplinks.
      display(-1.76, 0, 0.24, 0.245, (g, x, py) => {
        g.text('CI', x, py + 0.035, 0.072, '#e6e4de', 'center');
        g.text('RUNNERS', x, py - 0.064, 0.025, '#b4b0a9', 'center');
      });
      faceLabel('CI RUNNER', -1.39, -0.085, 0.075);
      for (let col = 0; col < 12; col++) for (let row = 0; row < 2; row++) {
        const x = -0.67 + col * 0.198;
        const py = 0.077 - row * 0.154;
        rj45(x, py, 0.174, 0.119);
      }
      for (let row = 0; row < 2; row++) sfp(1.79, 0.076 - row * 0.153);
      parts.box('black', [3.2, 0.012, 0.008], [0.12, 0.167, FACE_Z + 0.035], [0, 0, 0], 'plastic');
    } else if (unit.type === 'router') {
      // UDM Pro: removable drive drawer separates the LCM from a compact 2x4 switch.
      display(-1.77, 0, 0.23, 0.24, (g, x, py) => {
        g.text('A', x, py + 0.024, 0.092, '#e6e4de', 'center');
        g.text('ARTIFACTS', x, py - 0.072, 0.022, '#b0ada7', 'center');
      });
      cut(-0.53, -0.007, 1.48, 0.26, 0.012);
      parts.rounded('black', [1.49, 0.27, 0.07], [-0.53, -0.007, FACE_Z - 0.04], 0.012, [0, 0, 0], 'plastic');
      parts.rounded('silver', [1.44, 0.234, 0.045], [-0.53, -0.007, FACE_Z + 0.006], 0.01);
      parts.cylinder('black', 0.011, 0.008, [0.09, -0.007, FACE_Z + 0.034], [Math.PI / 2, 0, 0], 12, 'plastic');
      for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) rj45(0.53 + col * 0.202, 0.075 - row * 0.152, 0.174, 0.116);
      rj45(1.42, -0.073, 0.18, 0.117);
      sfp(1.77, 0.075); sfp(1.77, -0.077);
      faceLabel('ARTIFACT', -1.42, 0.052, 0.061);
      faceLabel('PUBLISHING', -1.42, -0.054, 0.039);
    } else if (unit.type === 'engineering') {
      // Illustrative test enclosure, not a reproduction of a project circuit board.
      faceLabel(unit.faceTitle || unit.title, -1.77, h / 2 - 0.2, 0.095);
      faceLabel('UQ RACING / TEAM ENGINEERING', -1.77, h / 2 - 0.4, 0.045);
      display(-0.54, 0.14, 2.35, Math.min(1.45, h - 0.9), (g, x, py, w, ph) => {
        g.text(unit.subtitle.toUpperCase(), x - w / 2 + 0.15, py + ph / 2 - 0.18, 0.068, '#d8d7d3');
        g.line([[x - 0.92, py + 0.17], [x - 0.1, py + 0.17], [x - 0.1, py - 0.24], [x + 0.86, py - 0.24]], '#c8a487', 0.018);
        for (const dx of [-0.73, 0.04, 0.75]) {
          g.rect(x + dx, py - 0.04, 0.28, 0.25, '#6e717a', 0.02);
          g.rect(x + dx, py - 0.04, 0.19, 0.15, '#202126', 0.01);
        }
        g.text('ELECTRICAL SYSTEMS', x, py - ph / 2 + 0.14, 0.049, '#b5b1ab', 'center');
      });
      for (const py of [-0.39, 0.12, 0.63]) {
        parts.rounded('rubber', [0.78, 0.34, 0.06], [1.25, py, FACE_Z + 0.08], 0.04, [0, 0, 0], 'plastic');
        for (const dx of [-0.18, 0, 0.18]) bnc(1.25 + dx, py);
      }
      handle(parts, -1.96, 0, h - 0.4, 'darkSilver');
      handle(parts, 1.96, 0, h - 0.4, 'darkSilver');
    } else if (unit.type === 'record') {
      // Document drawers hold roles, education and explicitly reserved content.
      faceLabel(unit.faceTitle || unit.title, -1.68, h / 2 - 0.24, 0.12);
      faceLabel(unit.subtitle, -1.68, h / 2 - 0.49, 0.056);
      parts.rounded('black', [2.55, 0.22, 0.06], [0, -h / 2 + 0.35, FACE_Z + 0.06], 0.04, [0, 0, 0], 'plastic');
      parts.rounded('darkSilver', [1.9, 0.055, 0.12], [0, -h / 2 + 0.34, FACE_Z + 0.11], 0.025);
      if (unit.placeholder) faceLabel('SPACE RESERVED', -1.68, 0, 0.075);
    } else if (unit.type === 'instrument') {
      // Bench instrument function groups adapted into a 2U rack adapter.
      parts.rounded('rubber', [3.64, h - 0.09, 0.045], [0, 0, FACE_Z + 0.016], 0.045, [0, 0, 0], 'plastic');
      display(-0.99, 0.025, 1.5, 0.425, (g, x, py, w) => {
        g.text('NVIM / STM32', x - w / 2 + 0.065, py + 0.137, 0.058, '#d8d6d0');
        g.text('BUILD', x - 0.64, py + 0.012, 0.06, '#dfb58b');
        g.text('FLASH', x - 0.64, py - 0.101, 0.06, '#cbc5bc');
        g.line([[x - 0.15, py - 0.09], [x - 0.15, py + 0.055], [x + 0.12, py + 0.055], [x + 0.12, py - 0.06], [x + 0.38, py - 0.06]], '#c3a182', 0.012);
        g.text('ST-LINK / UART', x - 0.11, py + 0.137, 0.038, '#b5b1ab');
      });
      for (let i = 0; i < 5; i++) button(-1.6 + i * 0.3, -0.253, 0.18, 0.062);
      for (let i = 0; i < 3; i++) button(-0.08, 0.17 - i * 0.14, 0.115, 0.072);
      for (const x of [0.28, 0.78]) {
        knob(parts, x, 0.173, 0.066, 'darkSilver');
        knob(parts, x, -0.035, 0.09, 'darkSilver');
      }
      for (let i = 0; i < 3; i++) button(1.12 + i * 0.21, 0.2, 0.145, 0.085, i === 0 ? 'indicator' : 'cream');
      for (let i = 0; i < 3; i++) button(1.12 + i * 0.21, 0.055, 0.145, 0.072);
      for (let i = 0; i < 3; i++) {
        const x = 0.37 + i * 0.54;
        parts.rounded(['orange', 'indicator', 'navy'][i], [0.21, 0.127, 0.013], [x, -0.237, FACE_Z + 0.044], 0.018, [0, 0, 0], 'plastic');
        bnc(x, -0.237);
      }
      usb(-1.78, -0.26);
      faceLabel('FIRMWARE WORKBENCH', -1.68, h / 2 - 0.046, 0.041);
    } else if (unit.type === 'control') {
      // Videohub anatomy: dense labelled key matrix, four routing keys, LCD, jog dial.
      faceLabel('MOZAPROXY', -1.8, 0.253, 0.088);
      faceLabel('WHEEL CONTROL', -1.8, 0.117, 0.045);
      const keyLabels = ['FFB', 'DAMP', 'FRIC', 'INRT', 'SPR', 'GAIN', 'ROT', 'BRAKE', 'THROT', 'CLUTCH', 'AXIS', 'INPUT'];
      for (let row = 0; row < 2; row++) for (let col = 0; col < 6; col++) {
        const x = -0.65 + col * 0.221; const py = 0.125 - row * 0.255;
        button(x, py, 0.184, 0.211, row === 0 && col === 0 ? 'orange' : 'cream');
        raisedPaintCommands.push(g => g.text(keyLabels[row * 6 + col], x, py, 0.034, '#303033', 'center'));
      }
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) button(0.85 + col * 0.22, 0.125 - row * 0.255, 0.17, 0.205, row === 1 && col === 1 ? 'orange' : 'cream');
      display(1.39, 0.043, 0.37, 0.34, (g, x, py) => {
        g.text('WHEEL', x, py + 0.082, 0.038, '#d8d6d0', 'center');
        g.line([[x - 0.13, py - 0.055], [x + 0.13, py - 0.055]], '#a6a29b', 0.016);
      });
      knob(parts, 1.79, 0.02, 0.135, 'darkSilver');
      for (let i = 0; i < 3; i++) button(1.79, 0.27 - i * 0.253, 0.083, 0.058);
    } else if (unit.type === 'compute') {
      // A 6U Eurocard subrack, not disk drawers. Each repository has a tall plug-in panel.
      faceLabel('M1 / LANGUAGE TOOLCHAIN', -1.68, h / 2 - 0.095, 0.075);
      cut(0, -0.015, 3.5, h - 0.42, 0.008);
      parts.box('pcb', [3.57, h - 0.35, 0.065], [0, -0.015, -0.7], [0, 0, 0], 'board');
      for (const py of [-h / 2 + 0.15, h / 2 - 0.15]) {
        parts.box('darkSilver', [3.55, 0.075, 0.12], [0, py, FACE_Z + 0.035]);
        parts.box('black', [3.5, 0.014, 0.006], [0, py, FACE_Z + 0.1], [0, 0, 0], 'plastic');
      }
      const modules = ['Language tools', 'Editor integration', 'Project tools'].flatMap(group => unit.modules.filter(module => module.group === group));
      modules.forEach((module, moduleIndex) => {
        const x = -1.6 + moduleIndex * (3.2 / 14);
        const tint = moduleIndex < 7 ? 'silver' : moduleIndex < 9 ? 'darkSilver' : 'bright';
        const bladeH = h - 0.53;
        const bladeY = -0.015;
        const sled = new THREE.Group();
        sled.name = module.id;
        sled.position.x = x;
        bay.add(sled);
        const sledParts = batch(sled);
        // Narrow closed carriers slide between stationary upper and lower guides.
        sledParts.rounded('darkSilver', [0.185, bladeH - 0.15, 2.9], [0, bladeY, FACE_Z + 0.04 - 1.45], 0.008);
        sledParts.box(tint, [0.213, bladeH, 0.065], [0, bladeY, FACE_Z + 0.068]);
        for (const py of [-bladeH / 2 + 0.075, bladeH / 2 - 0.075]) screw(sledParts, 0, py + bladeY, FACE_Z + 0.107, 0.018);
        sledParts.rounded('black', [0.13, 0.23, 0.055], [0, -bladeH / 2 + 0.24, FACE_Z + 0.115], 0.017, [0, 0, 0], 'plastic');
        sledParts.rounded(moduleIndex < 7 ? 'navy' : moduleIndex < 9 ? 'orange' : 'graphite', [0.075, 0.135, 0.09], [0, -bladeH / 2 + 0.205, FACE_Z + 0.157], 0.014, [0.1, 0, 0], 'plastic');
        if (moduleIndex === 0 || moduleIndex === 7 || moduleIndex === 9) sledParts.box(moduleIndex === 7 ? 'orange' : 'navy', [0.14, 0.035, 0.008], [0, bladeH / 2 - 0.16, FACE_Z + 0.108], [0, 0, 0], 'plastic');
        sledParts.box('rubber', [0.145, bladeH - 0.21, 0.055], [0, bladeY, FACE_Z + 0.04 - 2.88], [0, 0, 0], 'plastic');
        sledParts.finish();
        texturePlane(sled, 0.2, bladeH - 0.29, [0, 0.06, FACE_Z + 0.104], g => {
          g.text(module.id, 0, 0, 0.046, moduleIndex < 7 ? '#303238' : moduleIndex < 9 ? '#eeece7' : '#383a40', 'center', 500, -Math.PI / 2);
        }, [0, 0, 0], 128);
        for (const sign of [-1, 1]) {
          parts.box('black', [0.21, 0.032, 2.96], [x, bladeY + sign * (bladeH / 2 - 0.035), FACE_Z - 1.49], [0, 0, 0], 'plastic');
          parts.box('darkSilver', [0.045, 0.045, 0.15], [x, bladeY + sign * (bladeH / 2 - 0.035), -0.62]);
        }
        const targetGeometry = new THREE.BoxGeometry(0.213, bladeH, 0.18);
        geometries.add(targetGeometry);
        const targetMaterial = new THREE.MeshBasicMaterial({ visible: false });
        allMaterials.push(targetMaterial);
        const hitTarget = new THREE.Mesh(targetGeometry, targetMaterial);
        hitTarget.position.set(0, bladeY, FACE_Z + 0.12);
        hitTarget.userData = { index: moduleIndex, projectIndex: index, moduleId: module.id };
        sled.add(hitTarget);
        moduleAssemblies.push({ projectIndex: index, index: moduleIndex, moduleId: module.id, group: sled, hitTarget });
        moduleTargets.push(hitTarget);
      });
      faceLabel('LANGUAGE', -0.915, -h / 2 + 0.061, 0.049, 'center');
      faceLabel('EDITOR', 0.115, -h / 2 + 0.061, 0.042, 'center');
      faceLabel('PROJECT TOOLS', 1.03, -h / 2 + 0.061, 0.046, 'center');
      handle(parts, -1.88, -0.03, h - 0.36, 'darkSilver');
      handle(parts, 1.88, -0.03, h - 0.36, 'darkSilver');
    } else if (unit.type === 'audio') {
      // Portico II's repeated control groups and stepped colour knobs, adapted to 3U.
      faceLabel('WAVELENGTH', -1.77, 0.46, 0.09);
      const controls = ['GENRE', 'ARTIST', 'ALBUM', 'PLAYLIST'];
      for (let group = 0; group < 2; group++) {
        const cx = -1.16 + group * 1.29;
        paintCommands.push(g => g.line([[cx - 0.59, 0.34], [cx + 0.59, 0.34], [cx + 0.59, -0.43], [cx - 0.59, -0.43], [cx - 0.59, 0.34]], '#a9adb3', 0.008));
        for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
          const x = cx - 0.32 + col * 0.62; const py = 0.205 - row * 0.252;
          knob(parts, x, py, row === 1 ? 0.078 : 0.092, row === 0 ? 'navy' : row === 1 ? 'cream' : 'red');
          faceLabel(controls[(group * 2 + col) % 4], x, py - 0.135, 0.033, 'center');
          paintCommands.push(g => {
            const points = Array.from({ length: 15 }, (_, i) => { const a = (-0.75 + i / 14 * 1.5) * Math.PI; return [x + Math.sin(a) * 0.125, py + Math.cos(a) * 0.125]; });
            g.line(points, '#afb1b7', 0.007);
          });
        }
        for (let row = 0; row < 2; row++) led(cx, 0.17 - row * 0.5, row ? 'orange' : 'indicator');
      }
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) knob(parts, 1.05 + col * 0.47, 0.2 - row * 0.47, 0.1, 'navy');
      faceLabel('SELECTION', 1.29, 0.42, 0.043, 'center');
      faceLabel('APPLE MUSIC', 1.29, -0.47, 0.043, 'center');
      display(1.79, -0.015, 0.2, 0.64, (g, x, py) => {
        for (let column = 0; column < 4; column++) for (let segment = 0; segment < 15; segment++) g.rect(x - 0.067 + column * 0.045, py - 0.25 + segment * 0.036, 0.025, 0.022, '#48484d', 0.003);
      });
      for (let row = 0; row < 2; row++) button(1.05 + row * 0.47, -0.035, 0.09, 0.07, row ? 'orange' : 'cream');
    } else if (unit.type === 'display') {
      // SmartView Duo is a pair of 3U monitor windows with almost no front controls.
      for (let screen = 0; screen < 2; screen++) display(-0.88 + screen * 1.76, 0.015, 1.61, 0.87, (g, x, py, w, ph) => {
        g.rect(x, py, w - 0.015, ph - 0.015, '#1d1d20', 0.005);
        if (!screen) {
          g.text('ISLET', x - 0.68, py + 0.312, 0.068, '#e0ddd7');
          g.line([[x - 0.7, py + 0.195], [x + 0.7, py + 0.195]], '#626267', 0.009);
          g.rect(x, py + 0.191, 0.57, 0.16, '#070709', 0.05);
          g.rect(x + 0.203, py + 0.2, 0.023, 0.023, '#404044', 0.01);
          g.text('MACOS / TOP EDGE', x, py - 0.29, 0.041, '#aaa7a1', 'center');
          g.rect(x, py - 0.055, 1.22, 0.24, '#333336', 0.05);
          g.text('TIMERS  /  MEDIA', x, py - 0.05, 0.061, '#d2cec5', 'center');
        } else {
          g.text('FILES', x - 0.67, py + 0.31, 0.056, '#d9d6cf');
          for (let row = 0; row < 3; row++) {
            const ry = py + 0.13 - row * 0.18;
            g.rect(x - 0.54, ry, 0.16, 0.12, '#9b9690', 0.014);
            g.rect(x + 0.035, ry + 0.024, 0.76 - row * 0.13, 0.023, '#c2bdb4', 0.004);
            g.rect(x - 0.125, ry - 0.03, 0.44, 0.014, '#737278', 0.004);
          }
          g.text('DRAG / DROP', x + 0.67, py - 0.32, 0.041, '#aaa7a1', 'right');
        }
      });
      faceLabel('ISLET / MACOS', -1.71, -0.49, 0.049);
      parts.rounded('black', [0.23, 0.026, 0.012], [0, 0.516, FACE_Z + 0.041], 0.008, [0, 0, 0], 'plastic');
    } else if (unit.type === 'console') {
      // Closed KVM drawer: a broad pull bar and latch replace the implausible front LCD.
      cut(0, 0.025, 3.49, h - 0.23, 0.025);
      parts.rounded('black', [3.53, h - 0.19, 0.08], [0, 0.025, FACE_Z - 0.02], 0.03, [0, 0, 0], 'plastic');
      parts.rounded('graphite', [3.43, h - 0.27, 0.055], [0, 0.025, FACE_Z + 0.018], 0.02);
      parts.rounded('black', [1.35, 0.17, 0.02], [0, -0.044, FACE_Z + 0.06], 0.055, [0, 0, 0], 'plastic');
      parts.rounded('darkSilver', [1.21, 0.065, 0.12], [0, -0.044, FACE_Z + 0.13], 0.025);
      parts.rounded('orange', [0.16, 0.08, 0.025], [1.49, -0.045, FACE_Z + 0.065], 0.014, [0, 0, 0], 'plastic');
      raisedPaintCommands.push(g => g.text('CHRISTIAN NUCIFORA / PERSONAL WEBSITE', -1.45, 0.164, 0.058, '#cccac5'));
      faceLabel('CONSOLE DRAWER', -1.64, -0.293, 0.043);
      usb(-1.64, -0.25);
    } else if (unit.type === 'appliance') {
      // Netgate-style shallow firewall: vented blank left, grouped I/O at right.
      faceLabel('RECONCILE', -1.73, 0.062, 0.075);
      faceLabel('SHARED EXPENSES', -1.73, -0.065, 0.043);
      vents(-0.47, 0.005, 0.8, 0.23, 8, 2);
      usb(0.15, 0.065); usb(0.15, -0.065);
      rj45(0.5, 0.015, 0.2, 0.15); rj45(0.78, 0.015, 0.2, 0.15);
      sfp(1.12, 0.015); sfp(1.44, 0.015);
      led(1.79, 0.075); led(1.79, -0.065, 'orange');
    } else if (unit.type === 'storage') {
      // RS422+ has a thin control rail above four full-width lockable tray fronts.
      faceLabel('mountd / NFS + SMB', -1.64, 0.13, 0.047);
      for (let i = 0; i < 5; i++) led(0.31 + i * 0.19, 0.13);
      for (let drive = 0; drive < 4; drive++) {
        const x = -1.33 + drive * 0.89;
        cut(x, -0.055, 0.854, 0.208, 0.012);
        parts.rounded('black', [0.86, 0.216, 0.07], [x, -0.055, FACE_Z - 0.02], 0.016, [0, 0, 0], 'plastic');
        parts.rounded('graphite', [0.818, 0.176, 0.047], [x, -0.057, FACE_Z + 0.025], 0.013);
        parts.rounded('black', [0.19, 0.126, 0.012], [x - 0.274, -0.057, FACE_Z + 0.055], 0.01, [0, 0, 0], 'plastic');
        parts.rounded('rubber', [0.608, 0.15, 0.024], [x + 0.07, -0.057, FACE_Z + 0.063], 0.012, [0, 0, 0], 'plastic');
        parts.torus('darkSilver', 0.027, 0.009, [x - 0.01, -0.057, FACE_Z + 0.079]);
        parts.box('black', [0.009, 0.035, 0.005], [x - 0.01, -0.057, FACE_Z + 0.09], [0, 0, 0], 'plastic');
      }
      for (const x of [-1.45, 1.45]) for (let row = 0; row < 2; row++) parts.box('black', [0.5, 0.018, 0.012], [x, 0.143 - row * 0.037, FACE_Z + 0.037], [0, 0, 0], 'plastic');
    } else if (unit.type === 'archive') {
      // HyperDeck: two thin media slots, transport keys, status display and jog wheel.
      faceLabel('PHOTO ARCHIVE', -1.76, 0.12, 0.053);
      for (let slot = 0; slot < 2; slot++) {
        const x = -1.14 + slot * 1.04;
        cut(x, -0.035, 0.92, 0.1, 0.012);
        parts.box('black', [0.94, 0.116, 0.07], [x, -0.035, FACE_Z - 0.02], [0, 0, 0], 'plastic');
        parts.rounded('darkSilver', [0.84, 0.036, 0.03], [x, -0.032, FACE_Z + 0.012], 0.008);
        parts.box('black', [0.77, 0.015, 0.006], [x, -0.018, FACE_Z + 0.031], [0, 0, 0], 'plastic');
        parts.rounded('orange', [0.064, 0.026, 0.025], [x + 0.36, -0.061, FACE_Z + 0.04], 0.006);
      }
      for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) button(0.61 + col * 0.176, 0.071 - row * 0.142, 0.12, 0.095, row === 1 && col === 2 ? 'indicator' : 'cream');
      display(1.31, 0, 0.34, 0.235, (g, x, py) => { g.text('ALBUMS', x, py + 0.047, 0.042, '#d8d6d0', 'center'); g.text('DOWNLOAD', x, py - 0.05, 0.03, '#aaa69e', 'center'); });
      knob(parts, 1.78, 0, 0.116, 'darkSilver');
    } else {
      // Neutrik patch panel: repeated circular sockets and removable label strips.
      for (let group = 0; group < 3; group++) {
        const x = -1.15 + group * 1.15;
        parts.box('darkSilver', [1.06, 0.066, 0.018], [x, 0.12, FACE_Z + 0.044]);
        raisedPaintCommands.push(g => g.text(['SHORTCUTS', 'SCRIPTS', 'EXERCISES'][group], x, 0.12, 0.041, '#e3e0da', 'center'));
        for (let col = 0; col < 6; col++) for (let row = 0; row < 2; row++) jack(x - 0.455 + col * 0.182, 0.015 - row * 0.115);
      }
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
    if (unit.type === 'audio') {
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
    rack, bays, interiors, hitTargets, projectLinkTargets, moduleAssemblies, moduleTargets, highlights, slotY, heights, totalU, height,
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      allMaterials.forEach(material => material.dispose());
    },
  };
}
