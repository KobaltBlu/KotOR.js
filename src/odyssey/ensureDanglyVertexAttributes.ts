import * as THREE from 'three';
import type { OdysseyModelNodeDangly } from '@/odyssey/OdysseyModelNodeDangly';

/**
 * Compiled MDL fills `danglyVec4` in `readBinary`. ASCII imports only have `constraints`
 * weights; we build vec4 per vertex using normals as the sway axis so shaders still run.
 * Preserves existing .w when rebuilding a mismatched buffer if possible.
 */
export function ensureDanglyConstraintAttribute(node: OdysseyModelNodeDangly, geometry: THREE.BufferGeometry): void {
  const pos = geometry.getAttribute('position');
  if (!pos) return;

  const n = pos.count;
  const expected = n * 4;
  if (node.danglyVec4 && node.danglyVec4.length === expected) return;

  let nx = geometry.getAttribute('normal');
  if (!nx || nx.count !== n) {
    geometry.computeVertexNormals();
    nx = geometry.getAttribute('normal');
  }
  if (!nx || nx.count !== n) return;

  const constraints = node.constraints ?? [];
  const out: number[] = new Array(expected);

  for (let i = 0; i < n; i++) {
    let w = 255;
    if (node.danglyVec4 && node.danglyVec4.length >= (i + 1) * 4) {
      w = node.danglyVec4[i * 4 + 3];
    } else if (i < constraints.length) {
      w = constraints[i];
    }

    out[i * 4] = nx.getX(i);
    out[i * 4 + 1] = nx.getY(i);
    out[i * 4 + 2] = nx.getZ(i);
    out[i * 4 + 3] = w;
  }

  node.danglyVec4 = out;
}
