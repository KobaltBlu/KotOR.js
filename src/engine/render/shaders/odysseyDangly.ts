/**
 * CPU-simulated dangly displacement (see DanglyWindSimulator.ts).
 * Spring and wind are integrated on the CPU; the vertex shader applies the offset attribute.
 *
 * Constraint weight w: 0 = pinned (skip sim), 1–254 = partial, 255 = pinned (limit 0).
 */
export const ODYSSEY_DANGLY_VERTEX_LIBRARY = `
void odyssey_apply_dangly_vertex(inout vec3 transformed, vec3 objectSpaceNormal, mat4 danglyModelMatrix) {
  transformed += danglyOffset;
}
`;
