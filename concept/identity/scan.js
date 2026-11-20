// Sweep hero: a simulated LiDAR sweep of a cone track, drawn into canvas.scan.
// Self-contained so a recorded scan renderer can replace this file. Contract:
// draw into `canvas.scan`, honour `button.pause` and prefers-reduced-motion.
(function () {
  const canvas = document.querySelector(".scan");
  if (!canvas) return;
  // A car drives a closed loop of cones. A spinning sensor at the car emits
  // ground returns on fixed rings and denser returns from nearby cones. Points
  // live in world space and fade over one rotation.

  const ctx = canvas.getContext("2d");
  const pauseButton = document.querySelector(".pause");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Deterministic noise so every load draws the same track.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const track = buildTrack();
  const CAPACITY = 90000;
  const px = new Float32Array(CAPACITY),
    py = new Float32Array(CAPACITY),
    pz = new Float32Array(CAPACITY);
  const born = new Float32Array(CAPACITY),
    kind = new Uint8Array(CAPACITY);
  let head = 0;

  const ROTATION = 1.6; // seconds per sensor revolution
  const SPEED = 6.5; // car speed along the track, m/s
  const RINGS = Array.from({ length: 30 }, (_, k) => 2.2 * Math.pow(1.13, k));
  const KIND_COLORS = ["#9fe7d3", "#3d8bff", "#ffd43b", "#ff7a2f"];

  let width = 0,
    height = 0,
    dpr = 1;
  let distance = 0,
    azimuth = 0,
    last = 0,
    now = 0;
  let running = !reduced.matches,
    visible = true,
    userPaused = false;

  function buildTrack() {
    const samples = [];
    const N = 2400;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      samples.push([
        58 * Math.cos(t) + 14 * Math.cos(3 * t) + 6 * Math.sin(5 * t),
        36 * Math.sin(t) + 12 * Math.sin(2 * t) - 5 * Math.cos(4 * t),
      ]);
    }
    const arc = [0];
    for (let i = 1; i < samples.length; i++) {
      arc.push(
        arc[i - 1] +
          Math.hypot(
            samples[i][0] - samples[i - 1][0],
            samples[i][1] - samples[i - 1][1],
          ),
      );
    }
    const length = arc[arc.length - 1];
    const at = (s) => {
      s = ((s % length) + length) % length;
      let lo = 0,
        hi = arc.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (arc[mid] < s) lo = mid;
        else hi = mid;
      }
      const f = (s - arc[lo]) / (arc[hi] - arc[lo] || 1);
      const [x0, z0] = samples[lo],
        [x1, z1] = samples[hi];
      const dx = x1 - x0,
        dz = z1 - z0,
        d = Math.hypot(dx, dz) || 1;
      return { x: x0 + dx * f, z: z0 + dz * f, tx: dx / d, tz: dz / d };
    };
    const cones = [];
    for (let s = 0; s < length; s += 3.6) {
      const p = at(s);
      const nx = -p.tz,
        nz = p.tx;
      const start = s < 8;
      cones.push({
        x: p.x + nx * 1.7,
        z: p.z + nz * 1.7,
        kind: start ? 3 : 1,
        seen: -99,
      });
      cones.push({
        x: p.x - nx * 1.7,
        z: p.z - nz * 1.7,
        kind: start ? 3 : 2,
        seen: -99,
      });
    }
    return { at, length, cones };
  }

  function emit(x, y, z, k, t) {
    px[head] = x;
    py[head] = y;
    pz[head] = z;
    kind[head] = k;
    born[head] = t;
    head = (head + 1) % CAPACITY;
  }

  function sweep(from, to, car, t) {
    const STEP = (Math.PI * 2) / 1100;
    for (let a = from; a < to; a += STEP) {
      const ca = Math.cos(a),
        sa = Math.sin(a);
      for (let r = 0; r < RINGS.length; r++) {
        const range = RINGS[r] * (1 + (rand() - 0.5) * 0.02);
        emit(
          car.x + ca * range,
          (rand() - 0.5) * 0.04,
          car.z + sa * range,
          0,
          t,
        );
      }
    }
    // Cones whose bearing falls inside this slice of the rotation.
    for (const cone of track.cones) {
      const dx = cone.x - car.x,
        dz = cone.z - car.z;
      const d = Math.hypot(dx, dz);
      if (d > 34 || d < 1) continue;
      let bearing = Math.atan2(dz, dx);
      while (bearing < from) bearing += Math.PI * 2;
      if (bearing >= to) continue;
      const hits = Math.max(4, Math.round(26 - d * 0.7));
      for (let i = 0; i < hits; i++) {
        const h = rand() * 0.33;
        const rad = 0.12 * (1 - h / 0.36) + 0.01;
        const side = bearing + Math.PI + (rand() - 0.5) * 1.6;
        emit(
          cone.x + Math.cos(side) * rad,
          h,
          cone.z + Math.sin(side) * rad,
          cone.kind,
          t,
        );
      }
      cone.seen = t;
    }
  }

  function camera(car) {
    const back = 7.5,
      rise = 3.6,
      pitch = 0.2;
    return {
      x: car.x - car.tx * back,
      y: rise,
      z: car.z - car.tz * back,
      fx: car.tx,
      fz: car.tz,
      cp: Math.cos(pitch),
      sp: Math.sin(pitch),
      focal: Math.max(width, height * 1.25) * 0.62,
      cx: width * 0.5,
      cy: height * 0.36,
    };
  }

  function project(cam, x, y, z) {
    const rx = x - cam.x,
      ry = y - cam.y,
      rz = z - cam.z;
    const f = rx * cam.fx + rz * cam.fz;
    const side = rx * -cam.fz + rz * cam.fx;
    const zc = f * cam.cp - ry * cam.sp;
    if (zc < 0.6) return null;
    const yc = f * cam.sp + ry * cam.cp;
    return [
      cam.cx + (side / zc) * cam.focal,
      cam.cy - (yc / zc) * cam.focal,
      zc,
    ];
  }

  function draw(t, persistence) {
    const car = track.at(distance);
    const cam = camera(car);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b1f2a";
    ctx.fillRect(0, 0, width, height);

    // Bucket points by colour and brightness to keep fillStyle changes few.
    const LEVELS = 6;
    const buckets = KIND_COLORS.map(() =>
      Array.from({ length: LEVELS }, () => []),
    );
    for (let i = 0; i < CAPACITY; i++) {
      const age = (t - born[i]) / persistence;
      if (age < 0 || age >= 1) continue;
      const p = project(cam, px[i], py[i], pz[i]);
      if (!p || p[0] < -4 || p[0] > width + 4 || p[1] < -4 || p[1] > height + 4)
        continue;
      const fade = (1 - age) * Math.min(1, 26 / p[2]);
      const level = Math.min(LEVELS - 1, Math.floor(fade * LEVELS));
      if (level < 0) continue;
      buckets[kind[i]][level].push(p);
    }
    buckets.forEach((levels, k) => {
      ctx.fillStyle = KIND_COLORS[k];
      levels.forEach((pts, level) => {
        ctx.globalAlpha = ((level + 1) / LEVELS) * (k === 0 ? 0.75 : 1);
        for (const [x, y, zc] of pts) {
          const s = Math.max(1, ((k === 0 ? 0.05 : 0.07) * cam.focal) / zc);
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      });
    });

    // Detected cones get a base ring, then the midpoints between the two
    // edges are joined into a path estimate.
    ctx.lineWidth = 1;
    for (const cone of track.cones) {
      const age = (t - cone.seen) / (persistence * 1.4);
      if (age < 0 || age >= 1) continue;
      const p = project(cam, cone.x, 0, cone.z);
      if (!p) continue;
      const r = Math.max(2, (0.34 * cam.focal) / p[2]);
      ctx.globalAlpha = 0.55 * (1 - age);
      ctx.strokeStyle = KIND_COLORS[cone.kind];
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#e8f0ee";
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    let started = false;
    for (let s = 2; s < 30; s += 1) {
      const c = track.at(distance + s);
      const p = project(cam, c.x, 0, c.z);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p[0], p[1]);
        started = true;
      } else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // The car itself, as a small chevron at the sensor position.
    const c = project(cam, car.x, 0, car.z);
    if (c) {
      const s = (0.42 * cam.focal) / c[2];
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e8f0ee";
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] - s * 0.5);
      ctx.lineTo(c[0] + s * 0.45, c[1] + s * 0.25);
      ctx.lineTo(c[0], c[1] + s * 0.05);
      ctx.lineTo(c[0] - s * 0.45, c[1] + s * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(ms) {
    const dt = Math.min(0.05, (ms - last) / 1000 || 0);
    last = ms;
    now += dt;
    distance += SPEED * dt;
    const car = track.at(distance);
    const next = azimuth + (Math.PI * 2 * dt) / ROTATION;
    sweep(azimuth, next, car, now);
    azimuth = next % (Math.PI * 2);
    draw(now, ROTATION);
    if (running && visible && !userPaused) requestAnimationFrame(frame);
  }

  // One complete revolution, drawn at once, for reduced motion and pauses.
  function still() {
    const car = track.at(distance);
    sweep(0, Math.PI * 2, car, now);
    draw(now, 1e9);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!isAnimating()) still();
    else draw(now, ROTATION);
  }

  const isAnimating = () => running && visible && !userPaused;

  function start() {
    if (!isAnimating()) return;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  pauseButton.addEventListener("click", () => {
    userPaused = !userPaused;
    pauseButton.setAttribute("aria-pressed", String(userPaused));
    pauseButton.textContent = userPaused ? "Play scan" : "Pause scan";
    if (!userPaused) start();
  });

  reduced.addEventListener("change", () => {
    running = !reduced.matches;
    pauseButton.hidden = reduced.matches;
    if (running) start();
    else still();
  });
  pauseButton.hidden = reduced.matches;

  // Stop drawing while the hero is off screen; resume where it left off.
  new IntersectionObserver(([entry]) => {
    const was = isAnimating();
    visible = entry.isIntersecting;
    if (!was) start();
  }).observe(canvas);

  new ResizeObserver(resize).observe(canvas);
  if (!running) still();
  start();
})();
