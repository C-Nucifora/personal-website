import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { createRackModel, FACE_Z, EXTRACTION } from './model.js?v=20261018-neutral-v2';
import { units } from './catalog.js';

const BACKGROUND = '#121212';
const MAX_DRAWING_PIXELS = 6500000;
const ease = (t) => t * t * (3 - 2 * t);

export function createRackScene({ canvas, onSelect = () => {}, onProjectOpen = () => {}, onHover = () => {}, onPhase = () => {}, onReady = () => {}, onError = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error);
    return { select() {}, zoom() {}, reset() {}, setReducedMotion() {}, setView() {}, hover() {}, dispose() {}, getState: () => ({ phase: 'error', selected: null, drawCalls: 0 }) };
  }
  const gl = renderer.getContext();
  const samples = gl.getParameter(gl.SAMPLES);
  const maxBufferSize = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(33, 1, 0.5, 80);
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.9;
  controls.maxPolarAngle = 1.49;
  controls.minAzimuthAngle = -0.45;
  controls.maxAzimuthAngle = 0.72;
  controls.rotateSpeed = 0.4;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.55;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  // Large photographic strip cards produce controlled highlights on each beveled metal edge.
  const studio = new THREE.Scene();
  const studioGeometries = [];
  const studioMaterials = [];
  const roomMaterial = new THREE.MeshBasicMaterial({ color: '#1d1d1f', side: THREE.BackSide });
  const roomGeometry = new THREE.BoxGeometry(40, 40, 40);
  studioMaterials.push(roomMaterial);
  studioGeometries.push(roomGeometry);
  studio.add(new THREE.Mesh(roomGeometry, roomMaterial));
  function softbox(width, height, position, radiance, tint = [1, 1, 1]) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(tint[0] * radiance, tint[1] * radiance, tint[2] * radiance), side: THREE.DoubleSide });
    studioGeometries.push(geometry);
    studioMaterials.push(material);
    const panel = new THREE.Mesh(geometry, material);
    panel.position.set(...position);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  }
  softbox(4, 17, [-8, 4, 7], 3.2, [1, 0.98, 0.94]);
  softbox(2.5, 15, [8, 3, 1], 2.4, [0.94, 0.97, 1]);
  softbox(14, 9, [-3, 10, -6], 3);
  softbox(9, 7, [0, 2, 12], 0.7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  studioGeometries.forEach(geometry => geometry.dispose());
  studioMaterials.forEach(material => material.dispose());
  pmrem.dispose();

  const model = createRackModel(renderer);
  const { rack, bays, interiors, highlights, hitTargets, projectLinkTargets = [], slotY, heights } = model;
  scene.add(rack);
  const floorY = -model.height / 2 - 0.22;
  const floorGeometry = new THREE.PlaneGeometry(80, 80);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#1c1c1d', roughness: 0.96, envMapIntensity: 0.15 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  scene.add(floor);
  const roomGeometries = [];
  const roomMaterials = [];
  const room = new THREE.Group();
  const roomParts = new Map();
  function roomFinish(color, roughness = 0.85, metalness = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.22 });
    roomMaterials.push(material);
    roomParts.set(material, []);
    return material;
  }
  function roomBox(material, size, position) {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(...position);
    roomParts.get(material).push(geometry);
  }
  const wall = roomFinish('#181819');
  const joint = roomFinish('#0e0e10');
  const cabinet = roomFinish('#202022', 0.73, 0.15);
  const door = roomFinish('#171719', 0.88, 0.08);
  const trim = roomFinish('#303033', 0.64, 0.28);
  roomBox(wall, [80, 35, 0.3], [0, floorY + 17.5, -14]);
  roomBox(trim, [80, 0.28, 0.08], [0, floorY + 0.14, -13.8]);
  // Wide floor joints survive minification without a fine procedural grid.
  for (let x = -24; x <= 24; x += 4) roomBox(joint, [0.025, 0.012, 48], [x + 1.8, floorY + 0.002, 0]);
  for (let z = -20; z <= 20; z += 4) roomBox(joint, [56, 0.012, 0.025], [0, floorY + 0.002, z + 0.4]);
  // The neighboring cabinets borrow the 600 × 1199 × 1070 mm proportions of a 24U NetShelter SX.
  for (const x of [-7.6, 7.6]) {
    const height = model.height;
    const width = height * 600 / 1199;
    const depth = height * 1070 / 1199;
    const centerY = floorY + height / 2 + 0.1;
    const front = -2.7;
    roomBox(cabinet, [width, height, depth], [x, centerY, front - depth / 2]);
    roomBox(joint, [width - 0.28, height - 0.38, 0.06], [x, centerY, front + 0.035]);
    roomBox(door, [width - 0.55, height - 0.65, 0.07], [x, centerY, front + 0.08]);
    for (const side of [-1, 1]) roomBox(trim, [0.1, height - 0.42, 0.12], [x + side * (width / 2 - 0.12), centerY, front + 0.06]);
    for (const sign of [-1, 1]) roomBox(trim, [width - 0.18, 0.13, 0.12], [x, centerY + sign * (height / 2 - 0.14), front + 0.06]);
    // Broad recessed ventilation strips suggest a perforated door without subpixel hole patterns.
    for (let row = 0; row < 15; row++) roomBox(joint, [width - 0.94, 0.16, 0.03], [x, centerY - height * 0.38 + row * height * 0.054, front + 0.125]);
    roomBox(trim, [0.085, 0.68, 0.14], [x + width / 2 - 0.42, centerY - 0.25, front + 0.19]);
    for (const side of [-1, 1]) roomBox(joint, [0.32, 0.14, 0.45], [x + side * (width / 2 - 0.45), floorY + 0.07, front - 0.65]);
  }
  const trayY = floorY + model.height + 1.5;
  roomBox(trim, [25, 0.1, 0.85], [0, trayY, -13]);
  roomBox(cabinet, [25, 0.25, 0.08], [0, trayY + 0.12, -12.6]);
  for (const x of [-10, 0, 10]) roomBox(trim, [0.08, 1.3, 0.08], [x, trayY + 0.65, -13]);
  roomParts.forEach((parts, material) => {
    const geometry = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    roomGeometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    room.add(mesh);
  });
  scene.add(room);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 256;
  const context = contactCanvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 24, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.4)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  const contactGeometry = new THREE.PlaneGeometry(8.3, 7.1);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false });
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, floorY + 0.008, 0.15);
  scene.add(contact);
  for (const x of [-7.6, 7.6]) {
    const cabinetContact = new THREE.Mesh(contactGeometry, contactMaterial);
    cabinetContact.rotation.x = -Math.PI / 2;
    cabinetContact.scale.set(1.05, 1.55, 1);
    cabinetContact.position.set(x, floorY + 0.008, -6.4);
    scene.add(cabinetContact);
  }
  scene.add(new THREE.HemisphereLight('#e7e7eb', '#29292b', 0.35));
  const key = new THREE.DirectionalLight('#f8f6ef', 2.2);
  key.position.set(-5, 11, 12);
  key.target.position.set(0, 0, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 8, bottom: -8, near: 1, far: 32 });
  key.shadow.bias = -0.00008;
  key.shadow.normalBias = 0.008;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#e9e9ee', 0.4);
  fill.position.set(8, 2, 10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#d4dce1', 1.6);
  rim.position.set(5, 8, -7);
  scene.add(rim);

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
  let lastPixelRatio = 0;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerDown = null;
  const activePointers = new Set();
  let hiddenAt = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function fitPose(target, direction, corners, margin = 1.12, minimum = 0) {
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const horizontalTangent = verticalTangent * Math.max(camera.aspect, 0.35);
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    let distance = minimum;
    corners.forEach(corner => {
      const relative = corner.clone().sub(target);
      const towardCamera = relative.dot(direction);
      distance = Math.max(distance, Math.abs(relative.dot(right)) * margin / horizontalTangent + towardCamera, Math.abs(relative.dot(up)) * margin / verticalTangent + towardCamera);
    });
    return { position: target.clone().addScaledVector(direction, distance), target };
  }
  function cornersOf(minimum, maximum) {
    const corners = [];
    for (const x of [minimum[0], maximum[0]]) for (const y of [minimum[1], maximum[1]]) for (const z of [minimum[2], maximum[2]]) corners.push(new THREE.Vector3(x, y, z));
    return corners;
  }
  function overviewPose() {
    const direction = view === 'front' ? new THREE.Vector3(0.002, 0.085, 1).normalize() : new THREE.Vector3(0.27, 0.15, 1).normalize();
    const target = new THREE.Vector3(0, -0.02, 0.38);
    return fitPose(target, direction, cornersOf([-2.5, -model.height / 2 - 0.25, -2.45], [2.5, model.height / 2 + 0.02, 2.65]), 1.04);
  }
  function projectPose(index) {
    const direction = new THREE.Vector3(0.4, 0.66, 1).normalize();
    const target = new THREE.Vector3(0, slotY[index] - 0.03, EXTRACTION + 0.18);
    return fitPose(target, direction, cornersOf([-2.2, slotY[index] - heights[index] / 2 - 0.04, EXTRACTION - 2.1], [2.2, slotY[index] + heights[index] / 2 + 0.08, EXTRACTION + 2.67]), 1.18, 7.6);
  }
  function updateControls() {
    controls.enabled = phase === 'overview' || phase === 'project';
    if (controls.enabled) {
      const pose = phase === 'project' ? projectPose(selected) : overviewPose();
      const distance = pose.position.distanceTo(pose.target);
      controls.minDistance = phase === 'project' ? Math.max(3.8, distance * 0.5) : Math.max(6, distance * 0.35);
      controls.maxDistance = distance * 1.8;
      controls.minPolarAngle = phase === 'project' ? 0.5 : 0.9;
      controls.cursor.copy(pose.target);
      controls.maxTargetRadius = phase === 'project' ? 1.5 : model.height * 0.65;
      controls.update();
    }
    canvas.style.cursor = controls.enabled ? 'grab' : 'default';
  }
  function emit(nextPhase, index = selected) {
    phase = nextPhase;
    updateControls();
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
    bays.forEach((bay, index) => {
      bay.position.z = THREE.MathUtils.lerp(stage.start.slides[index], stage.slides[index], t);
      interiors[index].visible = bay.position.z > 0.002;
    });
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
  function setHover(index, notify = false) {
    const next = Number.isInteger(index) && index >= 0 && index < bays.length ? index : null;
    const changed = hovered !== next;
    hovered = next;
    highlights.forEach((highlight, i) => { highlight.visible = i === next && phase === 'overview'; });
    if (changed && notify) onHover(next);
    requestRender();
  }
  function clearHover() {
    setHover(null, true);
    canvas.style.cursor = controls.enabled ? 'grab' : 'default';
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
    if (cameraAway) queueStage('returning', 460, overview, current.slides, previous);
    if (hasSlide) queueStage('returning', 480, overview, bays.map(() => 0), previous);
    if (next !== null) {
      const slides = bays.map(() => 0);
      slides[next] = EXTRACTION;
      queueStage('extracting', 600, overview, slides, next);
      queueStage('focusing', 700, projectPose(next), slides, next);
    }
    if (!stages.length) { emit('overview'); requestRender(); return; }
    beginNext(performance.now());
    requestRender();
  }
  function resize() {
    if (disposed || contextLost) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    // Supersample low-density displays without allocating an unbounded high-DPI framebuffer.
    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2, Math.sqrt(MAX_DRAWING_PIXELS / (width * height)), maxBufferSize / width, maxBufferSize / height);
    const sizeChanged = width !== lastWidth || height !== lastHeight;
    if (!sizeChanged && pixelRatio === lastPixelRatio) return;
    lastWidth = width;
    lastHeight = height;
    lastPixelRatio = pixelRatio;
    renderer.setDrawingBufferSize(width, height, pixelRatio);
    if (!sizeChanged) { requestRender(); return; }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!activeStage && !stages.length) {
      const pose = selected === null ? overviewPose() : projectPose(selected);
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      camera.lookAt(pose.target);
      updateControls();
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
  let pixelRatioQuery;
  function watchPixelRatio() {
    pixelRatioQuery?.removeEventListener('change', pixelRatioChange);
    pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    pixelRatioQuery.addEventListener('change', pixelRatioChange);
  }
  function pixelRatioChange() { resize(); watchPixelRatio(); }
  watchPixelRatio();
  function hitAt(event, targets = hitTargets) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false)[0]?.object.userData.index ?? null;
  }
  function pointerMove(event) {
    if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) >= 7) pointerDown.dragged = true;
    if (event.pointerType === 'touch' || pointerDown) return;
    if (phase === 'project') {
      const link = hitAt(event, projectLinkTargets.filter(target => target.userData.index === selected));
      canvas.style.cursor = link === selected ? 'pointer' : 'grab';
      return;
    }
    if (phase !== 'overview') return;
    const index = hitAt(event);
    if (hovered !== index) setHover(index, true);
    canvas.style.cursor = index === null ? 'grab' : 'pointer';
  }
  function pointerStart(event) {
    if (event.button !== 0) return;
    activePointers.add(event.pointerId);
    pointerDown = activePointers.size === 1 ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId } : null;
  }
  function pointerEnd(event) {
    activePointers.delete(event.pointerId);
    if (!pointerDown || event.pointerId !== pointerDown.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    const dragged = pointerDown.dragged;
    pointerDown = null;
    if (phase === 'overview' && distance < 7 && !dragged) {
      const index = hitAt(event);
      if (index !== null) onSelect(index);
    } else if (phase === 'project' && distance < 7 && !dragged) {
      const index = hitAt(event, projectLinkTargets.filter(target => target.userData.index === selected));
      if (index === selected) onProjectOpen(index);
    }
  }
  function pointerCancel(event) { activePointers.delete(event.pointerId); pointerDown = null; clearHover(); }
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
      queueStage('returning', 560, pose, bays.map(() => 0), null);
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
    zoom(direction) {
      if (!controls.enabled) return;
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * (direction === 'in' ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      requestRender();
    },
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
    hover(index) { setHover(index); },
    getState() {
      const rect = canvas.getBoundingClientRect();
      const frontCenters = units.map((unit, index) => {
        const point = new THREE.Vector3(0, slotY[index], FACE_Z + bays[index].position.z + 0.08).project(camera);
        const x = (point.x + 1) * 0.5 * lastWidth;
        const y = (1 - point.y) * 0.5 * lastHeight;
        return { index, id: unit.id, u: unit.u, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), pageX: Number((rect.left + x).toFixed(1)), pageY: Number((rect.top + y).toFixed(1)), visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1 };
      });
      const projectLinks = projectLinkTargets.map(target => {
        const point = target.getWorldPosition(new THREE.Vector3()).project(camera);
        return { index: target.userData.index, pageX: rect.left + (point.x + 1) * lastWidth / 2, pageY: rect.top + (1 - point.y) * lastHeight / 2 };
      });
      return { phase, selected, hovered, view, reducedMotion, toneMapping: renderer.toneMapping, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, totalU: model.totalU, units: units.map(unit => ({ id: unit.id, u: unit.u, type: unit.type })), frontCenters, projectLinks, distance: controls.getDistance(), zoomLimits: [controls.minDistance, controls.maxDistance], slides: bays.map(bay => Number(bay.position.z.toFixed(3))), camera: camera.position.toArray().map(value => Number(value.toFixed(3))), size: [lastWidth, lastHeight], quality: { samples, pixelRatio: lastPixelRatio, drawingBuffer: [canvas.width, canvas.height], maxPixels: MAX_DRAWING_PIXELS }, contextLost };
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      pixelRatioQuery.removeEventListener('change', pixelRatioChange);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerdown', pointerStart);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('pointerleave', clearHover);
      canvas.removeEventListener('webglcontextlost', contextLoss);
      document.removeEventListener('visibilitychange', visibilityChange);
      model.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      roomGeometries.forEach(geometry => geometry.dispose());
      roomMaterials.forEach(material => material.dispose());
      contactGeometry.dispose();
      contactMaterial.dispose();
      contactTexture.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
