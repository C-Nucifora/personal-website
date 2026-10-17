import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const PROJECTS = ['m1-core', 'm1-lsp', 'nvim-m1', 'tree-sitter-m1'];
const SLOT_Y = [1.8, 0.6, -0.6, -1.8];
const SLIDE = 3.5;
const BACKGROUND = '#e9e7e1';
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createRackScene({ canvas, onSelect = () => {}, onHover = () => {}, onPhase = () => {}, onReady = () => {}, onError = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error);
    return { select() {}, reset() {}, setReducedMotion() {}, setView() {}, dispose() {}, getState: () => ({ phase: 'error', selected: null, drawCalls: 0 }) };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  // Keep vertical page scrolling available over the rack on touch screens.
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 1.47;
  controls.minAzimuthAngle = -0.72;
  controls.maxAzimuthAngle = 0.95;
  controls.rotateSpeed = 0.55;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: null };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: null };
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const materials = {
    frame: new THREE.MeshStandardMaterial({ color: '#25292a', metalness: 0.8, roughness: 0.39 }),
    edge: new THREE.MeshStandardMaterial({ color: '#414648', metalness: 0.9, roughness: 0.34 }),
    dark: new THREE.MeshStandardMaterial({ color: '#101616', metalness: 0.35, roughness: 0.67 }),
    silver: new THREE.MeshStandardMaterial({ color: '#a9b0ad', metalness: 0.88, roughness: 0.31 }),
    orange: new THREE.MeshStandardMaterial({ color: '#e86828', metalness: 0.3, roughness: 0.36 }),
    copper: new THREE.MeshStandardMaterial({ color: '#b97c49', metalness: 0.84, roughness: 0.35 }),
    pcb: new THREE.MeshStandardMaterial({ color: '#1b5950', metalness: 0.18, roughness: 0.67 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c2a66d', metalness: 0.78, roughness: 0.37 }),
    led: new THREE.MeshStandardMaterial({ color: '#9be3ae', emissive: '#54b46d', emissiveIntensity: 0.7, roughness: 0.4 }),
  };
  const ownedTextures = [];
  const ownedMaterials = [...Object.values(materials)];
  const geometryResources = new Set();

  // Each chassis batches small hardware parts by finish rather than issuing a draw call per screw.
  function batch(parent) {
    const parts = new Map();
    function add(geometry, finish, position = [0, 0, 0], rotation = [0, 0, 0]) {
      if (geometry.index) {
        const original = geometry;
        geometry = geometry.toNonIndexed();
        original.dispose();
      }
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
      geometry.applyMatrix4(matrix);
      const list = parts.get(finish) || [];
      list.push(geometry);
      parts.set(finish, list);
    }
    return {
      box(finish, dimensions, position, rotation) { add(new THREE.BoxGeometry(...dimensions), finish, position, rotation); },
      cylinder(finish, radius, depth, position, rotation = [Math.PI / 2, 0, 0], segments = 12) { add(new THREE.CylinderGeometry(radius, radius, depth, segments), finish, position, rotation); },
      geometry: add,
      finish() {
        for (const [finish, geometries] of parts) {
          const geometry = mergeGeometries(geometries, false);
          geometries.forEach((item) => item.dispose());
          if (!geometry) continue;
          geometry.computeBoundingSphere();
          geometryResources.add(geometry);
          const mesh = new THREE.Mesh(geometry, materials[finish]);
          mesh.castShadow = finish !== 'led';
          mesh.receiveShadow = true;
          parent.add(mesh);
        }
      },
    };
  }
  function label(parent, text, width, height, position, options = {}) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = options.resolution || 1024;
    textureCanvas.height = Math.round(textureCanvas.width * height / width);
    const ctx = textureCanvas.getContext('2d');
    ctx.fillStyle = options.background || '#202627';
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    ctx.fillStyle = options.color || '#e2e5de';
    ctx.font = `${options.weight || 500} ${textureCanvas.height * (options.fontScale || 0.5)}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textureCanvas.height * 0.28, textureCanvas.height * 0.52);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    ownedTextures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.12, roughness: 0.75 });
    ownedMaterials.push(material);
    const geometry = new THREE.PlaneGeometry(width, height);
    geometryResources.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    parent.add(mesh);
    return mesh;
  }
  function roundedPath(path, x, y, width, height, radius) {
    path.moveTo(x + radius, y);
    path.lineTo(x + width - radius, y);
    path.quadraticCurveTo(x + width, y, x + width, y + radius);
    path.lineTo(x + width, y + height - radius);
    path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    path.lineTo(x + radius, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - radius);
    path.lineTo(x, y + radius);
    path.quadraticCurveTo(x, y, x + radius, y);
  }
  function ventPanel(width, height, columns, rows) {
    const shape = new THREE.Shape();
    roundedPath(shape, -width / 2, -height / 2, width, height, 0.035);
    const stepX = (width - 0.24) / columns;
    const stepY = (height - 0.16) / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const hole = new THREE.Path();
        roundedPath(hole, -width / 2 + 0.12 + col * stepX, -height / 2 + 0.08 + row * stepY, stepX * 0.63, stepY * 0.5, 0.022);
        shape.holes.push(hole);
      }
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: false, curveSegments: 3 });
  }

  const rack = new THREE.Group();
  scene.add(rack);
  const rackParts = batch(rack);
  // Four shortened 19-inch bays, with a solid case and separate mounting rails.
  rackParts.box('frame', [4.5, 0.17, 3.85], [0, -2.77, 0]);
  rackParts.box('frame', [4.5, 0.15, 3.85], [0, 2.77, 0]);
  rackParts.box('frame', [0.11, 5.4, 3.85], [-2.195, 0, 0]);
  rackParts.box('frame', [0.11, 5.4, 3.85], [2.195, 0, 0]);
  for (const x of [-2.08, 2.08]) {
    rackParts.box('edge', [0.22, 5.38, 0.17], [x, 0, 1.83]);
    rackParts.box('edge', [0.16, 5.38, 0.15], [x, 0, -1.82]);
    for (let y = -2.4; y <= 2.4; y += 0.2) {
      rackParts.box('dark', [0.055, 0.075, 0.012], [x, y, 1.922]);
    }
    for (const z of [-1.55, 1.45]) {
      rackParts.box('dark', [0.35, 0.18, 0.52], [x * 0.88, -2.91, z]);
    }
  }
  rackParts.box('dark', [4.0, 5.15, 0.08], [0, 0, -1.84]);
  for (const y of SLOT_Y) {
    for (const x of [-1.91, 1.91]) {
      rackParts.box('silver', [0.08, 0.1, 3.4], [x, y - 0.47, -0.02]);
      rackParts.box('edge', [0.14, 0.07, 3.45], [x, y - 0.42, -0.02]);
    }
  }
  for (let x = -1.5; x <= 1.5; x += 0.18) {
    rackParts.box('dark', [0.075, 0.014, 1.6], [x, 2.853, -0.25]);
  }
  for (const x of [-2.08, 2.08]) {
    for (const y of [-2.62, 2.62]) rackParts.cylinder('silver', 0.048, 0.023, [x, y, 1.94]);
  }
  rackParts.finish();
  label(rack, 'CN / PROJECT SYSTEM', 2.64, 0.19, [-0.53, 2.58, 1.948], { fontScale: 0.48 });
  label(rack, '04', 0.34, 0.19, [1.68, 2.58, 1.948], { color: '#bfc8bd', background: '#25292a' });

  const bays = [];
  const hitTargets = [];
  for (let index = 0; index < 4; index++) {
    const bay = new THREE.Group();
    bay.position.y = SLOT_Y[index];
    bay.userData.index = index;
    rack.add(bay);
    bays.push(bay);
    const parts = batch(bay);
    parts.box('silver', [3.81, 0.055, 3.28], [0, -0.43, 0.06]);
    parts.box('silver', [0.045, 0.69, 3.25], [-1.88, -0.065, 0.06]);
    parts.box('silver', [0.045, 0.69, 3.25], [1.88, -0.065, 0.06]);
    parts.box('silver', [3.78, 0.64, 0.05], [0, -0.09, -1.55]);
    parts.box('frame', [4.05, 0.95, 0.11], [0, 0, 1.79]);
    parts.box('dark', [3.7, 0.7, 0.12], [0, 0, 1.69]);
    parts.geometry(ventPanel(2.01, 0.49, 15, 3), 'edge', [0.08, -0.085, 1.854]);
    // Pulled handles and fastening screws remain readable at the overview scale.
    for (const x of [-1.73, 1.73]) {
      parts.box('orange', [0.13, 0.59, 0.13], [x, -0.02, 2.02]);
      parts.box('orange', [0.19, 0.12, 0.25], [x, 0.22, 1.94]);
      parts.box('orange', [0.19, 0.12, 0.25], [x, -0.26, 1.94]);
      parts.cylinder('silver', 0.045, 0.022, [x < 0 ? -1.94 : 1.94, 0.31, 1.866]);
      parts.cylinder('silver', 0.045, 0.022, [x < 0 ? -1.94 : 1.94, -0.31, 1.866]);
    }
    parts.cylinder('led', 0.025, 0.017, [1.42, 0.22, 1.866]);
    parts.cylinder('dark', 0.062, 0.026, [1.42, -0.06, 1.867]);
    // The open top reveals a designed motherboard with cooling, memory and power.
    parts.box('pcb', [3.08, 0.07, 2.26], [-0.18, -0.355, -0.12]);
    for (const x of [-1.6, 1.21]) {
      for (const z of [-1.13, 0.92]) parts.cylinder('gold', 0.045, 0.025, [x, -0.303, z], [0, 0, 0]);
    }
    // Thin traces on the board use real geometry, so the selected view has depth and highlights.
    for (let row = 0; row < 7; row++) {
      const z = -0.91 + row * 0.28;
      parts.box('gold', [0.48, 0.008, 0.013], [-1.04, -0.312, z]);
      parts.box('gold', [0.013, 0.008, 0.14], [-0.8, -0.312, z + 0.07]);
      parts.box('gold', [0.32, 0.008, 0.013], [-0.64, -0.312, z + 0.14]);
    }
    parts.box('dark', [0.95, 0.1, 0.95], [-0.43, -0.25, -0.2]);
    parts.box('copper', [0.84, 0.07, 0.87], [-0.43, -0.17, -0.2]);
    for (let fin = 0; fin < 16; fin++) parts.box('copper', [0.028, 0.38, 0.86], [-0.82 + fin * 0.052, 0.055, -0.2]);
    // Four memory boards with small ICs sit beside the main heatsink.
    for (let row = 0; row < 4; row++) {
      const x = 0.27 + row * 0.19;
      parts.box('dark', [0.09, 0.1, 1.33], [x, -0.25, -0.22]);
      parts.box('pcb', [0.045, 0.34, 1.18], [x, -0.05, -0.22]);
      for (let chip = 0; chip < 4; chip++) parts.box('dark', [0.06, 0.17, 0.21], [x + 0.035, -0.01, -0.66 + chip * 0.29]);
      parts.box('orange', [0.09, 0.07, 0.07], [x, -0.21, 0.43]);
    }
    for (let fan = 0; fan < 4; fan++) {
      const x = -1.36 + fan * 0.86;
      const z = 1.12;
      parts.box('dark', [0.73, 0.58, 0.3], [x, -0.055, z]);
      parts.cylinder('edge', 0.265, 0.025, [x, -0.035, z + 0.17], [Math.PI / 2, 0, 0], 24);
      parts.cylinder('dark', 0.2, 0.035, [x, -0.035, z + 0.19], [Math.PI / 2, 0, 0], 20);
      parts.cylinder('silver', 0.075, 0.045, [x, -0.035, z + 0.22]);
      for (let blade = 0; blade < 5; blade++) {
        const angle = blade * Math.PI * 2 / 5;
        parts.box('edge', [0.07, 0.16, 0.027], [x + Math.sin(angle) * 0.12, -0.035 + Math.cos(angle) * 0.12, z + 0.215], [0, 0, -angle + 0.4]);
      }
    }
    parts.box('silver', [0.44, 0.55, 1.54], [1.57, -0.12, -0.52]);
    for (let rib = 0; rib < 9; rib++) parts.box('edge', [0.32, 0.015, 0.022], [1.57, 0.162, -1.08 + rib * 0.13]);
    // Rear connectors, capacitors and smaller packages establish scale in the close view.
    for (let port = 0; port < 5; port++) {
      parts.box('silver', [0.27, 0.18, 0.22], [-1.37 + port * 0.48, -0.2, -1.36]);
      parts.box('dark', [0.17, 0.095, 0.012], [-1.37 + port * 0.48, -0.2, -1.478]);
    }
    for (let chip = 0; chip < 6; chip++) {
      parts.box('dark', [0.16, 0.08, 0.16], [-1.38 + (chip % 2) * 0.25, -0.25, -0.55 + Math.floor(chip / 2) * 0.34]);
    }
    for (let cap = 0; cap < 7; cap++) {
      parts.cylinder('silver', 0.048, 0.13, [-0.98 + cap * 0.21, -0.22, -0.98], [0, 0, 0]);
    }
    parts.finish();
    label(bay, PROJECTS[index], 2.36, 0.25, [-0.19, 0.264, 1.86], { fontScale: 0.56, background: '#25292a', color: '#e4e8df' });
    label(bay, `0${index + 1}`, 0.31, 0.21, [-1.33, -0.08, 1.86], { fontScale: 0.55, color: '#a9b1a8', background: '#25292a' });
    label(bay, `CN-${String(index + 1).padStart(2, '0')}   REV 01`, 1.08, 0.14, [-0.82, -0.308, -0.8], { rotation: [-Math.PI / 2, 0, 0], color: '#b5cab8', background: '#1b5950', fontScale: 0.48 });
    const hitGeometry = new THREE.BoxGeometry(4.05, 0.98, 3.8);
    geometryResources.add(hitGeometry);
    const hit = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({ visible: false }));
    ownedMaterials.push(hit.material);
    hit.position.z = 0.1;
    hit.userData.index = index;
    bay.add(hit);
    hitTargets.push(hit);
  }

  const floorMaterial = new THREE.ShadowMaterial({ color: '#263029', opacity: 0.17 });
  ownedMaterials.push(floorMaterial);
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  geometryResources.add(floorGeometry);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.02;
  floor.receiveShadow = true;
  scene.add(floor);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 256;
  const contactContext = contactCanvas.getContext('2d');
  const gradient = contactContext.createRadialGradient(128, 128, 18, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(27,34,31,0.45)');
  gradient.addColorStop(0.48, 'rgba(27,34,31,0.2)');
  gradient.addColorStop(1, 'rgba(27,34,31,0)');
  contactContext.fillStyle = gradient;
  contactContext.fillRect(0, 0, 256, 256);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  ownedTextures.push(contactTexture);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false });
  ownedMaterials.push(contactMaterial);
  const contactGeometry = new THREE.PlaneGeometry(8.4, 7.1);
  geometryResources.add(contactGeometry);
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -3.01, 0.3);
  scene.add(contact);
  scene.add(new THREE.HemisphereLight('#f5f4ee', '#a4a89c', 2.3));
  const key = new THREE.DirectionalLight('#fff8ee', 4.7);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 8, bottom: -6, near: 0.5, far: 30 });
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c9dbe4', 1.9);
  fill.position.set(7, 4, -4);
  scene.add(fill);

  let disposed = false;
  let contextLost = false;
  let selected = null;
  let phase = 'overview';
  let view = 'perspective';
  let hovered = null;
  let frame = 0;
  let stages = [];
  let activeStage = null;
  let lastWidth = 0;
  let lastHeight = 0;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerDown = null;
  let hiddenAt = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function overviewPose() {
    const aspect = Math.max(camera.aspect, 0.35);
    const direction = view === 'front' ? new THREE.Vector3(0.015, 0.22, 1).normalize() : new THREE.Vector3(0.66, 0.38, 1).normalize();
    // Fit the whole enclosure in portrait as well as landscape without letting orbit zoom crop it.
    const distance = Math.max(13.6, 10.2 / Math.min(aspect, 1.4));
    const target = new THREE.Vector3(0, -0.05, 0.25);
    return { position: target.clone().addScaledVector(direction, distance), target };
  }
  function projectPose(index) {
    const aspect = Math.max(camera.aspect, 0.35);
    const target = new THREE.Vector3(0, SLOT_Y[index] - 0.1, SLIDE + 0.15);
    const direction = new THREE.Vector3(0.66, 0.83, 1).normalize();
    const distance = Math.max(9.2, 10.6 / Math.min(aspect, 1.3));
    return { position: target.clone().addScaledVector(direction, distance), target };
  }
  function emit(nextPhase, index = selected) {
    phase = nextPhase;
    controls.enabled = phase === 'overview';
    onPhase({ phase, index });
  }
  function capture() {
    return { position: camera.position.clone(), target: controls.target.clone(), slides: bays.map((bay) => bay.position.z) };
  }
  function queueStage(nextPhase, duration, target, slides, index) {
    stages.push({ phase: nextPhase, duration: reducedMotion ? 0 : duration, position: target.position.clone(), target: target.target.clone(), slides: [...slides], index });
  }
  function beginNext(now) {
    const next = stages.shift();
    if (!next) { activeStage = null; return; }
    activeStage = { ...next, start: capture(), startedAt: now };
    emit(next.phase, next.index);
  }
  function applyStage(stage, progress) {
    const t = ease(progress);
    camera.position.lerpVectors(stage.start.position, stage.position, t);
    controls.target.lerpVectors(stage.start.target, stage.target, t);
    camera.lookAt(controls.target);
    bays.forEach((bay, index) => { bay.position.z = THREE.MathUtils.lerp(stage.start.slides[index], stage.slides[index], t); });
  }
  function requestRender() {
    if (!frame && !disposed && !contextLost && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(now) {
    frame = 0;
    if (disposed || contextLost || document.hidden) return;
    if (!activeStage && stages.length) beginNext(now);
    // Reduced motion resolves the same state changes immediately, without simulating rapid movement.
    while (activeStage) {
      const progress = activeStage.duration === 0 ? 1 : Math.min((now - activeStage.startedAt) / activeStage.duration, 1);
      applyStage(activeStage, progress);
      if (progress < 1) break;
      const finishedPhase = activeStage.phase;
      activeStage = null;
      if (stages.length) beginNext(now);
      else {
        emit(selected === null ? 'overview' : 'project');
        if (finishedPhase === 'returning' && selected === null) controls.update();
      }
    }
    try {
      renderer.render(scene, camera);
    } catch (error) {
      contextLost = true;
      onError(error);
      return;
    }
    if (activeStage || stages.length) requestRender();
  }
  function clearHover() {
    if (hovered !== null) { hovered = null; onHover(null); }
    canvas.style.cursor = phase === 'overview' ? 'grab' : 'default';
  }
  function select(index) {
    const next = Number.isInteger(index) && index >= 0 && index < bays.length ? index : null;
    if (next === selected && ((next === null && phase === 'overview') || phase === 'project')) return;
    const previous = selected;
    selected = next;
    stages = [];
    activeStage = null;
    clearHover();
    controls.enabled = false;
    const overview = overviewPose();
    const current = capture();
    const hasSlide = current.slides.some((position) => position > 0.005);
    const cameraAway = current.position.distanceTo(overview.position) > 0.02 || current.target.distanceTo(overview.target) > 0.02;
    if (cameraAway) queueStage('returning', 540, overview, current.slides, previous);
    if (hasSlide) queueStage('returning', 520, overview, [0, 0, 0, 0], previous);
    if (next !== null) {
      const slides = [0, 0, 0, 0];
      slides[next] = SLIDE;
      queueStage('extracting', 760, overview, slides, next);
      queueStage('focusing', 900, projectPose(next), slides, next);
    }
    if (!stages.length) { emit('overview'); requestRender(); return; }
    beginNext(performance.now());
    requestRender();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!activeStage && !stages.length) {
      const pose = selected === null ? overviewPose() : projectPose(selected);
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      camera.lookAt(pose.target);
      if (selected === null) controls.update();
    } else {
      const now = performance.now();
      if (activeStage) {
        const remaining = Math.max(0, activeStage.duration - (now - activeStage.startedAt));
        const pose = activeStage.phase === 'focusing' ? projectPose(activeStage.index) : overviewPose();
        activeStage.start = capture();
        activeStage.startedAt = now;
        activeStage.duration = remaining;
        activeStage.position.copy(pose.position);
        activeStage.target.copy(pose.target);
      }
      stages.forEach((stage) => {
        const pose = stage.phase === 'focusing' ? projectPose(stage.index) : overviewPose();
        stage.position.copy(pose.position);
        stage.target.copy(pose.target);
      });
    }
    requestRender();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  function hitAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hitTargets, false)[0]?.object.userData.index ?? null;
  }
  function pointerMove(event) {
    if (phase !== 'overview' || event.pointerType === 'touch' || pointerDown) return;
    const index = hitAt(event);
    if (hovered !== index) { hovered = index; onHover(index); }
    canvas.style.cursor = index === null ? 'grab' : 'pointer';
  }
  function pointerStart(event) {
    if (event.button !== 0) return;
    pointerDown = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }
  function pointerEnd(event) {
    if (!pointerDown || event.pointerId !== pointerDown.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (phase === 'overview' && distance < 7) {
      const index = hitAt(event);
      if (index !== null) onSelect(index);
    }
  }
  function pointerCancel() { pointerDown = null; clearHover(); }
  function visibilityChange() {
    if (document.hidden) {
      hiddenAt = performance.now();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else {
      if (activeStage && hiddenAt !== null) activeStage.startedAt += performance.now() - hiddenAt;
      hiddenAt = null;
      requestRender();
    }
  }
  function changeView(next) {
    if (next !== 'front' && next !== 'perspective') return;
    view = next;
    if (selected !== null || phase !== 'overview') select(null);
    else {
      const pose = overviewPose();
      stages = [];
      activeStage = null;
      queueStage('returning', 560, pose, [0, 0, 0, 0], null);
      beginNext(performance.now());
      requestRender();
    }
  }
  function contextLoss(event) {
    event.preventDefault();
    contextLost = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    onError(new Error('The 3D graphics context was interrupted. Reload to restore the rack.'));
  }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerStart);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', clearHover);
  canvas.addEventListener('webglcontextlost', contextLoss);
  document.addEventListener('visibilitychange', visibilityChange);
  controls.addEventListener('change', requestRender);
  resize();
  emit('overview');
  requestRender();
  onReady();

  return {
    select,
    reset() { changeView('perspective'); },
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        if (activeStage) activeStage.duration = 0;
        stages.forEach((stage) => { stage.duration = 0; });
        requestRender();
      }
    },
    setView: changeView,
    getState() {
      return { phase, selected, hovered, view, reducedMotion, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, slides: bays.map((bay) => Number(bay.position.z.toFixed(3))), camera: camera.position.toArray().map((value) => Number(value.toFixed(3))), size: [lastWidth, lastHeight], contextLost };
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerdown', pointerStart);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('pointerleave', clearHover);
      canvas.removeEventListener('webglcontextlost', contextLoss);
      document.removeEventListener('visibilitychange', visibilityChange);
      geometryResources.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      ownedTextures.forEach((texture) => texture.dispose());
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
