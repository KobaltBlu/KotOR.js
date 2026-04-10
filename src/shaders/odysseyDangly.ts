/**
 * Aurora / Odyssey dangly mesh vertex motion (GLSL ES 1.00, WebGL1).
 *
 * MDL semantics (see NWN model docs): `displacement` caps how far vertices may move;
 * `period` controls oscillation / settling speed (clamped below 60 where engines misbehave);
 * `tightness` is stiffness (higher = less motion). Per-vertex `constraint` packs a sway axis
 * in .xyz (from compiled MDL) and a 0–255 weight in .w.
 */
export const ODYSSEY_DANGLY_VERTEX_LIBRARY = `
float odyssey_dangly_soft(float x) {
  float x2 = x * x;
  return x * (27.0 + x2) / (27.0 + 9.0 * x2);
}

// objectSpaceNormal must be passed in: Three.js declares objectNormal inside main(), not globally.
void odyssey_apply_dangly_vertex(inout vec3 transformed, vec3 objectSpaceNormal) {
  float weight = max(constraint.w * (1.0 / 255.0), 0.0);
  if (weight < 1e-6 || danglyDisplacement < 1e-7 || danglyWindPower < 1e-6) return;

  vec3 n0 = normalize(objectSpaceNormal);

  vec3 axisRaw = vec3(constraint.x, constraint.y, constraint.z);
  float rawLen = length(axisRaw);
  vec3 dir = rawLen > 1e-6 ? axisRaw / rawLen : n0;
  float axisInfluence = rawLen > 1e-6 ? clamp(rawLen, 0.35, 2.5) : 1.0;

  float tight = max(danglyTightness, 0.0);
  float periodCl = clamp(danglyPeriod, 0.05, 58.0);
  // Linear-only omega made tiny MDL period (e.g. tarp_20 period 0.11) ~0.5 rad/s — one cycle every ~12s.
  // sqrt keeps "larger period → faster" but makes small author values visibly flutter.
  float omega = 0.42 + sqrt(periodCl * 0.88) * 0.92;
  omega = clamp(omega, 0.55, 6.5);
  float stiff = 1.0 / (1.0 + tight * 0.07);
  // MDL displacement is in model units; ~0.1 was far too subtle in Three — scale up for visible wind.
  float amp = danglyDisplacement * weight * stiff * 0.36;

  vec3 wind = normalize(vec3(0.68, 0.07, 0.73));
  float sCoord = dot(transformed, wind) * 0.015;
  float vtxPhase = fract(sin(dot(transformed, vec3(12.9898, 78.233, 45.164))) * 43758.5453) * 6.28318530718;
  float t = time;
  float gust = 0.64 + 0.36 * sin(t * 0.09 + vtxPhase * 0.45);

  float s1 = sin(t * omega + vtxPhase + sCoord);
  float s2 = sin(t * omega * 1.61803398875 + vtxPhase * 1.05 + sCoord);
  float slow = sin(t * omega * 0.38 + sCoord * 0.85) * 0.24;

  float drive = odyssey_dangly_soft((s1 * 0.45 + s2 * 0.38 + slow) * gust * 1.08);

  vec3 swing = cross(dir, wind);
  if (dot(swing, swing) < 1e-10) swing = cross(dir, vec3(0.0, 1.0, 0.02));
  swing = normalize(swing);

  vec3 along = dir * (drive * amp * axisInfluence);
  float side = odyssey_dangly_soft(sin(t * omega * 1.72 + vtxPhase * 1.15 + sCoord * 0.78)) * 0.44;
  vec3 sideOff = swing * (side * amp * axisInfluence);

  float danglyMotionGain = 1.95;
  transformed += (along + sideOff) * danglyWindPower * danglyMotionGain;
}
`;
