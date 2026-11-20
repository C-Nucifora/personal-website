// Sensor-frame projection shared by replay and still selection.
const pitch = 0.21;
const cos = Math.cos(pitch);
const sin = Math.sin(pitch);

export const near = 0.6;
export const pathTopics = [
  ["/planned_path_viz", "#7eb6ae", []],
  ["/path_planner/planned_path", "#eef8f2", [6, 6]],
];

export function view(x, y, z) {
  const forward = y + 7.5;
  const up = z - 2.7;
  return [x, forward * sin + up * cos, forward * cos - up * sin];
}

export function mapToView([x, y, z], transform) {
  const dx = x - transform[3];
  const dy = y - transform[7];
  const dz = z - transform[11];
  return view(
    transform[0] * dx + transform[4] * dy + transform[8] * dz,
    transform[1] * dx + transform[5] * dy + transform[9] * dz,
    transform[2] * dx + transform[6] * dy + transform[10] * dz,
  );
}

export function focalLength(width, height) {
  return Math.max(width, height * 1.25) * 0.62;
}

export function project([x, y, depth], width, height, focal) {
  return [width * 0.5 + x * focal / depth, height * 0.41 - y * focal / depth];
}
