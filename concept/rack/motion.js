// Exact critically damped spring step. Mechanical limits absorb outward momentum.
export function stepSpring(value, velocity, target, frequency, dt, minimum = -Infinity, maximum = Infinity) {
  const seconds = Math.max(0, Math.min(dt, 0.05));
  const error = value - target;
  const impulse = velocity + frequency * error;
  const decay = Math.exp(-frequency * seconds);
  const next = target + (error + impulse * seconds) * decay;
  const position = Math.max(minimum, Math.min(maximum, next));
  return { value: position, velocity: position === next ? (velocity - frequency * impulse * seconds) * decay : 0 };
}
