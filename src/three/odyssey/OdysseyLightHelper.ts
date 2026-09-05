import * as THREE from "three";
import type { OdysseyLight3D } from "@/three/odyssey/OdysseyLight3D";

/** Distance scale where retail atten ≈ 0.5: d/r = sqrt((1/0.5 - 1) / 4.5). */
const ATTEN_HALF_SCALE = Math.sqrt((1 / 0.5 - 1) / 4.5);
/** Distance scale where retail atten ≈ 0.25. */
const ATTEN_QUARTER_SCALE = Math.sqrt((1 / 0.25 - 1) / 4.5);

const SHADOW_RING_COLOR = new THREE.Color(0xffaa33);
const AMBIENT_TINT = new THREE.Color(0x66ccff);

const sharedOcta = new THREE.OctahedronGeometry(1, 0);

type CirclePlane = 'xy' | 'xz' | 'yz';

/** Unit circle in XY / XZ / YZ for sparse sphere / atten / shadow outlines. */
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

/**
 * Debug gizmo for an Odyssey point light: real radius, retail falloff rings,
 * and selection/ambient state — sparse outlines, not a dense wireframe cage.
 */
export class OdysseyLightHelper extends THREE.Object3D {

  readonly light: OdysseyLight3D;

  private readonly center: THREE.Mesh;
  private readonly outerGroup: THREE.Group;
  private readonly halfRing: THREE.Line;
  private readonly quarterRing: THREE.Line;
  private readonly shadowRing: THREE.Line;

  private readonly centerMat: THREE.MeshBasicMaterial;
  private readonly outerMat: THREE.LineBasicMaterial;
  private readonly halfMat: THREE.LineBasicMaterial;
  private readonly quarterMat: THREE.LineBasicMaterial;
  private readonly shadowMat: THREE.LineBasicMaterial;

  private _lastRadius = -1;
  private _lastShadowRadius = -1;
  private _lastCastShadow = false;
  private readonly _color = new THREE.Color();

  constructor(light: OdysseyLight3D){
    super();
    this.light = light;
    this.name = `OdysseyLightHelper:${light.name || light.uuid}`;
    this.type = 'OdysseyLightHelper';
    this.frustumCulled = false;

    this.centerMat = makeFillMat(0xffffff, 0.9);
    this.outerMat = makeLineMat(0xffffff, 0.45);
    this.halfMat = makeLineMat(0xffffff, 0.22);
    this.quarterMat = makeLineMat(0xffffff, 0.14);
    this.shadowMat = makeLineMat(SHADOW_RING_COLOR, 0.35);

    this.center = new THREE.Mesh(sharedOcta, this.centerMat);
    this.center.scale.setScalar(0.1);
    this.center.renderOrder = 999;

    this.outerGroup = new THREE.Group();
    this.outerGroup.name = 'outerOutline';
    for(const geo of [sharedCircleXY, sharedCircleXZ, sharedCircleYZ]){
      const ring = new THREE.Line(geo, this.outerMat);
      ring.renderOrder = 998;
      this.outerGroup.add(ring);
    }

    this.halfRing = new THREE.Line(sharedCircleXY, this.halfMat);
    this.halfRing.renderOrder = 998;
    this.quarterRing = new THREE.Line(sharedCircleXY, this.quarterMat);
    this.quarterRing.renderOrder = 998;

    this.shadowRing = new THREE.Line(sharedCircleXY, this.shadowMat);
    this.shadowRing.renderOrder = 998;
    this.shadowRing.visible = false;

    this.add(this.halfRing);
    this.add(this.quarterRing);
    this.add(this.outerGroup);
    this.add(this.shadowRing);
    this.add(this.center);
  }

  /**
   * Sync world pose, radius shells, color, and bound/ambient styling.
   * @param bound Whether the light is in the current ControlLightsFade bound set.
   */
  update(bound: boolean){
    const light = this.light;
    this.position.copy(light.worldPosition);

    const radius = Math.max(0, light.getRadius());
    if(radius !== this._lastRadius){
      this._lastRadius = radius;
      const hasRadius = radius > 0;
      this.outerGroup.visible = hasRadius;
      this.halfRing.visible = hasRadius;
      this.quarterRing.visible = hasRadius;
      if(hasRadius){
        this.outerGroup.scale.setScalar(radius);
        this.halfRing.scale.setScalar(radius * ATTEN_HALF_SCALE);
        this.quarterRing.scale.setScalar(radius * ATTEN_QUARTER_SCALE);
      }
    }

    const castShadow = !!light.castShadow;
    const shadowRadius = castShadow ? Math.max(0, light.getShadowRadius()) : 0;
    if(castShadow !== this._lastCastShadow || shadowRadius !== this._lastShadowRadius){
      this._lastCastShadow = castShadow;
      this._lastShadowRadius = shadowRadius;
      this.shadowRing.visible = castShadow && shadowRadius > 0;
      if(this.shadowRing.visible){
        this.shadowRing.scale.setScalar(shadowRadius);
      }
    }

    this._color.copy(light.color);
    if(light.isAmbient){
      this._color.lerp(AMBIENT_TINT, 0.35);
    }

    const fade = Math.min(1, Math.max(0, light.fadeFactor));
    const outerOpacity = (bound ? 0.5 : 0.22) * Math.max(0.2, fade);
    const shellOpacity = (bound ? 0.28 : 0.12) * Math.max(0.15, fade);

    this.centerMat.color.copy(this._color);
    this.centerMat.opacity = Math.max(0.4, fade) * (bound ? 0.95 : 0.5);
    this.center.scale.setScalar(bound ? 0.12 : 0.08);

    this.outerMat.color.copy(this._color);
    this.outerMat.opacity = outerOpacity;
    this.halfMat.color.copy(this._color);
    this.halfMat.opacity = shellOpacity;
    this.quarterMat.color.copy(this._color);
    this.quarterMat.opacity = shellOpacity * 0.7;

    this.shadowMat.opacity = (bound ? 0.45 : 0.22) * Math.max(0.2, fade);
  }

  dispose(){
    this.removeFromParent();
    this.centerMat.dispose();
    this.outerMat.dispose();
    this.halfMat.dispose();
    this.quarterMat.dispose();
    this.shadowMat.dispose();
  }

}
