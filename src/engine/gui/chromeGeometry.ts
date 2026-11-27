import * as THREE from "three";
import { asExtentInt, clampFrameDim, truncDiv } from "@engine/gui/GUICoord";

/** Chrome mesh region ids — must match ShaderAuroraGUI GUI_CHROME sampling. */
export const GUI_CHROME_REGION_EDGE = 0;
export const GUI_CHROME_REGION_CORNER = 1;
export const GUI_CHROME_REGION_FILL = 2;

/** Axis-aligned chrome piece in widget space. */
export interface ChromeWorldQuad {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  rotateZ: number;
  region: number;
}

const MESH_EPS = 1e-5;

function isHalfPiRotation(rotateZ: number): boolean {
  const twoPi = Math.PI * 2;
  const norm = ((rotateZ % twoPi) + twoPi) % twoPi;
  return (
    Math.abs(norm - Math.PI / 2) < 1e-6 ||
    Math.abs(norm - (Math.PI * 3) / 2) < 1e-6
  );
}

/**
 * Outer/inner frame rings in centered widget space.
 * Odd extents keep the extra pixel on max (orthoFrustumInt). Edges and corners
 * share these seams — avoids 1px gaps from TL-around-center on odd DIMENSION.
 */
export function chromeFrameRings(
  width: number,
  height: number,
  dimension: number,
  shrinkWidth: number = 0,
): {
  outerL: number;
  outerR: number;
  outerB: number;
  outerT: number;
  innerL: number;
  innerR: number;
  innerB: number;
  innerT: number;
} {
  const ew = asExtentInt(width);
  const eh = asExtentInt(height);
  const dim = clampFrameDim(dimension, ew, eh);
  const shrink = asExtentInt(shrinkWidth);
  // Same TL-asymmetric outer bounds as orthoFrustumInt / borderSideExtent.
  const outerL = -truncDiv(ew, 2);
  const outerR = ew - truncDiv(ew, 2) - shrink;
  const outerB = -truncDiv(eh, 2);
  const outerT = eh - truncDiv(eh, 2);
  return {
    outerL,
    outerR,
    outerB,
    outerT,
    innerL: outerL + dim,
    innerR: outerR - dim,
    innerB: outerB + dim,
    innerT: outerT - dim,
  };
}

/**
 * Nine chrome pieces (8 frame + fill) as world AABBs sharing ring seams.
 * rotateZ matches legacy PlaneGeometry UV orientation per side.
 */
export function chromeWorldQuadsFromRings(
  width: number,
  height: number,
  dimension: number,
  shrinkWidth: number = 0,
  fillOffsetX: number = 0,
): ChromeWorldQuad[] {
  const r = chromeFrameRings(width, height, dimension, shrinkWidth);
  const { outerL, outerR, outerB, outerT, innerL, innerR, innerB, innerT } = r;

  const quads: ChromeWorldQuad[] = [
    // Edges — rotateZ matches GUIControl buildChrome side map
    { minX: innerL, maxX: innerR, minY: outerB, maxY: innerB, rotateZ: Math.PI, region: GUI_CHROME_REGION_EDGE },
    { minX: innerR, maxX: outerR, minY: innerB, maxY: innerT, rotateZ: -Math.PI / 2, region: GUI_CHROME_REGION_EDGE },
    { minX: innerL, maxX: innerR, minY: innerT, maxY: outerT, rotateZ: 0, region: GUI_CHROME_REGION_EDGE },
    { minX: outerL, maxX: innerL, minY: innerB, maxY: innerT, rotateZ: Math.PI / 2, region: GUI_CHROME_REGION_EDGE },
    // Corners
    { minX: outerL, maxX: innerL, minY: innerT, maxY: outerT, rotateZ: 0, region: GUI_CHROME_REGION_CORNER },
    { minX: innerR, maxX: outerR, minY: innerT, maxY: outerT, rotateZ: -Math.PI / 2, region: GUI_CHROME_REGION_CORNER },
    { minX: innerR, maxX: outerR, minY: outerB, maxY: innerB, rotateZ: Math.PI, region: GUI_CHROME_REGION_CORNER },
    { minX: outerL, maxX: innerL, minY: outerB, maxY: innerB, rotateZ: Math.PI / 2, region: GUI_CHROME_REGION_CORNER },
  ];

  const fillMinX = Math.min(innerL, innerR) + fillOffsetX;
  const fillMaxX = Math.max(innerL, innerR) + fillOffsetX;
  const fillMinY = Math.min(innerB, innerT);
  const fillMaxY = Math.max(innerB, innerT);
  if(fillMaxX > fillMinX && fillMaxY > fillMinY){
    quads.push({
      minX: fillMinX,
      maxX: fillMaxX,
      minY: fillMinY,
      maxY: fillMaxY,
      rotateZ: 0,
      region: GUI_CHROME_REGION_FILL,
    });
  }else{
    quads.push({
      minX: fillOffsetX - MESH_EPS,
      maxX: fillOffsetX + MESH_EPS,
      minY: -MESH_EPS,
      maxY: MESH_EPS,
      rotateZ: 0,
      region: GUI_CHROME_REGION_FILL,
    });
  }

  return quads;
}

/**
 * UVs for a world AABB as if PlaneGeometry(localW, localH) was rotateZ'd
 * (legacy edge/corner texture orientation).
 */
function uvsForRotatedWorldQuad(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  rotateZ: number,
): [number, number, number, number, number, number, number, number] {
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const localW = isHalfPiRotation(rotateZ) ? spanY : spanX;
  const localH = isHalfPiRotation(rotateZ) ? spanX : spanY;
  const hw = localW / 2;
  const hh = localH / 2;
  const local = [
    { x: -hw, y: hh, u: 0, v: 1 },
    { x: hw, y: hh, u: 1, v: 1 },
    { x: -hw, y: -hh, u: 0, v: 0 },
    { x: hw, y: -hh, u: 1, v: 0 },
  ];
  const c = Math.cos(rotateZ);
  const s = Math.sin(rotateZ);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rotated = local.map((p) => ({
    x: p.x * c - p.y * s + cx,
    y: p.x * s + p.y * c + cy,
    u: p.u,
    v: p.v,
  }));
  const worldCorners = [
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
    { x: minX, y: minY },
    { x: maxX, y: minY },
  ];
  const uvs: number[] = [];
  for(let i = 0; i < 4; i++){
    const wc = worldCorners[i];
    let best = 0;
    let bestD = Infinity;
    for(let j = 0; j < 4; j++){
      const dx = rotated[j].x - wc.x;
      const dy = rotated[j].y - wc.y;
      const d = dx * dx + dy * dy;
      if(d < bestD){
        bestD = d;
        best = j;
      }
    }
    uvs.push(rotated[best].u, rotated[best].v);
  }
  return uvs as [number, number, number, number, number, number, number, number];
}

export function chromeWorldQuadCorners(quad: ChromeWorldQuad): {
  positions: [number, number, number, number, number, number, number, number];
  uvs: [number, number, number, number, number, number, number, number];
} {
  const { minX, maxX, minY, maxY, rotateZ } = quad;
  return {
    positions: [minX, maxY, maxX, maxY, minX, minY, maxX, minY],
    uvs: uvsForRotatedWorldQuad(minX, maxX, minY, maxY, rotateZ),
  };
}

export function buildChromeGeometryFromWorldQuads(
  quads: readonly ChromeWorldQuad[],
): THREE.BufferGeometry {
  const n = quads.length;
  if(n === 0){
    return new THREE.BufferGeometry();
  }
  const positions = new Float32Array(n * 4 * 3);
  const uvs = new Float32Array(n * 4 * 2);
  const regions = new Float32Array(n * 4);
  const indices = new Uint16Array(n * 6);

  for(let q = 0; q < n; q++){
    const spec = quads[q];
    const { positions: xy, uvs: uv } = chromeWorldQuadCorners(spec);
    const region = Number.isFinite(spec.region) ? spec.region : 0;
    const vBase = q * 4;
    const iBase = q * 6;
    for(let v = 0; v < 4; v++){
      const p = vBase * 3 + v * 3;
      positions[p] = xy[v * 2];
      positions[p + 1] = xy[v * 2 + 1];
      positions[p + 2] = 0;
      uvs[vBase * 2 + v * 2] = uv[v * 2];
      uvs[vBase * 2 + v * 2 + 1] = uv[v * 2 + 1];
      regions[vBase + v] = region;
    }
    indices[iBase] = vBase;
    indices[iBase + 1] = vBase + 2;
    indices[iBase + 2] = vBase + 1;
    indices[iBase + 3] = vBase + 2;
    indices[iBase + 4] = vBase + 3;
    indices[iBase + 5] = vBase + 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('region', new THREE.BufferAttribute(regions, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  return geometry;
}

/** Build chrome from control extent + frame dim. */
export function buildChromeGeometryForControl(
  width: number,
  height: number,
  dimension: number,
  shrinkWidth: number = 0,
  fillOffsetX: number = 0,
): THREE.BufferGeometry {
  return buildChromeGeometryFromWorldQuads(
    chromeWorldQuadsFromRings(width, height, dimension, shrinkWidth, fillOffsetX),
  );
}

/** Single axis-aligned fill quad (ProgressBar / options checkbox). */
export function buildFillChromeGeometry(
  width: number,
  height: number,
  offsetX: number = 0,
  offsetY: number = 0,
): THREE.BufferGeometry {
  const w = Math.max(MESH_EPS, asExtentInt(width));
  const h = Math.max(MESH_EPS, asExtentInt(height));
  const minX = offsetX - truncDiv(w, 2);
  const maxX = offsetX + (w - truncDiv(w, 2));
  const minY = offsetY - truncDiv(h, 2);
  const maxY = offsetY + (h - truncDiv(h, 2));
  return buildChromeGeometryFromWorldQuads([{
    minX,
    maxX,
    minY,
    maxY,
    rotateZ: 0,
    region: GUI_CHROME_REGION_FILL,
  }]);
}
