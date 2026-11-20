// Sweep playback. Clouds stay in laser_link. Recorded map paths use the
// inverse of each frame's mapFromLaser transform before camera projection.
import { decodeFrame } from "./recording/decode.mjs";
import { near, pathTopics, view, mapToView, focalLength, project } from "./recording-camera.mjs";

const canvas = document.querySelector(".scan");
const button = document.querySelector(".pause");
const status = document.querySelector(".scan-status");
const seek = document.querySelector("[data-replay-seek]");
const time = document.querySelector("[data-replay-time]");
const scrollStory = document.querySelector(".scan-story");
const scrollHint = document.querySelector(".scan-scroll-hint");
const carousel = document.querySelector("[data-replay-carousel]");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const scrollEnabled = () => scrollStory && !reducedMotion.matches;
// The transparent canvas leaves the still visible until the first frame draws.
const ctx = canvas.getContext("2d");
const asset = (name) => new URL(`${canvas.dataset.recording ?? "recording"}/${name}`, import.meta.url);

async function fetchAsset(name, signal) {
  const response = await fetch(asset(name), { signal });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response;
}

function decodedStream(response, format) {
  // Fetch decodes an HTTP representation. Without that header the static
  // server is serving the compressed file itself.
  if (response.headers.has("Content-Encoding")) return response.body;
  return response.body.pipeThrough(new DecompressionStream(format));
}

async function loadClouds(name, byteLength, { onBytes, signal } = {}) {
  const response = await fetchAsset(name, signal);
  const bytes = new Uint8Array(byteLength);
  const reader = decodedStream(response, "brotli").getReader();
  let offset = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes.set(value, offset);
      offset += value.length;
      onBytes?.(bytes, offset);
    }
  } finally {
    await reader.cancel();
  }
  if (offset !== bytes.length) throw new Error("Incomplete LiDAR recording");
  return bytes;
}

async function loadGzipJSON(name, signal) {
  const response = await fetchAsset(name, signal);
  return new Response(decodedStream(response, "gzip")).json();
}

async function loadRecording(onBytes, signal) {
  const manifest = await (await fetchAsset("manifest.json", signal)).json();
  const [paths, cones] = await Promise.all([
    manifest.paths ? loadGzipJSON(manifest.paths.data, signal) : null,
    canvas.hasAttribute("data-cone-overlay") ? loadGzipJSON("cones.json.gz", signal) : null,
  ]);
  const clip = { manifest, paths, cones };
  if (manifest.chunks) {
    clip.chunkLengths = [];
    for (const frame of manifest.frames) {
      clip.chunkLengths[frame.chunk] = frame.byteOffset + frame.byteLength;
    }
  } else {
    const last = manifest.frames.at(-1);
    clip.bytes = await loadClouds(manifest.data, last.byteOffset + last.byteLength, {
      signal,
      onBytes(bytes, offset) {
        clip.bytes = bytes;
        onBytes(clip, offset);
      },
    });
  }
  return clip;
}

let width = 0;
let height = 0;
let focal = 0;

function screen(point) {
  return project(point, width, height, focal);
}

function clipToNear(a, b) {
  const t = (near - a[2]) / (b[2] - a[2]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near];
}

function drawPath(poses, transform, color, dash) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let previous;
  let joined = false;
  for (const { position } of poses) {
    const point = mapToView(position, transform);
    if (previous && (previous[2] >= near || point[2] >= near)) {
      if (previous[2] < near) ctx.moveTo(...screen(clipToNear(previous, point)));
      else if (!joined) ctx.moveTo(...screen(previous));
      ctx.lineTo(...screen(point[2] < near ? clipToNear(point, previous) : point));
      joined = point[2] >= near;
    }
    previous = point;
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

const coneColors = {
  blue: "#3d8bff",
  yellow: "#ffd43b",
  orange: "#ff7a2f",
  unknown: "#c9d6db",
};
const lightConeColors = { blue: "#1b5eb8", yellow: "#ffd43b", orange: "#a34013", unknown: "#47596b" };

function drawCones(detections) {
  const classified = canvas.dataset.coneOverlay === "classified";
  for (const { position, color } of detections) {
    if (classified && color === "unknown") continue;
    const point = view(...position);
    if (point[2] < near) continue;
    const [x, y] = screen(point);
    if (x < 0 || x > width || y < 0 || y > height) continue;
    const radius = Math.max(3, Math.min(9, (0.19 * focal) / point[2]));
    ctx.fillStyle = (lightTheme ? lightConeColors : coneColors)[color];
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius * 0.7, y + radius * 0.5);
    ctx.lineTo(x - radius * 0.7, y + radius * 0.5);
    ctx.closePath();
    ctx.fill();
    if (lightTheme && color === "yellow") {
      ctx.strokeStyle = "#57460e";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

let recording;
let download;
let loadedBytes = 0;
let loadFailed = false;
let frameIndex = 0;
let points;
let still;
let selection = new AbortController();
let lightTheme = false;
let playing = false;
let visible = true;
let nextFrame = 0;
let animation = 0;
let buffering = false;
let seekRevision = 0;
let displayedChunk;
let retryFrame;
const chunks = new Map();

function loadChunk(index) {
  if (!chunks.has(index)) {
    const controller = new AbortController();
    const chunk = { controller };
    chunks.set(index, chunk);
    chunk.promise = loadClouds(recording.manifest.chunks[index], recording.chunkLengths[index], {
      signal: controller.signal,
    }).then((bytes) => { chunk.bytes = bytes; }).catch((error) => {
      if (chunks.get(index) === chunk) chunks.delete(index);
      throw error;
    });
  }
  return chunks.get(index).promise;
}

function discardOtherChunks(index) {
  for (const [number, chunk] of chunks) {
    if (index != null && (number === index || number === index + 1)) continue;
    chunk.controller.abort();
    chunks.delete(number);
  }
}

function draw() {
  const cloud = points ?? still?.points;
  if (!cloud || !width || !height) return;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = lightTheme ? "#e5edf1" : "#0b1f2a";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = lightTheme ? "#185747" : "#92d3c7";
  ctx.globalAlpha = 0.48;
  for (let i = 0; i < cloud.length; i += 3) {
    const p = view(cloud[i], cloud[i + 1], cloud[i + 2]);
    if (p[2] < near) continue;
    const [x, y] = screen(p);
    if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue;
    const size = Math.min(3, Math.max(0.8, (0.034 * focal) / p[2]));
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  const frame = points ? recording.manifest.frames[frameIndex] : null;
  const transform = frame ? frame.mapFromLaserRowMajor : still.transform;
  if (transform) {
    for (const [topic, color, dash] of pathTopics) {
      const poses = frame
        ? recording.paths?.[topic]?.[frame.pathEvents?.[topic]?.index]?.poses
        : still.paths[topic];
      if (poses) {
        const stroke = lightTheme ? (dash.length ? "#183452" : "#2b716f") : color;
        drawPath(poses, transform, stroke, dash);
      }
    }
  }
  const detections = frame ? recording.cones?.frames[frameIndex]?.detections : still.cones;
  if (detections) drawCones(detections);
}

function replayClock(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function updatePosition() {
  if (!seek) return;
  const elapsed = recording.manifest.frames[frameIndex].timeSeconds.toFixed(1);
  const duration = recording.manifest.durationSeconds.toFixed(1);
  seek.value = String(frameIndex);
  seek.setAttribute("aria-valuetext", `${elapsed} of ${duration} seconds`);
  time.textContent = duration >= 60
    ? `${replayClock(elapsed)} / ${replayClock(duration)}`
    : `${elapsed} / ${duration} s`;
}

function showFrame(index) {
  const frame = recording.manifest.frames[index];
  const bytes = frame.chunk == null ? recording.bytes : chunks.get(frame.chunk)?.bytes;
  if (!bytes) return false;
  if (frame.chunk != null && frame.chunk !== displayedChunk) {
    discardOtherChunks(frame.chunk);
    if (frame.chunk + 1 < recording.manifest.chunks.length)
      loadChunk(frame.chunk + 1).catch(() => {}); // A foreground seek or playback can retry.
    displayedChunk = frame.chunk;
  }
  const firstDraw = !points;
  frameIndex = index;
  points = decodeFrame(bytes, frame);
  still = undefined;
  if (firstDraw) resize();
  else draw();
  updatePosition();
  return true;
}

async function bufferFrame(index) {
  const revision = ++seekRevision;
  const chunk = recording.manifest.frames[index].chunk;
  buffering = true;
  status.textContent = "Buffering recording…";
  discardOtherChunks(chunk);
  try {
    await loadChunk(chunk);
    if (revision !== seekRevision) return false;
    retryFrame = undefined;
    status.textContent = "";
    return showFrame(index);
  } catch (error) {
    if (revision !== seekRevision) return false;
    stop("Retry recording");
    retryFrame = index;
    status.textContent = "This part of the recording couldn’t load. Try again.";
    console.warn("LiDAR playback:", error);
    return false;
  } finally {
    if (revision === seekRevision) buffering = false;
  }
}

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  if (!points && !still) return;
  canvas.width = Math.round(width * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);
  focal = focalLength(width, height);
  draw();
}

function stop(label) {
  playing = false;
  seekRevision++;
  if (buffering) status.textContent = "";
  buffering = false;
  button.textContent = label;
  cancelAnimationFrame(animation);
  animation = 0;
}

function tick(now) {
  animation = 0;
  if (!playing || !visible || document.hidden) return;
  if (now >= nextFrame) {
    const frames = recording.manifest.frames;
    if (frameIndex === frames.length - 1) {
      stop("Replay recording");
      return;
    }
    if (!showFrame(frameIndex + 1)) {
      bufferFrame(frameIndex + 1).then((ready) => { if (ready) resume(); });
      return;
    }
    const following = frames[frameIndex + 1]?.timeSeconds ?? recording.manifest.durationSeconds;
    nextFrame += (following - frames[frameIndex].timeSeconds) * 1000;
  }
  animation = requestAnimationFrame(tick);
}

function resume() {
  if (!playing || !visible || document.hidden || animation || buffering) return;
  const frames = recording.manifest.frames;
  const following = frames[frameIndex + 1]?.timeSeconds ?? recording.manifest.durationSeconds;
  nextFrame = performance.now() + (following - frames[frameIndex].timeSeconds) * 1000;
  animation = requestAnimationFrame(tick);
}

function requestRecording() {
  if (download) return download;
  loadFailed = false;
  status.textContent = "Loading recording…";
  button.disabled = true;
  const { signal } = selection;
  download = loadRecording((clip, offset) => {
    if (signal.aborted) return;
    recording = clip;
    loadedBytes = offset;
    queueScrollFrame();
  }, signal).then((clip) => {
    if (signal.aborted) return false;
    recording = clip;
    button.disabled = false;
    status.textContent = "";
    if (seek) {
      seek.max = String(recording.manifest.frames.length - 1);
      seek.closest("label").hidden = false;
    }
    return true;
  }).catch((error) => {
    if (signal.aborted) return false;
    console.warn("Sweep playback:", error);
    download = undefined;
    loadFailed = true;
    status.textContent = "Recording unavailable. Try again over HTTP in a current browser.";
    button.disabled = false;
    button.hidden = false;
    button.textContent = "Retry recording";
    return false;
  });
  return download;
}

let scrollFrame = 0;
function queueScrollFrame() {
  if (scrollEnabled() && !scrollFrame) {
    scrollFrame = requestAnimationFrame(drawScrollFrame);
  }
}

function drawScrollFrame() {
  scrollFrame = 0;
  if (!scrollEnabled()) return;
  const rect = scrollStory.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top > 0) return;
  if (rect.top < 0 && !download && !loadFailed) requestRecording();
  if (!recording || !loadedBytes) return;

  const travel = rect.height - scrollStory.firstElementChild.offsetHeight;
  if (travel <= 0) return;
  const progress = Math.max(0, Math.min(1, -rect.top / travel));
  const frames = recording.manifest.frames;
  const timestamp = progress * frames.at(-1).timeSeconds;

  // Select the latest frame at the scroll position that has arrived in full.
  let low = 0;
  let high = frames.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    const frame = frames[mid];
    if (frame.timeSeconds <= timestamp && frame.byteOffset + frame.byteLength <= loadedBytes)
      low = mid + 1;
    else high = mid;
  }
  const index = low - 1;
  if (index >= 0 && (!points || index !== frameIndex)) showFrame(index);
}

function updateScrollMode() {
  if (!scrollStory) return;
  const enabled = scrollEnabled();
  scrollStory.toggleAttribute("data-scroll-ready", enabled);
  if (scrollHint) scrollHint.hidden = !enabled;
  button.hidden = enabled && !loadFailed;
  if (enabled) {
    if (playing) stop("Resume recording");
    queueScrollFrame();
  }
}

button.addEventListener("click", async () => {
  if (playing) {
    stop("Resume recording");
    return;
  }
  const { signal } = selection;
  if (!await requestRecording() || signal.aborted) return;
  if (scrollEnabled()) {
    button.hidden = true;
    queueScrollFrame();
    return;
  }
  const beginning = !points || frameIndex === recording.manifest.frames.length - 1;
  const index = retryFrame ?? (beginning ? 0 : undefined);
  if (index != null && !showFrame(index)) {
    button.disabled = true;
    const ready = await bufferFrame(index);
    if (signal.aborted) return;
    button.disabled = false;
    if (!ready) return;
  }
  playing = true;
  button.textContent = "Pause recording";
  resume();
});

seek?.addEventListener("input", () => {
  const index = seek.valueAsNumber;
  retryFrame = undefined;
  stop(index === recording.manifest.frames.length - 1 ? "Replay recording" : "Resume recording");
  status.textContent = "";
  if (!showFrame(index)) bufferFrame(index);
});

const fullscreen = document.querySelector("[data-replay-fullscreen]");
if (fullscreen && document.fullscreenEnabled) {
  const replay = fullscreen.closest(".replay");
  fullscreen.hidden = false;
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await replay.requestFullscreen();
    } catch {
      status.textContent = "Fullscreen is unavailable.";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreen.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen";
  });
}

function syncVisibility() {
  if (visible && !document.hidden) resume();
  else {
    cancelAnimationFrame(animation);
    animation = 0;
  }
}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  syncVisibility();
}).observe(canvas);
document.addEventListener("visibilitychange", syncVisibility);
button.hidden = false;
if (scrollStory) {
  window.addEventListener("scroll", queueScrollFrame, { passive: true });
  window.addEventListener("resize", queueScrollFrame);
  reducedMotion.addEventListener("change", updateScrollMode);
  updateScrollMode();
}

if (carousel) {
  const slides = [...carousel.querySelectorAll("[data-replay-card]")];
  const choices = [...carousel.querySelectorAll("[data-replay-index]")];
  let active;

  async function select(index) {
    if (index === active) return;
    active = index;
    selection.abort();
    selection = new AbortController();
    const { signal } = selection;
    stop("Play recording");
    discardOtherChunks();
    recording = undefined;
    download = undefined;
    points = undefined;
    still = undefined;
    displayedChunk = undefined;
    retryFrame = undefined;
    frameIndex = 0;
    button.disabled = false;
    seek.closest("label").hidden = true;
    status.textContent = "";
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const slide = slides[index];
    slides.forEach((item) => { item.hidden = item !== slide; });
    choices.forEach((choice, position) => choice.setAttribute("aria-pressed", String(position === index)));
    canvas.dataset.recording = slide.dataset.recording;
    if (slide.hasAttribute("data-cone-overlay")) canvas.dataset.coneOverlay = slide.dataset.coneOverlay;
    else delete canvas.dataset.coneOverlay;
    canvas.closest(".replay").setAttribute("aria-label", `${slide.querySelector("h3").textContent} playback`);
    const pointCount = Number(slide.dataset.pointCount);
    try {
      const [bytes, overlay] = await Promise.all([
        loadClouds("still.bin.br", pointCount * 12, { signal }),
        fetchAsset("still.json", signal).then((response) => response.json()),
      ]);
      if (signal.aborted || points) return;
      still = { ...overlay, points: decodeFrame(bytes, { pointCount, byteOffset: 0 }) };
      resize();
    } catch (error) {
      if (!signal.aborted) console.warn("LiDAR still:", error);
    }
  }

  const step = (offset) => select((active + offset + slides.length) % slides.length);
  if (slides.length > 1) {
    const arrows = carousel.querySelector("[data-replay-arrows]");
    const tabs = carousel.querySelector("[data-replay-tabs]");
    arrows.hidden = tabs.hidden = false;
    arrows.querySelectorAll("button").forEach((control) =>
      control.addEventListener("click", () => step(Number(control.dataset.replayStep))));
    choices.forEach((choice, index) => choice.addEventListener("click", () => select(index)));
    carousel.addEventListener("keydown", (event) => {
      if (!event.target.closest("[data-replay-arrows], [data-replay-tabs]") ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    });
    let touchStart;
    const stage = canvas.closest(".replay-stage");
    stage.addEventListener("touchstart", ({ touches }) => {
      touchStart = touches.length === 1 ? touches[0] : undefined;
    }, { passive: true });
    stage.addEventListener("touchend", ({ changedTouches }) => {
      if (!touchStart) return;
      const dx = changedTouches[0].clientX - touchStart.clientX;
      const dy = changedTouches[0].clientY - touchStart.clientY;
      touchStart = undefined;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    stage.addEventListener("touchcancel", () => { touchStart = undefined; });
  }

  const systemTheme = matchMedia("(prefers-color-scheme: light)");
  const root = document.documentElement;
  function updateTheme() {
    lightTheme = root.dataset.theme ? root.dataset.theme === "light" : systemTheme.matches;
    draw();
  }
  new MutationObserver(updateTheme).observe(root, { attributeFilter: ["data-theme"] });
  systemTheme.addEventListener("change", updateTheme);
  updateTheme();
  select(0);
}
