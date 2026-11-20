// Builds the identity directions into standalone static sites:
//   dist/identity/sweep/   dist/identity/channels/   dist/identity/site/
//   dist/identity/index.html (chooser, full build only)
// Content comes from concept/identity/content.js, rendered by views.js (the same
// templates the browser preview uses). The site release writes directly to dist/.
import { access, copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createReadStream } from "node:fs";
import { brotliCompressSync, createBrotliDecompress, gunzipSync, gzipSync } from "node:zlib";
import { near, pathTopics, view, mapToView, focalLength, project } from "../concept/identity/recording-camera.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "concept/identity");
const output = path.join(root, "dist/identity");
const read = (name) => readFile(path.join(source, name), "utf8");

const context = { window: {} };
vm.createContext(context);
for (const name of ["content.js", "views.js"])
  vm.runInContext(await read(name), context, { filename: name });
const { CN, CNViews } = context.window;

const bricolage = ["fonts/bricolage-grotesque-var.woff2", "fonts/BRICOLAGE-GROTESQUE-OFL.txt"];
const archivo = ["fonts/archivo-var.woff2", "fonts/ARCHIVO-OFL.txt"];
// `scan`: the page has the Sweep hero, which can play the recording.
const sites = {
  sweep: {
    scan: true,
    assets: [
      "hero.css",
      "sweep.css",
      "sweep.js",
      "scan.js",
      ...bricolage,
    ],
  },
  channels: {
    assets: ["channels.css", "channels.js", "content.js", "views.js", ...archivo],
  },
  site: {
    scan: true,
    assets: [
      "channels.css",
      "hero.css",
      "site.css",
      "theme.js",
      "fonts/barlow-regular.woff2",
      "fonts/barlow-semibold.woff2",
      "fonts/barlow-condensed-extrabold.woff2",
      "fonts/BARLOW-OFL.txt",
      "channels.js",
      "content.js",
      "views.js",
      "scan.js",
      ...bricolage,
      ...archivo,
    ],
  },
};

// Fill each empty data-slot element and drop preview-only elements.
function render(html, slots, file) {
  html = html.replace(
    /(<(\w+)\b[^>]*\bdata-slot="([\w-]+)"[^>]*>)(<\/\2>)/g,
    (_, open, tag, name, close) => {
      if (slots[name] == null)
        throw new Error(`${file}: no view for slot "${name}"`);
      return open + slots[name] + close;
    },
  );
  const empty = /data-slot="([\w-]+)"[^>]*><\/\w+>/.exec(html);
  if (empty) throw new Error(`${file}: slot "${empty[1]}" left empty`);
  return html.replace(
    /\s*<(\w+)\b[^>]*\bdata-preview-only\b[^>]*>[\s\S]*?<\/\1\s*>/g,
    "",
  );
}

const [target, ...extra] = process.argv.slice(2);
const atRoot = target === "site" && extra.length === 1 && extra[0] === "--root";
if ((!atRoot && extra.length) || (target && !Object.hasOwn(sites, target))) {
  console.error("Usage: node scripts/build-identity.mjs [sweep|channels|site [--root]]");
  process.exit(1);
}

// The verified recording stays outside Git. The hosting job supplies its directory.
const recording = (!target || sites[target].scan) && process.env.SWEEP_RECORDING_DIR;
const coneColors = new Set(["blue", "yellow", "orange", "unknown"]);
function optionalFile(file) {
  return readFile(file).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

function parseCones(bytes, manifest, directory) {
  const cones = JSON.parse(gunzipSync(bytes));
  const valid = cones.version === 1 && cones.frame === manifest.frame &&
    Array.isArray(cones.frames) && cones.frames.length === manifest.frames.length &&
    cones.frames.every((frame, index) =>
      frame.timestampNs === manifest.frames[index].timestampNs &&
      Array.isArray(frame.detections) && frame.detections.every(({ position, color }) =>
        Array.isArray(position) && position.length === 3 &&
        position.every(Number.isFinite) && coneColors.has(color),
      ),
    );
  if (!valid) throw new Error(`Cone detections do not match the LiDAR recording in ${directory}`);
  return cones;
}

function carryConeColours(observed, mapped) {
  const matchRadius = 0.25;
  const claims = new Map();
  const candidates = observed.map(({ position: [x, y] }) =>
    mapped.filter((cone) => {
      const [mapX, mapY] = cone.position;
      if ((mapX - x) ** 2 + (mapY - y) ** 2 > matchRadius ** 2) return false;
      claims.set(cone, (claims.get(cone) ?? 0) + 1);
      return true;
    }));
  return observed.map((cone, index) => {
    const nearby = candidates[index];
    if (cone.color !== "unknown" || nearby.length !== 1 || claims.get(nearby[0]) !== 1) return cone;
    return { ...cone, color: nearby[0].color };
  });
}

async function readRecording(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
  const cloudFiles = manifest.chunks ?? [manifest.data];
  if (
    !cloudFiles.length || new Set(cloudFiles).size !== cloudFiles.length ||
    !cloudFiles.every((file) => /^[a-z0-9-]+\.bin\.br$/.test(file)) ||
    (manifest.paths && manifest.paths.data !== "paths.json.gz") ||
    !manifest.frames.length
  ) throw new Error(`Invalid LiDAR manifest in ${directory}`);

  if (manifest.chunks) {
    let chunk = -1;
    let offset = 0;
    for (const frame of manifest.frames) {
      if (frame.chunk === chunk + 1) {
        chunk++;
        offset = 0;
      }
      if (chunk < 0 || frame.chunk !== chunk || frame.byteOffset !== offset ||
          frame.byteLength !== frame.pointCount * 12)
        throw new Error(`Invalid LiDAR chunk index in ${directory}`);
      offset += frame.byteLength;
    }
    if (chunk + 1 !== cloudFiles.length)
      throw new Error(`LiDAR chunks do not match the frame index in ${directory}`);
  }

  const assets = ["manifest.json", ...cloudFiles];
  if (manifest.paths) assets.push(manifest.paths.data);
  const [labels, measurements] = await Promise.all([
    optionalFile(path.join(directory, "cones.json.gz")),
    optionalFile(path.join(directory, "cones-observed.json.gz")),
  ]);
  const mapped = labels && parseCones(labels, manifest, directory);
  let cones = mapped;
  let coneAsset = labels;
  if (measurements) {
    cones = parseCones(measurements, manifest, directory);
    if (mapped) {
      cones.frames.forEach((frame, index) => {
        frame.detections = carryConeColours(frame.detections, mapped.frames[index].detections);
      });
    }
    coneAsset = gzipSync(JSON.stringify(cones));
  }

  const sizes = await Promise.all(assets.map(async (file) => (await stat(path.join(directory, file))).size));
  if (coneAsset) assets.push("cones.json.gz");
  return {
    directory,
    assets,
    assetPath: "recording",
    sizeMB: sizes.reduce((count, size) => count + size, coneAsset?.length ?? 0) / 1e6,
    cones: Boolean(coneAsset),
    coneAsset,
    classifiedCones: !measurements && cones?.frames.some(({ detections }) =>
      detections.some(({ color }) => color === "blue" || color === "yellow")),
    paths: Boolean(manifest.paths),
    duration: manifest.durationSeconds,
    frameCount: manifest.frames.length,
    manifest,
    coneFrames: cones?.frames,
    recorded: new Date(Number(BigInt(manifest.frames[0].timestampNs) / 1000000n)).toISOString().slice(0, 10),
  };
}

function recordingAsset(recording, file) {
  if (file === "cones.json.gz") return recording.coneAsset;
  return { from: path.resolve(recording.directory, file) };
}

function inReplayView(point) {
  // The replay stage is 2:1 until its phone-height minimum takes over.
  if (point[2] < near) return false;
  const [x, y] = project(point, 2, 1, focalLength(2, 1));
  return x > 0 && x < 2 && y > 0 && y < 1;
}

async function replayStill(replay) {
  const { manifest, coneFrames, directory } = replay;
  const events = manifest.paths
    ? JSON.parse(gunzipSync(await readFile(path.join(directory, manifest.paths.data))))
    : {};
  let selected;
  let best = -1;
  for (const [index, frame] of manifest.frames.entries()) {
    const paths = {};
    const transform = frame.mapFromLaserRowMajor;
    if (transform) {
      for (const [topic] of pathTopics) {
        const poses = events[topic]?.[frame.pathEvents?.[topic]?.index]?.poses;
        if (poses?.length > 1) paths[topic] = poses;
      }
    }
    const cones = (coneFrames?.[index]?.detections ?? []).filter(({ color }) =>
      !replay.classifiedCones || color !== "unknown");
    const pathVisible = Object.values(paths).some((poses) =>
      poses.some(({ position }) => inReplayView(mapToView(position, transform))));
    const hasBlue = cones.some(({ color }) => color === "blue");
    const hasYellow = cones.some(({ color }) => color === "yellow");
    const visibleCones = cones.filter(({ position }) => inReplayView(view(...position)));
    const blueVisible = visibleCones.some(({ color }) => color === "blue");
    const yellowVisible = visibleCones.some(({ color }) => color === "yellow");
    const score = Number(visibleCones.length > 0) + 2 * (Number(pathVisible) + Number(hasBlue) + Number(hasYellow)) +
      8 * (Number(blueVisible) + Number(yellowVisible));
    if (score <= best) continue;
    selected = {
      frame,
      overlay: {
        transform,
        paths: Object.fromEntries(Object.entries(paths).map(([topic, poses]) =>
          [topic, poses.map(({ position }) => ({ position }))])),
        cones,
      },
    };
    best = score;
    if (pathVisible && blueVisible && yellowVisible) break;
  }

  const { pointCount, byteLength, byteOffset, chunk } = selected.frame;
  if (byteLength !== pointCount * 12)
    throw new Error(`Invalid LiDAR preview frame in ${directory}`);
  const source = createReadStream(path.join(directory, manifest.chunks?.[chunk] ?? manifest.data));
  const decoded = createBrotliDecompress();
  source.on("error", (error) => decoded.destroy(error));
  source.pipe(decoded);
  const frame = Buffer.alloc(byteLength);
  let written = 0;
  let skip = byteOffset;
  try {
    for await (const bytes of decoded) {
      const start = Math.min(skip, bytes.length);
      skip -= start;
      written += bytes.copy(frame, written, start);
      if (written === frame.length)
        return { pointCount, bytes: brotliCompressSync(frame), overlay: selected.overlay };
    }
    throw new Error(`Incomplete LiDAR preview frame in ${directory}`);
  } finally {
    source.destroy();
  }
}

let scan;
let replays = [];
if (recording) {
  scan = await readRecording(recording);
  await access(path.join(recording, "decode.mjs"));
  scan.assets.push("decode.mjs");
  scan.sizeMB = Math.round(scan.sizeMB);
  scan.poster = await optionalFile(path.join(recording, "recording-poster.webp"));
  if (!target || target === "site") {
    const catalog = await optionalFile(path.join(recording, "runs.json"));
    const entries = catalog ? JSON.parse(catalog) : [];
    const ids = new Set();
    replays = await Promise.all(entries.map(async ({ id, title, description }) => {
      if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
          typeof title !== "string" || !title.trim() || typeof description !== "string" || ids.has(id))
        throw new Error(`Invalid LiDAR recording entry: ${id}`);
      ids.add(id);
      return {
        ...await readRecording(path.join(recording, "runs", id)),
        assetPath: `recording/runs/${id}`,
        href: `lidar-${id}.html`,
        title, description,
      };
    }));
    const trackdrive = replays.findIndex((replay) => replay.href === "lidar-trackdrive.html");
    if (trackdrive >= 0) {
      const [primary] = replays.splice(trackdrive, 1);
      replays.unshift(primary);
    } else {
      replays.unshift({
        ...scan,
        href: "lidar-trackdrive.html",
        title: "Trackdrive clip",
        description: "A 21-second excerpt from the recorded Trackdrive bag.",
      });
    }
  }
}

const files = new Map(); // output path -> text, bytes or source path
for (const name of target ? [target] : Object.keys(sites)) {
  const site = sites[name];
  const views = CNViews[name];
  let html = await read(`${name}.html`);
  let assets = site.assets;
  const hero = site.scan ? scan : undefined;
  if (hero) {
    html = html.replace(
      '<script src="scan.js"></script>',
      '<script type="module" src="recording.mjs"></script>',
    );
    assets = assets
      .filter((file) => file !== "scan.js")
      .concat("recording.mjs", "recording-camera.mjs");
    if (hero.poster) files.set(`${name}/recording-poster.webp`, hero.poster);
    for (const file of hero.assets)
      files.set(`${name}/recording/${file}`, recordingAsset(hero, file));
  }
  files.set(
    `${name}/index.html`,
    render(html, views.slots(CN, { pages: true, recording: hero }), `${name}.html`),
  );
  CN.projects.forEach((p, i) =>
    files.set(`${name}/work/${p.id}.html`, views.projectPage(CN, i)),
  );
  if (name === "site") {
    for (const replay of replays) {
      const still = await replayStill(replay);
      replay.stillPointCount = still.pointCount;
      files.set(`site/${replay.assetPath}/still.bin.br`, still.bytes);
      files.set(`site/${replay.assetPath}/still.json`, JSON.stringify(still.overlay));
    }
    const team = views.teamPage(CN, replays);
    files.set("site/uq-racing.html", team);
    if (replays.length) files.set("site/lidar.html", team);
    for (const replay of replays) {
      const page = views.replayPage(CN, replay, replays);
      files.set(`site/${replay.href}`, page);
      if (replay.assetPath === "recording") continue;
      for (const file of replay.assets) {
        const relative = `${replay.assetPath}/${file}`;
        files.set(`site/${relative}`, recordingAsset(replay, file));
      }
    }
  }
  for (const asset of assets)
    files.set(`${name}/${asset}`, { from: asset });
}

if (!target) {
  // Chooser: the preview index, pointed at the built sites.
  let chooser = (await read("index.html"))
    .replaceAll('"sweep.html"', '"sweep/index.html"')
    .replaceAll('"channels.html"', '"channels/index.html"')
    .replace("Local prototypes. ", "Local builds. ");
  if (recording) {
    chooser = chooser
      .replace("A simulated LiDAR scan and path through a driverless cone track.", "Recorded LiDAR playback with the recorded planner paths.")
      .replace("The scan is simulated and the project flows summarise", "Project flows summarise");
  }
  files.set("index.html", chooser);
  files.set("fonts/archivo-var.woff2", { from: "fonts/archivo-var.woff2" });
  files.set("fonts/ARCHIVO-OFL.txt", { from: "fonts/ARCHIVO-OFL.txt" });
}

// Everything is rendered before the old build is removed.
const destinationRoot = atRoot ? path.join(root, "dist") : target ? path.join(output, target) : output;
await rm(destinationRoot, { recursive: true, force: true });
for (const [relative, value] of files) {
  const destination = atRoot ? path.join(destinationRoot, relative.slice("site/".length)) : path.join(output, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  if (typeof value === "string" || Buffer.isBuffer(value)) await writeFile(destination, value);
  else await copyFile(path.resolve(source, value.from), destination);
}

console.log(`Built ${files.size} files in ${path.relative(root, destinationRoot)}/`);
