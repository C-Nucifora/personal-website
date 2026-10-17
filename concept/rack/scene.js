import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createRackModel, FACE_Z, EXTRACTION } from './model.js';
import { units } from './catalog.js';

const BACKGROUND = '#101211';
const ease = (t) => t * t * (3 - 2 * t);

export function createRackScene({ canvas, onSelect = () => {}, onHover = () => {}, onPhase = () => {}, onReady = () => {}, onError = () => {} }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error);
    return { select() {}, reset() {}, setReducedMotion() {}, setView() {}, hover() {}, dispose() {}, getState: () => ({ phase: 'error', selected: null, drawCalls: 0 }) };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 120);
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.9;
  controls.maxPolarAngle = 1.49;
  controls.minAzimuthAngle = -0.45;
  controls.maxAzimuthAngle = 0.72;
  controls.rotateSpeed = 0.4;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: null };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: null };

  // Large photographic strip cards produce controlled highlights on each beveled metal edge.
  const studio = new THREE.Scene();
  const studioGeometries = [];
  const studioMaterials = [];
  const roomMaterial = new THREE.MeshBasicMaterial({ color: '#191d1e', side: THREE.BackSide });
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
  softbox(4, 17, [-8, 4, 7], 4.5, [1, 0.98, 0.94]);
  softbox(2.5, 15, [8, 3, 1], 3.7, [0.87, 0.95, 1]);
  softbox(11, 6, [0, 11, 2], 3.4);
  softbox(9, 7, [0, 2, 12], 1.7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  studioGeometries.forEach(geometry => geometry.dispose());
  studioMaterials.forEach(material => material.dispose());
  pmrem.dispose();

  const model = createRackModel(renderer);
  const { rack, bays, interiors, highlights, hitTargets, slotY, heights } = model;
  scene.add(rack);
  const floorY = -model.height / 2 - 0.22;
  const floorGeometry = new THREE.PlaneGeometry(80, 80);
  const floorMaterial = new THREE.ShadowMaterial({ color: '#000000', opacity: 0.23 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  scene.add(floor);
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
  scene.add(new THREE.HemisphereLight('#d4dfdf', '#343b35', 0.8));
  const key = new THREE.DirectionalLight('#f8f6ef', 3.0);
  key.position.set(-5, 11, 12);
  key.target.position.set(0, 0, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#e5e9e7', 0.75);
  fill.position.set(8, 2, 10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#b9cbd8', 2.7);
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
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerDown = null;
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
  function emit(nextPhase, index = selected) {
    phase = nextPhase;
    controls.enabled = phase === 'overview';
    canvas.style.cursor = phase === 'overview' ? 'grab' : 'default';
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
    if (hovered !== index) setHover(index, true);
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
      return { phase, selected, hovered, view, reducedMotion, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, totalU: model.totalU, units: units.map(unit => ({ id: unit.id, u: unit.u, type: unit.type })), frontCenters, slides: bays.map(bay => Number(bay.position.z.toFixed(3))), camera: camera.position.toArray().map(value => Number(value.toFixed(3))), size: [lastWidth, lastHeight], contextLost };
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
      model.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      contactGeometry.dispose();
      contactMaterial.dispose();
      contactTexture.dispose();
      environment.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
