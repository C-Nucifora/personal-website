import * as THREE from './vendor/three.module.js';
import { loadSurfaceFinishes } from './finishes.js?v=20261022-reader-polish-v2';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createRackModel, FACE_Z, EXTRACTION } from './model.js?v=20261022-reader-polish-v2';
import { siteSettings, usesBundledPortfolio } from './site-data.js?v=20261022-reader-polish-v2';
import { collections } from './collections.js?v=20261022-reader-polish-v2';
import { createDatacenter, RACK_SLOTS } from './datacenter.js?v=20261022-reader-polish-v2';
import { stepSpring } from './motion.js?v=20261022-reader-polish-v2';

const BACKGROUND = usesBundledPortfolio ? '#121212' : siteSettings.appearance.background;
const MAX_DRAWING_PIXELS = 6500000;
const MOVING_DRAWING_PIXELS = 2500000;

export async function createRackScene({ canvas, finish = 'realistic', collectionId = 'software', onCollectionSelect = () => {}, onSelect = () => {}, onProjectOpen = () => {}, onEntryRequest = () => {}, onProjectScreen = () => {}, onModuleSelect = () => {}, onModuleOpen = () => {}, onModuleChange = () => {}, onHover = () => {}, onPhase = () => {}, onReady = () => {}, onError = () => {} }) {
  let collection = collections.find(item => item.id === collectionId) || collections[0];
  let units = collection.units;
  const mode = 'rack';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error);
    return { select() {}, inspectModule() {}, setCollection() { return false; }, enterProject() { return false; }, zoom() {}, reset() {}, setReducedMotion() {}, setView() {}, hover() {}, dispose() {}, getState: () => ({ phase: 'error', selected: null, drawCalls: 0 }) };
  }
  let surfaces;
  try {
    surfaces = await loadSurfaceFinishes(renderer, finish === 'realistic' ? 'realistic' : 'simple', siteSettings.appearance.materialRoughness);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const gl = renderer.getContext();
  const samples = gl.getParameter(gl.SAMPLES);
  const maxBufferSize = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = siteSettings.appearance.exposure;
  renderer.shadowMap.enabled = siteSettings.appearance.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(64, 1, 0.5, 110);
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
  scene.environmentIntensity = siteSettings.appearance.environmentIntensity;
  studioGeometries.forEach(geometry => geometry.dispose());
  studioMaterials.forEach(material => material.dispose());
  pmrem.dispose();

  const models = collections.map(item => {
    const built = createRackModel(renderer, item.units, item.label, 1, { capacityU: item.capacityU, appearance: siteSettings.appearance, ownerName: siteSettings.intro.name, surfaces });
    built.rack.position.fromArray(RACK_SLOTS.find(slot => slot.id === item.id).position);
    scene.add(built.rack);
    return built;
  });
  const tallestHeight = Math.max(...models.map(built => built.height));
  for (const built of models) built.rack.position.y = (built.height - tallestHeight) / 2;
  const motionStates = models.map(built => ({ bays: built.bays.map(() => 0), modules: built.moduleAssemblies?.map(() => 0) ?? [] }));
  // Camera movement leaves the light's shadow map unchanged; track every moving caster.
  const shadowStates = models.flatMap(built => [built.rack, ...built.bays, ...built.interiors,
    ...(built.railAssemblies ?? []).map(item => item.intermediate),
    ...(built.moduleAssemblies ?? []).flatMap(item => [item.group, item.latch]),
  ]).map(object => ({ object, matrix: new THREE.Matrix4(), visible: null }));
  const cameraVelocity = new THREE.Vector3();
  const targetVelocity = new THREE.Vector3();
  let motion = motionStates[collections.indexOf(collection)];
  let model = models[collections.indexOf(collection)];
  let { rack, bays, interiors, highlights, hitTargets, projectLinkTargets = [], projectScreens = [], moduleAssemblies = [], slotY, heights } = model;
  scene.updateMatrixWorld(true);
  const floorY = -tallestHeight / 2 - 0.22;
  const datacenter = createDatacenter({ floorY, rackHeight: tallestHeight, surfaces });
  scene.add(datacenter.group);
  scene.fog = new THREE.Fog(BACKGROUND, 42, 100);
  const rackTargetGeometries = [];
  const rackTargetMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const rackTargets = models.map((built, index) => {
    const geometry = new THREE.BoxGeometry(4.9, built.height, 0.18);
    rackTargetGeometries.push(geometry);
    const target = new THREE.Mesh(geometry, rackTargetMaterial);
    target.position.z = FACE_Z + 0.12;
    target.userData.collectionId = collections[index].id;
    built.rack.add(target);
    return target;
  });
  const worldPoint = point => rack.localToWorld(point);
  const worldDirection = direction => direction.applyQuaternion(rack.quaternion).normalize();
  scene.add(new THREE.HemisphereLight('#e7e7eb', '#29292b', surfaces.finish === 'realistic' ? 0.65 : 0.8));
  const key = new THREE.DirectionalLight('#f8f6ef', 2.2);
  key.position.set(1, 12, 7);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 11, bottom: -11, near: 1, far: 50 });
  key.shadow.bias = -0.00008;
  key.shadow.normalBias = 0.008;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#e9e9ee', surfaces.finish === 'realistic' ? 0.55 : 0.75);
  fill.position.set(8, 2, 10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#d4dce1', 1.6);
  rim.position.set(5, 8, -7);
  scene.add(rim);

  let disposed = false;
  let prepared = false;
  let contextLost = false;
  let selected = null;
  let phase = 'overview';
  let selectedModule = null;
  let modulePhase = 'closed';
  let view = 'perspective';
  let hovered = null;
  let frame = 0;
  let stages = [];
  let activeStage = null;
  let pendingEntry = null;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastPixelRatio = 0;
  let interacting = false;
  let reducedMotion = siteSettings.appearance.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  function rackPose() {
    const direction = worldDirection(view === 'front' ? new THREE.Vector3(0.002, 0.055, 1) : new THREE.Vector3(0.035, 0.09, 1));
    const target = worldPoint(new THREE.Vector3(0, -0.02, 0.38));
    const corners = cornersOf([-2.5, -model.height / 2 - 0.12, FACE_Z - 0.08], [2.5, model.height / 2 + 0.02, FACE_Z + 0.12]).map(worldPoint);
    return fitPose(target, direction, corners, 1.035);
  }
  function overviewPose() { return rackPose(); }
  function projectPose(index) {
    const direction = worldDirection(new THREE.Vector3(0.4, 0.66, 1));
    const target = worldPoint(new THREE.Vector3(0, slotY[index] - 0.03, EXTRACTION + 0.18));
    const corners = cornersOf([-2.2, slotY[index] - heights[index] / 2 - 0.04, EXTRACTION - 2.1], [2.2, slotY[index] + heights[index] / 2 + 0.08, EXTRACTION + 2.67]).map(worldPoint);
    return fitPose(target, direction, corners, 1.18, 7.6);
  }
  function modulePose(moduleId) {
    const assembly = moduleAssemblies.find(item => item.moduleId === moduleId);
    const pose = projectPose(assembly?.projectIndex ?? selected);
    if (!assembly) return pose;
    const shift = worldDirection(new THREE.Vector3(0, 0, 1)).multiplyScalar(0.45);
    pose.position.add(shift);
    pose.target.add(shift).add(worldDirection(new THREE.Vector3(1, 0, 0)).multiplyScalar(assembly.group.position.x * 0.18));
    return pose;
  }
  function projectScreen(index) { return projectScreens.find(item => item.index === index); }
  function screenCorners(index) {
    const screen = projectScreen(index);
    if (!screen) return [];
    const { mesh, width, height } = screen;
    return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => mesh.localToWorld(new THREE.Vector3(x * width / 2, y * height / 2, 0.008)));
  }
  function entryPose(index) {
    const screen = projectScreen(index);
    if (!screen) return projectPose(index);
    const target = screen.mesh.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.mesh.getWorldQuaternion(new THREE.Quaternion()));
    const direction = normal.add(worldDirection(new THREE.Vector3(0, 0, 0.16))).normalize();
    return fitPose(target, direction, screenCorners(index), 1.12, 0.95);
  }
  function publishProjectScreen() {
    const screen = projectScreen(selected);
    if (!screen || (phase !== 'project' && phase !== 'entering') || modulePhase === 'returning' || modulePhase === 'extracting') {
      onProjectScreen(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const points = screenCorners(selected).map(point => point.project(camera));
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.mesh.getWorldQuaternion(new THREE.Quaternion()));
    const visible = camera.position.clone().sub(screen.mesh.getWorldPosition(new THREE.Vector3())).dot(normal) > 0 && points.every(point => point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1);
    onProjectScreen(visible ? { index: selected, moduleId: selectedModule, corners: points.map(point => ({ x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 })) } : null);
  }
  function inspectionPose() { return selectedModule === null ? projectPose(selected) : modulePose(selectedModule); }
  function emitModule(nextPhase, moduleId = selectedModule) {
    modulePhase = nextPhase;
    onModuleChange({ moduleId, phase: modulePhase, collectionId: collection.id });
  }
  function updateControls(preservePose = false) {
    controls.enabled = !activeStage && modulePhase !== 'returning' && modulePhase !== 'extracting' && (phase === 'overview' || phase === 'project');
    if (controls.enabled) {
      const pose = phase === 'project' ? inspectionPose() : overviewPose();
      const distance = pose.position.distanceTo(pose.target);
      const minimum = phase === 'project' ? Math.max(3.8, distance * 0.5) : Math.max(6, distance * 0.55);
      controls.minDistance = preservePose ? Math.min(minimum, controls.getDistance()) : minimum;
      controls.maxDistance = distance * 1.2;
      controls.minAzimuthAngle = -0.5;
      controls.maxAzimuthAngle = 0.6;
      controls.minPolarAngle = preservePose ? 0 : phase === 'project' ? 0.5 : 0.9;
      controls.cursor.copy(preservePose ? controls.target : pose.target);
      controls.maxTargetRadius = phase === 'project' ? 1.5 : 2;
      controls.update();
    }
    canvas.style.cursor = controls.enabled ? 'grab' : 'default';
  }
  function emit(nextPhase, index = selected, preservePose = false) {
    phase = nextPhase;
    updateControls(preservePose);
    onPhase({ phase, index, collectionId: collection.id });
  }
  function capture() {
    return { position: camera.position.clone(), target: controls.target.clone(), slides: bays.map((bay) => bay.position.z), moduleSlides: moduleAssemblies.map(item => item.group.position.z) };
  }
  function queueStage(nextPhase, duration, target, slides, index, extra = {}) {
    stages.push({ phase: nextPhase, duration: reducedMotion ? 0 : duration, position: target.position.clone(), target: target.target.clone(), slides: [...slides], moduleSlides: moduleAssemblies.map(() => 0), index, ...extra });
  }
  function beginNext(now) {
    const next = stages.shift();
    if (!next) { activeStage = null; return; }
    activeStage = { ...next, startedAt: now, lastAt: now, elapsed: 0 };
    if (next.modulePhase) emitModule(next.modulePhase, next.moduleId);
    emit(next.phase, next.index);
  }
  function applyStage(stage, dt, snap = false) {
    let mechanicsSettled = true;
    let cameraSettled = true;
    function advance(value, velocity, target, frequency, positionLimit, speedLimit, minimum, maximum) {
      if (snap) return { value: target, velocity: 0, settled: true };
      const next = stepSpring(value, velocity, target, frequency, dt, minimum, maximum);
      next.settled = Math.abs(next.value - target) <= positionLimit && Math.abs(next.velocity) <= speedLimit;
      if (next.settled) { next.value = target; next.velocity = 0; }
      return next;
    }
    for (const axis of ['x', 'y', 'z']) {
      const position = advance(camera.position[axis], cameraVelocity[axis], stage.position[axis], stage.entry || stage.zoom ? 23 : 20, 0.003, 0.015);
      const target = advance(controls.target[axis], targetVelocity[axis], stage.target[axis], stage.entry || stage.zoom ? 24 : 22, 0.003, 0.015);
      camera.position[axis] = position.value;
      cameraVelocity[axis] = position.velocity;
      controls.target[axis] = target.value;
      targetVelocity[axis] = target.velocity;
      cameraSettled &&= position.settled && target.settled;
    }
    camera.lookAt(controls.target);
    bays.forEach((bay, index) => {
      const next = advance(bay.position.z, motion.bays[index], stage.slides[index], 20, 0.0025, 0.02, 0, EXTRACTION);
      bay.position.z = next.value;
      motion.bays[index] = next.velocity;
      mechanicsSettled &&= next.settled;
      interiors[index].visible = true;
    });
    moduleAssemblies.forEach((item, index) => {
      const next = advance(item.group.position.z, motion.modules[index], stage.moduleSlides[index], 24, 0.0025, 0.02, 0, 1.35);
      item.group.position.z = next.value;
      motion.modules[index] = next.velocity;
      mechanicsSettled &&= next.settled;
    });
    return mechanicsSettled && (stage.follow || cameraSettled);
  }
  function requestRender() {
    if (prepared && !frame && !disposed && !contextLost && !document.hidden) frame = requestAnimationFrame(render);
  }
  function drawScene() {
    try {
      models.forEach(built => built.updateMechanisms?.());
      for (const state of shadowStates) {
        state.object.updateMatrix();
        if (state.visible !== state.object.visible || !state.matrix.equals(state.object.matrix)) {
          renderer.shadowMap.needsUpdate = true;
          state.matrix.copy(state.object.matrix);
          state.visible = state.object.visible;
        }
      }
      renderer.render(scene, camera);
      publishProjectScreen();
      return true;
    } catch (error) {
      contextLost = true;
      pendingEntry = null;
      stages = [];
      activeStage = null;
      onError(error);
      return false;
    }
  }
  function render(now) {
    frame = 0;
    if (disposed || contextLost || document.hidden) return;
    if (!activeStage && stages.length) beginNext(now);
    let finishedEntry = null;
    // Reduced motion resolves the same state changes immediately, without simulating rapid movement.
    while (activeStage) {
      const dt = THREE.MathUtils.clamp((now - activeStage.lastAt) / 1000, 0, 0.05);
      activeStage.lastAt = Math.max(activeStage.lastAt, now);
      activeStage.elapsed += dt;
      const snap = reducedMotion || activeStage.duration === 0 || now - activeStage.startedAt >= activeStage.duration;
      if (!applyStage(activeStage, dt, snap)) break;
      const finishedPhase = activeStage.phase;
      const preservePose = Boolean(activeStage.zoom);
      const entry = activeStage.entry;
      if (activeStage.modulePhase) emitModule(activeStage.modulePhase === 'extracting' ? 'open' : 'closed', activeStage.modulePhase === 'extracting' ? activeStage.moduleId : null);
      activeStage = null;
      if (stages.length) beginNext(now);
      else if (entry) finishedEntry = entry;
      else {
        emit(selected === null ? 'overview' : 'project', selected, preservePose);
        if (finishedPhase === 'returning' && selected === null) controls.update();
      }
    }
    updateDrawingRatio();
    if (!drawScene()) return;
    if (finishedEntry && pendingEntry === finishedEntry && !disposed && !contextLost) {
      pendingEntry = null;
      emit('project', finishedEntry.index, true);
      if (finishedEntry.moduleId === null) onProjectOpen(finishedEntry.index);
      else onModuleOpen(finishedEntry.moduleId);
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
  function queueModuleReturn(current) {
    const assembly = moduleAssemblies[current.moduleSlides.findIndex(position => position > 0.002)];
    const owner = assembly?.projectIndex;
    if (!Number.isInteger(owner) || owner < 0 || owner >= bays.length) {
      emitModule('closed', null);
      return;
    }
    queueStage('project', 220, { position: current.position, target: current.target }, current.slides, owner, { modulePhase: 'returning', moduleId: assembly.moduleId });
  }
  function inspectModule(moduleId) {
    if (selected === null || (phase !== 'project' && phase !== 'entering')) return;
    const assembly = moduleAssemblies.find(item => item.moduleId === moduleId && item.projectIndex === selected);
    if (moduleId !== null && !assembly) return;
    if (phase === 'entering') {
      pendingEntry = null;
      stages = [];
      activeStage = null;
      emit('project');
    }
    const next = assembly?.moduleId ?? null;
    if (next === selectedModule && (modulePhase === 'open' || modulePhase === 'extracting' || modulePhase === 'closed')) return;
    const current = capture();
    selectedModule = next;
    stages = [];
    activeStage = null;
    clearHover();
    queueModuleReturn(current);
    if (next !== null) {
      const moduleSlides = moduleAssemblies.map(item => item === assembly ? 1.35 : 0);
      queueStage('project', 480, modulePose(next), current.slides, selected, { moduleSlides, modulePhase: 'extracting', moduleId: next });
    } else if (stages.length) {
      const last = stages[stages.length - 1];
      const pose = projectPose(selected);
      last.position.copy(pose.position);
      last.target.copy(pose.target);
    }
    if (stages.length) beginNext(performance.now());
    else updateControls();
    requestRender();
  }
  function setCollection(id) {
    const next = collections.find(item => item.id === id);
    if (!next || disposed || contextLost) return false;
    pendingEntry = null;
    stages = [];
    activeStage = null;
    pointerDown = null;
    activePointers.clear();
    models.forEach((built, index) => {
      built.bays.forEach(bay => { bay.position.z = 0; });
      built.interiors.forEach(interior => { interior.visible = true; });
      built.highlights.forEach(highlight => { highlight.visible = false; });
      built.moduleAssemblies?.forEach(item => { item.group.position.z = 0; });
      motionStates[index].bays.fill(0);
      motionStates[index].modules.fill(0);
      built.updateMechanisms?.();
    });
    collection = next;
    units = collection.units;
    model = models[collections.indexOf(collection)];
    motion = motionStates[collections.indexOf(collection)];
    cameraVelocity.set(0, 0, 0);
    targetVelocity.set(0, 0, 0);
    ({ rack, bays, interiors, highlights, hitTargets, projectLinkTargets = [], projectScreens = [], moduleAssemblies = [], slotY, heights } = model);
    selected = null;
    selectedModule = null;
    hovered = null;
    view = 'perspective';
    const pose = overviewPose();
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.lookAt(pose.target);
    scene.updateMatrixWorld(true);
    emitModule('closed', null);
    onHover(null);
    emit('overview', null);
    requestRender();
    return true;
  }
  function enterProject(index, moduleId = null) {
    if (disposed || contextLost || pendingEntry || phase !== 'project' || index !== selected || !Number.isInteger(index) || index < 0 || index >= units.length) return false;
    if (moduleId !== null && (moduleId !== selectedModule || modulePhase !== 'open' || !moduleAssemblies.some(item => item.moduleId === moduleId && item.projectIndex === index))) return false;
    const entry = { index, moduleId };
    const current = capture();
    const pose = entryPose(index, moduleId);
    pendingEntry = entry;
    pointerDown = null;
    activePointers.clear();
    stages = [];
    activeStage = null;
    clearHover();
    queueStage('entering', 500, pose, current.slides, index, { moduleSlides: current.moduleSlides, entry });
    beginNext(performance.now());
    if (reducedMotion) {
      applyStage(activeStage, 0, true);
      activeStage = null;
      pendingEntry = null;
      if (!drawScene()) return false;
      emit('project', index, true);
      if (moduleId === null) onProjectOpen(index);
      else onModuleOpen(moduleId);
    }
    requestRender();
    return true;
  }
  function select(index) {
    pendingEntry = null;
    const next = Number.isInteger(index) && index >= 0 && index < bays.length ? index : null;
    if (next === selected && ((next === null && phase === 'overview') || phase === 'project')) {
      if (selectedModule !== null) inspectModule(null);
      return;
    }
    const previous = selected;
    selectedModule = null;
    selected = next;
    stages = [];
    activeStage = null;
    clearHover();
    controls.enabled = false;
    const overview = overviewPose();
    const current = capture();
    queueModuleReturn(current);
    const hasSlide = current.slides.some((position) => position > 0.005);
    const cameraAway = current.position.distanceTo(overview.position) > 0.02 || current.target.distanceTo(overview.target) > 0.02;
    if (cameraAway || hasSlide) queueStage('returning', next === null ? 600 : 260, overview, bays.map(() => 0), previous);
    if (next !== null) {
      const slides = bays.map(() => 0);
      slides[next] = EXTRACTION;
      const focus = projectPose(next);
      queueStage('extracting', cameraAway || hasSlide ? 640 : 780, focus, slides, next);
    }
    if (!stages.length) { emit('overview'); requestRender(); return; }
    beginNext(performance.now());
    requestRender();
  }
  function poseForStage(stage) {
    if (stage.zoom) return { position: stage.position, target: stage.target };
    if (stage.entry) return entryPose(stage.entry.index, stage.entry.moduleId);
    if (stage.follow) {
      const overview = overviewPose();
      const focus = projectPose(stage.index);
      return { position: overview.position.lerp(focus.position, 0.28), target: overview.target.lerp(focus.target, 0.28) };
    }
    if (stage.modulePhase) return stage.modulePhase === 'extracting' ? modulePose(stage.moduleId) : projectPose(stage.index);
    return stage.phase === 'focusing' || stage.phase === 'extracting' ? projectPose(stage.index) : overviewPose();
  }
  function updateDrawingRatio() {
    if (!lastWidth || !lastHeight) return;
    const restingRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
    const moving = activeStage || stages.length || interacting;
    const desired = moving ? Math.min(window.devicePixelRatio || 1, 1.5) : restingRatio;
    const budget = moving ? MOVING_DRAWING_PIXELS : MAX_DRAWING_PIXELS;
    const pixelRatio = Math.min(desired, Math.sqrt(budget / (lastWidth * lastHeight)), maxBufferSize / lastWidth, maxBufferSize / lastHeight);
    if (pixelRatio !== lastPixelRatio) {
      lastPixelRatio = pixelRatio;
      renderer.setDrawingBufferSize(lastWidth, lastHeight, pixelRatio);
    }
  }
  function resize() {
    if (disposed || contextLost) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const sizeChanged = width !== lastWidth || height !== lastHeight;
    lastWidth = width;
    lastHeight = height;
    // Restore the 1.5 density floor at rest; use device density up to 1.5 while moving.
    if (sizeChanged) lastPixelRatio = 0;
    updateDrawingRatio();
    if (!sizeChanged) { requestRender(); return; }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!activeStage && !stages.length) {
      const pose = selected === null ? overviewPose() : inspectionPose();
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      cameraVelocity.set(0, 0, 0);
      targetVelocity.set(0, 0, 0);
      camera.lookAt(pose.target);
      updateControls();
    } else {
      const now = performance.now();
      if (activeStage) {
        const pose = poseForStage(activeStage);
        activeStage.lastAt = now;
        activeStage.position.copy(pose.position);
        activeStage.target.copy(pose.target);
      }
      stages.forEach((stage) => {
        const pose = poseForStage(stage);
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
  function hitData(event, targets) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false)[0]?.object.userData ?? null;
  }
  function hitAt(event, targets = hitTargets) { return hitData(event, targets)?.index ?? null; }
  function pointerMove(event) {
    if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) >= 7) pointerDown.dragged = true;
    if (event.pointerType === 'touch' || pointerDown) return;
    if (phase === 'project') {
      if (modulePhase === 'extracting' || modulePhase === 'returning') return;
      const link = hitAt(event, [...projectLinkTargets.filter(target => target.userData.index === selected), ...projectScreens.filter(item => item.index === selected).map(item => item.mesh)]);
      const module = hitData(event, moduleAssemblies.filter(item => item.projectIndex === selected).map(item => item.hitTarget));
      canvas.style.cursor = link === selected || module || hitAt(event) === selected ? 'pointer' : 'grab';
      return;
    }
    if (phase !== 'overview') return;
    const index = hitAt(event);
    if (hovered !== index) setHover(index, true);
    const neighbor = index === null ? hitData(event, rackTargets.filter(target => target.userData.collectionId !== collection.id)) : null;
    canvas.style.cursor = index !== null || neighbor ? 'pointer' : 'grab';
  }
  function pointerStart(event) {
    if (event.button !== 0 || !controls.enabled) return;
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
      else {
        const neighbor = hitData(event, rackTargets.filter(target => target.userData.collectionId !== collection.id));
        if (neighbor) onCollectionSelect(neighbor.collectionId);
      }
    } else if (phase === 'project' && modulePhase !== 'extracting' && modulePhase !== 'returning' && distance < 7 && !dragged) {
      const index = hitAt(event, [...projectLinkTargets.filter(target => target.userData.index === selected), ...projectScreens.filter(item => item.index === selected).map(item => item.mesh)]);
      if (index === selected) { onEntryRequest(index, selectedModule); return; }
      const module = hitData(event, moduleAssemblies.filter(item => item.projectIndex === selected).map(item => item.hitTarget));
      if (module) {
        if (selectedModule === module.moduleId && modulePhase === 'open') onEntryRequest(selected, module.moduleId);
        else onModuleSelect(module.moduleId);
      } else if (hitAt(event) === selected) onEntryRequest(selected, selectedModule);
    }
  }
  function pointerCancel(event) { activePointers.delete(event.pointerId); pointerDown = null; clearHover(); }
  function visibilityChange() {
    if (document.hidden) {
      hiddenAt = performance.now();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else {
      if (activeStage && hiddenAt !== null) { activeStage.startedAt += performance.now() - hiddenAt; activeStage.lastAt = performance.now(); }
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
    pendingEntry = null;
    stages = [];
    activeStage = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const error = new Error('The 3D graphics context was interrupted.');
    error.code = 'CONTEXT_LOST';
    onProjectScreen(null);
    onError(error);
  }
  function controlStart() { interacting = true; requestRender(); }
  function controlEnd() { interacting = false; requestRender(); }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerStart);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', clearHover);
  canvas.addEventListener('webglcontextlost', contextLoss);
  controls.addEventListener('start', controlStart);
  controls.addEventListener('end', controlEnd);
  document.addEventListener('visibilitychange', visibilityChange);
  controls.addEventListener('change', requestRender);
  resize();
  emit('overview');
  function disposeScene() {
    if (disposed) return;
    disposed = true;
    pendingEntry = null;
    stages = [];
    activeStage = null;
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    pixelRatioQuery.removeEventListener('change', pixelRatioChange);
    controls.removeEventListener('change', requestRender);
    controls.removeEventListener('start', controlStart);
    controls.removeEventListener('end', controlEnd);
    controls.dispose();
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerdown', pointerStart);
    canvas.removeEventListener('pointerup', pointerEnd);
    canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('pointerleave', clearHover);
    canvas.removeEventListener('webglcontextlost', contextLoss);
    document.removeEventListener('visibilitychange', visibilityChange);
    models.forEach(item => item.dispose());
    datacenter.dispose();
    surfaces.dispose();
    rackTargetGeometries.forEach(geometry => geometry.dispose());
    rackTargetMaterial.dispose();
    environment.dispose();
    key.shadow.map?.dispose();
    renderer.dispose();
  }
  // Upload every resident rack's maps and compile its materials before navigation is enabled.
  try {
    scene.traverse(object => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) renderer.initTexture(value); });
      });
    });
    await renderer.compileAsync(scene, camera);
  } catch (error) {
    disposeScene();
    throw error;
  }
  prepared = true;
  requestRender();
  onReady();

  return {
    select,
    restoreState(index, moduleId = null) {
      if (disposed || contextLost) return;
      pendingEntry = null;
      stages = [];
      activeStage = null;
      selected = Number.isInteger(index) && units[index] ? index : null;
      const assembly = selected === null ? null : moduleAssemblies.find(item => item.projectIndex === selected && item.moduleId === moduleId);
      selectedModule = assembly?.moduleId ?? null;
      bays.forEach((bay, position) => { bay.position.z = position === selected ? EXTRACTION : 0; });
      moduleAssemblies.forEach(item => { item.group.position.z = item === assembly ? 1.35 : 0; });
      motion.bays.fill(0);
      motion.modules.fill(0);
      cameraVelocity.set(0, 0, 0);
      targetVelocity.set(0, 0, 0);
      const pose = selected === null ? overviewPose() : inspectionPose();
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      camera.lookAt(pose.target);
      emitModule(selectedModule ? 'open' : 'closed', selectedModule);
      emit(selected === null ? 'overview' : 'project', selected);
      requestRender();
    },
    inspectModule,
    setCollection,
    enterProject,
    refresh: requestRender,
    restoreInspection() {
      pendingEntry = null;
      stages = [];
      activeStage = null;
      cameraVelocity.set(0, 0, 0);
      targetVelocity.set(0, 0, 0);
      const pose = selected === null ? overviewPose() : inspectionPose();
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      camera.lookAt(pose.target);
      emit(selected === null ? 'overview' : 'project', selected);
      requestRender();
    },
    zoom(direction) {
      if (!controls.enabled && !activeStage?.zoom) return;
      const target = activeStage?.zoom ? activeStage.target.clone() : controls.target.clone();
      const offset = (activeStage?.zoom ? activeStage.position : camera.position).clone().sub(target);
      const distance = THREE.MathUtils.clamp(offset.length() * (direction === 'in' ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      const current = capture();
      stages = [];
      activeStage = null;
      queueStage(phase, 340, { position: target.clone().add(offset.setLength(distance)), target }, current.slides, selected, { moduleSlides: current.moduleSlides, zoom: true });
      beginNext(performance.now());
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
        const point = worldPoint(new THREE.Vector3(0, slotY[index], FACE_Z + bays[index].position.z + 0.08)).project(camera);
        const x = (point.x + 1) * 0.5 * lastWidth;
        const y = (1 - point.y) * 0.5 * lastHeight;
        return { index, id: unit.id, u: unit.u, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), pageX: Number((rect.left + x).toFixed(1)), pageY: Number((rect.top + y).toFixed(1)), visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1 };
      });
      const projectLinks = projectLinkTargets.map(target => {
        const point = target.getWorldPosition(new THREE.Vector3()).project(camera);
        return { index: target.userData.index, pageX: rect.left + (point.x + 1) * lastWidth / 2, pageY: rect.top + (1 - point.y) * lastHeight / 2 };
      });
      const screenCenters = projectScreens.map(item => {
        const point = item.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
        return { index: item.index, pageX: rect.left + (point.x + 1) * lastWidth / 2, pageY: rect.top + (1 - point.y) * lastHeight / 2 };
      });
      const moduleCenters = moduleAssemblies.map(item => {
        const point = item.hitTarget.getWorldPosition(new THREE.Vector3()).project(camera);
        return { moduleId: item.moduleId, projectIndex: item.projectIndex, index: item.index, slide: Number(item.group.position.z.toFixed(3)), pageX: rect.left + (point.x + 1) * lastWidth / 2, pageY: rect.top + (1 - point.y) * lastHeight / 2, visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1 };
      });
      const rackCenters = rackTargets.map((target, index) => {
        const point = target.getWorldPosition(new THREE.Vector3()).project(camera);
        return { id: collections[index].id, pageX: rect.left + (point.x + 1) * lastWidth / 2, pageY: rect.top + (1 - point.y) * lastHeight / 2, visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1 };
      });
      return { selectedModule, modulePhase, moduleCenters, pendingFrames: Boolean(frame || activeStage || stages.length), mode, collectionId: collection.id, rackCenters, datacenter: datacenter.stats, phase, selected, hovered, view, reducedMotion, toneMapping: renderer.toneMapping, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, totalU: model.totalU, units: units.map(unit => ({ id: unit.id, u: unit.u, type: unit.type })), frontCenters, projectLinks, screenCenters, distance: controls.getDistance(), zoomLimits: [controls.minDistance, controls.maxDistance], slides: bays.map(bay => Number(bay.position.z.toFixed(3))), camera: camera.position.toArray().map(value => Number(value.toFixed(3))), size: [lastWidth, lastHeight], quality: { moving: Boolean(activeStage || stages.length || interacting), surfaces: surfaces.getState(), samples, pixelRatio: lastPixelRatio, drawingBuffer: [canvas.width, canvas.height], maxPixels: MAX_DRAWING_PIXELS }, contextLost };
    },
    dispose: disposeScene,
  };
}
