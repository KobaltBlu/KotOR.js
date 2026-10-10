import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import type { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";
import type { Area } from "@engine/module/Area";
import { sceneHitCheckSegment } from "@engine/render/scene-hit-check";
import {
  ODYSSEY_FLARE_SPEED,
  ODYSSEY_HIT_CHECK_FLARE,
  ODYSSEY_LENS_FLARE_SIZE,
  ODYSSEY_RENDER_LENS_FLARES,
  ODYSSEY_REVERSE_FLARE_HIT,
  flareElementColor,
  flareElementNdc,
  flareElementSize,
  flareFacing,
  isBeyondFlareRadius,
  stepFlareOcclusionFade,
} from "@engine/render/odyssey-lens-flare-math";

// ShaderMaterial — do not redeclare position/uv (Three.js prefixes them).
const FLARE_VERT = /* glsl */`
  uniform vec2 uCenter;
  uniform vec2 uHalfSize;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * uHalfSize + uCenter, 0.0, 1.0);
  }
`;

const FLARE_FRAG = /* glsl */`
  uniform sampler2D flareMap;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(flareMap, vUv);
    gl_FragColor = vec4(texel.rgb * uColor, 1.0);
  }
`;

/**
 * OdysseyLensFlarePass — (K1 00457ec0).
 *
 * After FB mods, before GUI. Additive ONE,ONE; depth off.
 * Plane intersect n=(0,0,-1), d=2 → z=+2 hit; S=−hit;
 * element at S×flarepositions[i] on z=−2 draw plane ≡ lightNDC×pos.
 *
 * @file OdysseyLensFlarePass.ts
 */
export class OdysseyLensFlarePass extends Pass {
  renderLensFlares = ODYSSEY_RENDER_LENS_FLARES;
  lensFlareSize = ODYSSEY_LENS_FLARE_SIZE;
  hitCheckFlare = ODYSSEY_HIT_CHECK_FLARE;
  flareSpeed = ODYSSEY_FLARE_SPEED;
  reverseFlareHit = ODYSSEY_REVERSE_FLARE_HIT;

  private lightsProvider: (() => OdysseyLight3D[]) | null = null;
  private cameraProvider: (() => THREE.Camera | undefined) | null = null;
  private areaProvider: (() => Area | undefined) | null = null;

  private readonly scene = new THREE.Scene();
  private readonly orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quadGeom: THREE.BufferGeometry;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly meshes: THREE.Mesh[] = [];

  private readonly _camPos = new THREE.Vector3();
  private readonly _lightPos = new THREE.Vector3();
  private readonly _viewPos = new THREE.Vector3();
  private readonly _lightNdc = new THREE.Vector3();

  constructor() {
    super();
    this.needsSwap = false;
    this.clear = false;
    this.quadGeom = new THREE.PlaneGeometry(2, 2);
  }

  setLightsProvider(provider: () => OdysseyLight3D[]) {
    this.lightsProvider = provider;
  }

  setCameraProvider(provider: () => THREE.Camera | undefined) {
    this.cameraProvider = provider;
  }

  setAreaProvider(provider: () => Area | undefined) {
    this.areaProvider = provider;
  }

  /** @deprecated delta comes from EffectComposer.render */
  setDeltaProvider(_provider: () => number) {}

  private ensureMesh(index: number): THREE.Mesh {
    while(this.meshes.length <= index){
      const material = new THREE.ShaderMaterial({
        uniforms: {
          flareMap: { value: null as THREE.Texture | null },
          uColor: { value: new THREE.Color(1, 1, 1) },
          uCenter: { value: new THREE.Vector2() },
          uHalfSize: { value: new THREE.Vector2(0.05, 0.05) },
        },
        vertexShader: FLARE_VERT,
        fragmentShader: FLARE_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.quadGeom, material);
      mesh.frustumCulled = false;
      this.materials.push(material);
      this.meshes.push(mesh);
      this.scene.add(mesh);
    }
    return this.meshes[index];
  }

  private hideAllMeshes() {
    for(let i = 0, il = this.meshes.length; i < il; i++){
      this.meshes[i].visible = false;
    }
  }

  /**
   * Project eye-space (x,y,z) through camera.projectionMatrix → NDC xy.
   */
  private projectEye(
    camera: THREE.Camera,
    x: number,
    y: number,
    z: number,
  ): { x: number; y: number } | null {
    const p = camera.projectionMatrix.elements;
    const cw = p[3] * x + p[7] * y + p[11] * z + p[15];
    if(cw <= 1e-8){
      return null;
    }
    return {
      x: (p[0] * x + p[4] * y + p[8] * z + p[12]) / cw,
      y: (p[1] * x + p[5] * y + p[9] * z + p[13]) / cw,
    };
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number,
  ) {
    if(!this.renderLensFlares || !this.lightsProvider || !this.cameraProvider){
      return;
    }

    const camera = this.cameraProvider();
    const lights = this.lightsProvider();
    if(!camera || !lights?.length){
      return;
    }

    const delta = typeof deltaTime === 'number' ? deltaTime : 0;
    const area = this.areaProvider?.();

    camera.getWorldPosition(this._camPos);
    this.hideAllMeshes();
    let meshIndex = 0;

    for(let li = 0, ll = lights.length; li < ll; li++){
      const light = lights[li];
      if(!light?.flareColorShifts?.length){
        continue;
      }

      light.getWorldPosition(this._lightPos);
      const dist = this._camPos.distanceTo(this._lightPos);
      const flareRadius = light.flareRadius;
      if(isBeyondFlareRadius(dist, flareRadius)){
        continue;
      }

      // View-space via full world matrix (matches Three.js projection -Z forward).
      this._viewPos.copy(this._lightPos).applyMatrix4(camera.matrixWorldInverse);
      if(this._viewPos.z >= 0){
        continue;
      }
      const viewLen = this._viewPos.length();
      if(viewLen < 1e-8){
        continue;
      }
      const viewDirZ = this._viewPos.z / viewLen;

      if(this.hitCheckFlare && area){
        const from = this.reverseFlareHit ? this._camPos : this._lightPos;
        const to = this.reverseFlareHit ? this._lightPos : this._camPos;
        const occluded = sceneHitCheckSegment(area, from, to);
        const stepped = stepFlareOcclusionFade(
          light.flareOcclusionFade,
          occluded,
          delta,
          this.flareSpeed,
        );
        light.flareOcclusionFade = stepped.fade;
        if(stepped.skipDraw){
          continue;
        }
      }else if(!this.hitCheckFlare){
        light.flareOcclusionFade = 1;
      }

      const facing = flareFacing(viewDirZ);

      // Light NDC (perspective-equivalent to front-plane hit toward the light).
      this._lightNdc.copy(this._lightPos).project(camera);

      const count = Math.min(
        light.flareColorShifts.length,
        light.flareSizes.length || light.flareColorShifts.length,
        light.flarePositions.length || light.flareColorShifts.length,
      );

      for(let i = 0; i < count; i++){
        const texture = light.flareTextures[i];
        if(!texture){
          continue;
        }

        const pos = light.flarePositions[i] ?? 0;
        const sizeEye = flareElementSize(
          light.flareSizes[i] ?? 0,
          viewLen,
          flareRadius,
          this.lensFlareSize,
        );
        if(sizeEye <= 0){
          continue;
        }

        const shift = light.flareColorShifts[i];
        const rgb = flareElementColor({
          shiftR: shift?.r ?? 0,
          shiftG: shift?.g ?? 0,
          shiftB: shift?.b ?? 0,
          lightR: light.color.r,
          lightG: light.color.g,
          lightB: light.color.b,
          occlusionFade: light.flareOcclusionFade,
          facing,
          distance: viewLen,
          flareRadius,
        });
        if(rgb.r + rgb.g + rgb.b <= 1e-4){
          continue;
        }

        // S×pos with z=+2 hit ⇒ lightNDC×pos (on light when pos=1).
        const { x: ndcX, y: ndcY } = flareElementNdc(
          this._lightNdc.x,
          this._lightNdc.y,
          pos,
        );

        // Half-extent in NDC from eye-space size on the z=−2 plane.
        const c0 = this.projectEye(camera, 0, 0, -2);
        const c1 = this.projectEye(camera, sizeEye, 0, -2);
        const c2 = this.projectEye(camera, 0, sizeEye, -2);
        if(!c0 || !c1){
          continue;
        }
        const halfW = Math.abs(c1.x - c0.x);
        const halfH = c2 ? Math.abs(c2.y - c0.y) : halfW;
        if(halfW < 1e-6 && halfH < 1e-6){
          continue;
        }

        const mesh = this.ensureMesh(meshIndex++);
        const material = mesh.material as THREE.ShaderMaterial;
        material.uniforms.flareMap.value = texture;
        material.uniforms.uColor.value.setRGB(rgb.r, rgb.g, rgb.b);
        material.uniforms.uCenter.value.set(ndcX, ndcY);
        material.uniforms.uHalfSize.value.set(
          Math.max(halfW, 1e-6),
          Math.max(halfH, 1e-6),
        );
        mesh.visible = true;
      }
    }

    if(meshIndex === 0){
      return;
    }

    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    if(this.renderToScreen){
      renderer.setRenderTarget(null);
    }else{
      renderer.setRenderTarget(readBuffer);
    }
    renderer.render(this.scene, this.orthoCam);
    renderer.autoClear = prevAutoClear;
  }

  dispose() {
    this.quadGeom.dispose();
    for(let i = 0, il = this.materials.length; i < il; i++){
      this.materials[i].dispose();
    }
    this.materials.length = 0;
    this.meshes.length = 0;
  }
}
