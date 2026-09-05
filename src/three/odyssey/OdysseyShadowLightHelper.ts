import * as THREE from "three";
import type { OdysseyLight3D } from "@/three/odyssey/OdysseyLight3D";

/** Bit flags for which GetShadowLights pools include this light. */
export const OdysseyShadowHelperRole = {
  Multi: 1,
  StaticMesh: 2,
  Distant: 4,
} as const;

export type OdysseyShadowHelperRoleFlags = number;

const COLOR_MULTI = new THREE.Color(0xff8800);
const COLOR_STATIC = new THREE.Color(0xff4466);
const COLOR_DISTANT = new THREE.Color(0xffdd44);

const sharedOcta = new THREE.OctahedronGeometry(1, 0);

type CirclePlane = 'xy' | 'xz' | 'yz';

function makeCircleGeometry(plane: CirclePlane = 'xy', segments = 48): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * 3);
  for(let i = 0; i <= segments; i++){
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const o = i * 3;
    if(plane === 'xy'){
      positions[o] = c; positions[o + 1] = s; positions[o + 2] = 0;
    }else if(plane === 'xz'){
      positions[o] = c; positions[o + 1] = 0; positions[o + 2] = s;
    }else{
      positions[o] = 0; positions[o + 1] = c; positions[o + 2] = s;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

const sharedCircleXY = makeCircleGeometry('xy');
const sharedCircleXZ = makeCircleGeometry('xz');
const sharedCircleYZ = makeCircleGeometry('yz');

function makeLineMat(color: THREE.ColorRepresentation, opacity: number){
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
}

function makeFillMat(color: THREE.ColorRepresentation, opacity: number){
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function roleColor(roles: OdysseyShadowHelperRoleFlags, out: THREE.Color): THREE.Color {
  const multi = !!(roles & OdysseyShadowHelperRole.Multi);
  const stat = !!(roles & OdysseyShadowHelperRole.StaticMesh);
  const distant = !!(roles & OdysseyShadowHelperRole.Distant);
  if(multi && !stat && !distant){
    return out.copy(COLOR_MULTI);
  }
  if(stat && !multi && !distant){
    return out.copy(COLOR_STATIC);
  }
  if(distant && !multi && !stat){
    return out.copy(COLOR_DISTANT);
  }
  // Combined pools: average contributing role colors.
  out.setRGB(0, 0, 0);
  let n = 0;
  if(multi){ out.add(COLOR_MULTI); n++; }
  if(stat){ out.add(COLOR_STATIC); n++; }
  if(distant){ out.add(COLOR_DISTANT); n++; }
  if(n > 0){ out.multiplyScalar(1 / n); }
  else { out.copy(COLOR_MULTI); }
  return out;
}

/**
 * Debug gizmo for a light currently selected by GetShadowLights.
 * Sparse rings + aim line to focus — not a dense wireframe cage.
 */
export class OdysseyShadowLightHelper extends THREE.Object3D {

  readonly light: OdysseyLight3D;

  private readonly center: THREE.Mesh;
  private readonly radiusGroup: THREE.Group;
  private readonly aimLine: THREE.Line;
  private readonly centerMat: THREE.MeshBasicMaterial;
  private readonly radiusMat: THREE.LineBasicMaterial;
  private readonly aimMat: THREE.LineBasicMaterial;
  private readonly aimPositions: Float32Array;
  private readonly _color = new THREE.Color();
  private _lastRadius = -1;

  constructor(light: OdysseyLight3D){
    super();
    this.light = light;
    this.name = `OdysseyShadowLightHelper:${light.name || light.uuid}`;
    this.type = 'OdysseyShadowLightHelper';
    this.frustumCulled = false;

    this.centerMat = makeFillMat(COLOR_MULTI, 0.95);
    this.radiusMat = makeLineMat(COLOR_MULTI, 0.4);
    this.aimMat = makeLineMat(COLOR_MULTI, 0.35);

    this.center = new THREE.Mesh(sharedOcta, this.centerMat);
    this.center.scale.setScalar(0.14);
    this.center.renderOrder = 999;

    this.radiusGroup = new THREE.Group();
    this.radiusGroup.name = 'shadowRadius';
    for(const geo of [sharedCircleXY, sharedCircleXZ, sharedCircleYZ]){
      const ring = new THREE.Line(geo, this.radiusMat);
      ring.renderOrder = 998;
      this.radiusGroup.add(ring);
    }

    this.aimPositions = new Float32Array(6);
    const aimGeo = new THREE.BufferGeometry();
    aimGeo.setAttribute('position', new THREE.BufferAttribute(this.aimPositions, 3));
    this.aimLine = new THREE.Line(aimGeo, this.aimMat);
    this.aimLine.frustumCulled = false;
    this.aimLine.renderOrder = 998;

    this.add(this.radiusGroup);
    this.add(this.aimLine);
    this.add(this.center);
  }

  /**
   * @param roles Bitmask of {@link OdysseyShadowHelperRole}
   * @param focus World focus position the shadow projector aims at
   */
  update(roles: OdysseyShadowHelperRoleFlags, focus: THREE.Vector3){
    const light = this.light;
    this.position.copy(light.worldPosition);

    const radius = Math.max(0, light.getShadowRadius());
    if(radius !== this._lastRadius){
      this._lastRadius = radius;
      this.radiusGroup.visible = radius > 0;
      if(radius > 0){
        this.radiusGroup.scale.setScalar(radius);
      }
    }

    // Aim line in local space: origin → focus - worldPosition
    this.aimPositions[0] = 0;
    this.aimPositions[1] = 0;
    this.aimPositions[2] = 0;
    this.aimPositions[3] = focus.x - light.worldPosition.x;
    this.aimPositions[4] = focus.y - light.worldPosition.y;
    this.aimPositions[5] = focus.z - light.worldPosition.z;
    const posAttr = this.aimLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    this.aimLine.geometry.computeBoundingSphere();

    roleColor(roles, this._color);
    const fade = Math.min(1, Math.max(0, light.shadowFadeFactor));
    const opacityBoost = 0.25 + 0.75 * fade;

    this.centerMat.color.copy(this._color);
    this.centerMat.opacity = 0.55 * opacityBoost;
    this.center.scale.setScalar(0.1 + 0.08 * fade);

    this.radiusMat.color.copy(this._color);
    this.radiusMat.opacity = 0.22 * opacityBoost;
    this.aimMat.color.copy(this._color);
    this.aimMat.opacity = 0.3 * opacityBoost;
  }

  dispose(){
    this.removeFromParent();
    this.centerMat.dispose();
    this.radiusMat.dispose();
    this.aimMat.dispose();
    this.aimLine.geometry.dispose();
  }

}
