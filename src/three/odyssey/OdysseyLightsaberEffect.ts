import * as THREE from "three";

export interface IOdysseyLightsaberEffectOptions {
  color?: THREE.Color;
  origin?: THREE.Vector3;
  axis?: THREE.Vector3;
  length?: number;
  radius?: number;
}

type LightsaberLayerOrientation = "primary" | "secondary";

interface ILightsaberLayerConfig {
  name: string;
  renderOrder: number;
  orientation: LightsaberLayerOrientation;
  radiusScale: number;
  featherScale: number;
  lengthPadScale: number;
  tipScale: number;
  opacityScale: number;
  whiteHot: number;
  edgeTint: number;
  pulseStrength: number;
  blendMode: THREE.Blending;
}

interface ILightsaberLayer {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  config: ILightsaberLayerConfig;
}

const BLADE_AXIS = new THREE.Vector3(0, 1, 0);
const FALLBACK_WIDTH_DIRECTION = new THREE.Vector3(1, 0, 0);

const LIGHTSABER_VERTEX_SHADER = `
  varying vec2 vUv;

  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>

  void main() {
    vUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`;

const LIGHTSABER_FRAGMENT_SHADER = `
  uniform vec3 bladeColor;
  uniform float opacity;
  uniform float time;
  uniform float bladeLength;
  uniform float shapeRadius;
  uniform float tipRadius;
  uniform float quadHalfWidth;
  uniform float quadLength;
  uniform float feather;
  uniform float whiteHot;
  uniform float edgeTint;
  uniform float pulseStrength;

  varying vec2 vUv;

  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>

  float sdRoundedTipBlade(vec2 p, float bodyLength, float radius, float roundedTipRadius) {
    float body = max(abs(p.x) - radius, max(-p.y, p.y - bodyLength));
    float tip = length(vec2(p.x, p.y - bodyLength)) - roundedTipRadius;
    return min(body, tip);
  }

  void main() {
    #include <logdepthbuf_fragment>

    float safeLength = max(bladeLength, 0.0001);
    float safeRadius = max(shapeRadius, 0.0001);
    float safeTipRadius = max(tipRadius, safeRadius);
    float safeFeather = max(feather, 0.0001);

    float x = mix(-quadHalfWidth, quadHalfWidth, vUv.x);
    float y = vUv.y * quadLength;
    float bodyLength = max(safeLength - safeTipRadius, 0.0);

    float sdf = sdRoundedTipBlade(vec2(x, y), bodyLength, safeRadius, safeTipRadius);
    float shapeMask = 1.0 - smoothstep(0.0, safeFeather, sdf);

    float radial = clamp(1.0 - (abs(x) / safeRadius), 0.0, 1.0);
    float whiteCenter = pow(radial, 0.22);
    float edgeAmount = pow(1.0 - radial, 0.55);

    float pulse = 1.0 + pulseStrength * sin(time * 18.0 + vUv.y * 21.0);
    float shimmer = 0.97 + 0.03 * sin(time * 36.0 + vUv.y * 94.0 + x * 180.0);

    vec3 finalColor = mix(
      bladeColor * (1.0 + edgeTint * edgeAmount),
      vec3(1.0),
      clamp(whiteHot * whiteCenter, 0.0, 1.0)
    );

    float alpha = shapeMask * opacity * pulse * shimmer;
    if(alpha <= 0.0001) {
      discard;
    }

    gl_FragColor = vec4(finalColor, alpha);

    #include <encodings_fragment>
    #include <fog_fragment>
  }
`;

/**
 * OdysseyLightsaberEffect class.
 *
 * A custom generated blade used for QoL-mode lightsabers. The legacy saber mesh
 * is kept only as a source of transform/measurement data and is hidden while this
 * effect renders instead.
 *
 * This version abandons the old solid tube approach and instead renders a
 * white-hot core plus layered aura ribbons with shader-shaped falloff. The
 * result is much closer to the film look: a stable camera-facing core, softer
 * colored bloom, a rounded tip, and less "glowing traffic cone" energy.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file OdysseyLightsaberEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyLightsaberEffect extends THREE.Group {
  pulseTime: number = 0;
  powered: boolean = false;
  visualOpacity: number = 1;
  bladeLength: number;
  bladeRadius: number;
  bladeColor: THREE.Color;
  powerLevel: number = 0;
  swingBoost: number = 0;

  bladeLayers: ILightsaberLayer[] = [];
  pointLight: THREE.PointLight;
  resolvedContext: any;

  cameraWidthDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  secondaryWidthDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

  motionBaseWorld: THREE.Vector3 = new THREE.Vector3();
  motionTipWorld: THREE.Vector3 = new THREE.Vector3();
  previousMotionBaseWorld: THREE.Vector3 = new THREE.Vector3();
  previousMotionTipWorld: THREE.Vector3 = new THREE.Vector3();
  hasMotionSample: boolean = false;

  scratchCameraLocal: THREE.Vector3 = new THREE.Vector3();
  scratchWidthDirection: THREE.Vector3 = new THREE.Vector3();
  scratchSecondaryWidthDirection: THREE.Vector3 = new THREE.Vector3();

  constructor(options: IOdysseyLightsaberEffectOptions = {}) {
    super();

    this.bladeColor = options.color?.clone?.() || new THREE.Color(0.35, 0.65, 1.0);
    this.bladeLength = Math.max(options.length || 1.0, 0.1);
    this.bladeRadius = Math.max(options.radius || 0.014, 0.0065);

    this.position.copy(options.origin || new THREE.Vector3());
    this.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      (options.axis || new THREE.Vector3(0, 1, 0)).clone().normalize()
    );

    this.buildBlade();
    this.setColor(this.bladeColor);
    this.setPowered(false);
  }

  static FromSaberMesh(saberMesh: THREE.Mesh, color?: THREE.Color): OdysseyLightsaberEffect {
    const geometry = saberMesh.geometry;
    geometry.computeBoundingBox();

    const bbox = geometry.boundingBox?.clone() || new THREE.Box3(
      new THREE.Vector3(-0.025, 0, -0.025),
      new THREE.Vector3(0.025, 1.0, 0.025)
    );

    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    const axisIndex = OdysseyLightsaberEffect.getDominantAxisIndex(size);
    const axis = new THREE.Vector3(
      axisIndex == 0 ? 1 : 0,
      axisIndex == 1 ? 1 : 0,
      axisIndex == 2 ? 1 : 0,
    );

    const dimensions = [size.x, size.y, size.z];
    const mins = [bbox.min.x, bbox.min.y, bbox.min.z];
    const length = Math.max(dimensions[axisIndex], 0.1);
    const widthCandidates = dimensions
      .filter((_, index) => index !== axisIndex)
      .filter((value) => Number.isFinite(value) && value > 0);

    const widthHint = widthCandidates.length ? Math.min(...widthCandidates) : length * 0.028;
    const radius = THREE.MathUtils.clamp(widthHint * 0.11, length * 0.0085, length * 0.0165);

    const origin = center.clone();
    if(axisIndex == 0){
      origin.setX(mins[0]);
    }else if(axisIndex == 1){
      origin.setY(mins[1]);
    }else{
      origin.setZ(mins[2]);
    }

    return new OdysseyLightsaberEffect({
      color,
      origin,
      axis,
      length,
      radius,
    });
  }

  static getDominantAxisIndex(size: THREE.Vector3): number {
    const dimensions = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)];
    let index = 0;
    for(let i = 1; i < dimensions.length; i++){
      if(dimensions[i] > dimensions[index]){
        index = i;
      }
    }
    return index;
  }

  getContext(): any {
    if(this.resolvedContext){
      return this.resolvedContext;
    }

    let node: THREE.Object3D = this;
    while(node){
      const context = (node as any).context || (node as any).userData?.odysseyModel?.context;
      if(context){
        this.resolvedContext = context;
        return context;
      }
      node = node.parent;
    }

    return undefined;
  }

  getActiveCamera(): THREE.Camera {
    const context = this.getContext();
    const camera = context?.currentCamera || context?.camera;
    return camera instanceof THREE.Camera ? camera : undefined;
  }

  createBladeMaterial(color: THREE.Color, config: ILightsaberLayerConfig): THREE.ShaderMaterial {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        bladeColor: { value: color.clone() },
        opacity: { value: 0 },
        time: { value: 0 },
        bladeLength: { value: this.bladeLength },
        shapeRadius: { value: this.bladeRadius },
        tipRadius: { value: this.bladeRadius * config.tipScale },
        quadHalfWidth: { value: this.bladeRadius * config.radiusScale },
        quadLength: { value: this.bladeLength },
        feather: { value: this.bladeRadius * config.featherScale },
        whiteHot: { value: config.whiteHot },
        edgeTint: { value: config.edgeTint },
        pulseStrength: { value: config.pulseStrength },
      }
    ]);

    const material = new THREE.ShaderMaterial({
      vertexShader: LIGHTSABER_VERTEX_SHADER,
      fragmentShader: LIGHTSABER_FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: config.blendMode,
      side: THREE.DoubleSide,
      fog: true,
    });

    material.name = `lightsaber_${config.name}`;
    material.toneMapped = false;
    return material;
  }

  createRibbonGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(4 * 3);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);

    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);

    geometry.setAttribute("position", positionAttribute);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);

    return geometry;
  }

  createLayer(config: ILightsaberLayerConfig): ILightsaberLayer {
    const geometry = this.createRibbonGeometry();
    const material = this.createBladeMaterial(this.bladeColor, config);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.frustumCulled = false;
    mesh.renderOrder = config.renderOrder;
    mesh.name = `lightsaber_${config.name}`;
    mesh.userData.qolLightsaberGlow = true;

    this.add(mesh);

    return {
      mesh,
      geometry,
      material,
      config,
    };
  }

  buildBlade(): void {
    this.bladeLayers = [
      this.createLayer({
        name: "glow_fill",
        renderOrder: 20,
        orientation: "primary",
        radiusScale: 2.35,
        featherScale: 1.15,
        lengthPadScale: 1.15,
        tipScale: 1.06,
        opacityScale: 0.09,
        whiteHot: 0.38,
        edgeTint: 0.06,
        pulseStrength: 0.035,
        blendMode: THREE.NormalBlending,
      }),
      this.createLayer({
        name: "glow_secondary",
        renderOrder: 21,
        orientation: "secondary",
        radiusScale: 4.4,
        featherScale: 1.8,
        lengthPadScale: 2.0,
        tipScale: 1.12,
        opacityScale: 0.09,
        whiteHot: 0.08,
        edgeTint: 0.26,
        pulseStrength: 0.10,
        blendMode: THREE.AdditiveBlending,
      }),
      this.createLayer({
        name: "glow_primary",
        renderOrder: 22,
        orientation: "primary",
        radiusScale: 3.2,
        featherScale: 1.35,
        lengthPadScale: 1.55,
        tipScale: 1.08,
        opacityScale: 0.27,
        whiteHot: 0.16,
        edgeTint: 0.18,
        pulseStrength: 0.08,
        blendMode: THREE.AdditiveBlending,
      }),
      this.createLayer({
        name: "inner_halo",
        renderOrder: 23,
        orientation: "primary",
        radiusScale: 1.65,
        featherScale: 0.85,
        lengthPadScale: 1.05,
        tipScale: 1.04,
        opacityScale: 0.17,
        whiteHot: 0.56,
        edgeTint: 0.07,
        pulseStrength: 0.05,
        blendMode: THREE.AdditiveBlending,
      }),
      this.createLayer({
        name: "core",
        renderOrder: 24,
        orientation: "primary",
        radiusScale: 1.0,
        featherScale: 0.34,
        lengthPadScale: 0.75,
        tipScale: 1.03,
        opacityScale: 0.96,
        whiteHot: 0.98,
        edgeTint: 0.05,
        pulseStrength: 0.03,
        blendMode: THREE.NormalBlending,
      }),
    ];

    this.pointLight = new THREE.PointLight(this.bladeColor.clone(), 0, this.bladeLength * 2.0, 2);
    this.pointLight.castShadow = false;
    this.pointLight.visible = false;
    this.pointLight.position.set(0, this.bladeLength * 0.45, 0);
    this.add(this.pointLight);
  }

  updateRibbonGeometry(geometry: THREE.BufferGeometry, widthDirection: THREE.Vector3, halfWidth: number, quadLength: number): void {
    const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;

    const offsetX = widthDirection.x * halfWidth;
    const offsetY = widthDirection.y * halfWidth;
    const offsetZ = widthDirection.z * halfWidth;

    positionAttribute.setXYZ(0, -offsetX, -offsetY, -offsetZ);
    positionAttribute.setXYZ(1,  offsetX,  offsetY,  offsetZ);
    positionAttribute.setXYZ(2, -offsetX, quadLength - offsetY, -offsetZ);
    positionAttribute.setXYZ(3,  offsetX, quadLength + offsetY,  offsetZ);
    positionAttribute.needsUpdate = true;
  }

  updateBillboardDirections(delta: number = 0): void {
    const camera = this.getActiveCamera();
    if(!(camera instanceof THREE.Camera)){
      if(this.cameraWidthDirection.lengthSq() <= 0.0001){
        this.cameraWidthDirection.copy(FALLBACK_WIDTH_DIRECTION);
      }
      this.secondaryWidthDirection.copy(this.cameraWidthDirection).applyAxisAngle(BLADE_AXIS, Math.PI * 0.5).normalize();
      return;
    }

    camera.getWorldPosition(this.scratchCameraLocal);
    this.worldToLocal(this.scratchCameraLocal);
    this.scratchWidthDirection.crossVectors(BLADE_AXIS, this.scratchCameraLocal);

    if(this.scratchWidthDirection.lengthSq() <= 0.000001){
      if(this.cameraWidthDirection.lengthSq() > 0.0001){
        this.scratchWidthDirection.copy(this.cameraWidthDirection);
      }else{
        this.scratchWidthDirection.copy(FALLBACK_WIDTH_DIRECTION);
      }
    }else{
      this.scratchWidthDirection.normalize();
    }

    if(delta > 0){
      const follow = 1.0 - Math.exp(-delta * 42.0);
      this.cameraWidthDirection.lerp(this.scratchWidthDirection, follow);
    }else{
      this.cameraWidthDirection.copy(this.scratchWidthDirection);
    }

    if(this.cameraWidthDirection.lengthSq() <= 0.000001){
      this.cameraWidthDirection.copy(FALLBACK_WIDTH_DIRECTION);
    }

    this.cameraWidthDirection.normalize();

    this.scratchSecondaryWidthDirection.copy(this.cameraWidthDirection).applyAxisAngle(BLADE_AXIS, Math.PI * 0.5);
    if(this.scratchSecondaryWidthDirection.lengthSq() <= 0.000001){
      this.scratchSecondaryWidthDirection.set(0, 0, 1);
    }

    this.secondaryWidthDirection.copy(this.scratchSecondaryWidthDirection.normalize());
  }

  updateSwing(delta: number = 0, visibleLength: number = 0): void {
    if(delta <= 0 || visibleLength <= 0){
      return;
    }

    this.getWorldPosition(this.motionBaseWorld);
    this.motionTipWorld.set(0, visibleLength, 0).applyMatrix4(this.matrixWorld);

    if(this.hasMotionSample){
      const baseVelocity = this.motionBaseWorld.distanceTo(this.previousMotionBaseWorld) / Math.max(delta, 0.000001);
      const tipVelocity = this.motionTipWorld.distanceTo(this.previousMotionTipWorld) / Math.max(delta, 0.000001);
      const velocity = Math.max(baseVelocity, tipVelocity);
      const targetBoost = THREE.MathUtils.clamp((velocity - 1.5) * 0.035, 0, 0.4);
      const follow = 1.0 - Math.exp(-delta * 14.0);
      this.swingBoost = THREE.MathUtils.lerp(this.swingBoost, targetBoost, follow);
    }

    this.previousMotionBaseWorld.copy(this.motionBaseWorld);
    this.previousMotionTipWorld.copy(this.motionTipWorld);
    this.hasMotionSample = true;
  }

  setColor(color: THREE.Color): void {
    this.bladeColor.copy(color);

    for(const layer of this.bladeLayers){
      layer.material.uniforms.bladeColor.value.copy(color);
    }

    if(this.pointLight instanceof THREE.PointLight){
      this.pointLight.color.copy(color);
    }
  }

  setOpacity(opacity: number): void {
    this.visualOpacity = Math.min(Math.max(opacity, 0), 1);
  }

  setPowered(powered: boolean): void {
    this.powered = !!powered;
    if(this.powered){
      this.visible = true;
    }
  }

  update(delta: number = 0): void {
    if(delta > 0){
      this.pulseTime += delta;
      const targetPower = this.powered ? 1 : 0;
      const response = this.powered ? 18.0 : 28.0;
      const follow = 1.0 - Math.exp(-delta * response);
      this.powerLevel = THREE.MathUtils.lerp(this.powerLevel, targetPower, follow);
      if(Math.abs(this.powerLevel - targetPower) < 0.001){
        this.powerLevel = targetPower;
      }
    }

    const visibleLength = this.bladeLength * this.powerLevel;

    if(this.powerLevel <= 0.001 && !this.powered){
      for(const layer of this.bladeLayers){
        layer.material.uniforms.opacity.value = 0;
      }
      if(this.pointLight instanceof THREE.PointLight){
        this.pointLight.intensity = 0;
        this.pointLight.visible = false;
      }
      this.swingBoost = 0;
      this.hasMotionSample = false;
      this.visible = false;
      return;
    }

    this.updateWorldMatrix(true, false);
    this.updateBillboardDirections(delta);
    this.updateSwing(delta, visibleLength);

    const brightness = this.powerLevel > 0
      ? THREE.MathUtils.lerp(0.55, 1.0, Math.sqrt(this.powerLevel))
      : 0;
    const pulse = 0.985 + 0.015 * Math.sin(this.pulseTime * 14.0);

    for(const layer of this.bladeLayers){
      const additiveLayer = layer.config.blendMode == THREE.AdditiveBlending;
      const swingScale = additiveLayer
        ? (1.0 + this.swingBoost * 0.95)
        : (1.0 + this.swingBoost * 0.18);

      const radius = this.bladeRadius * layer.config.radiusScale * swingScale;
      const feather = Math.max(radius * layer.config.featherScale, 0.001);
      const quadHalfWidth = radius + feather * 1.15;
      const quadLength = Math.max(visibleLength + feather * layer.config.lengthPadScale, feather * 2.0);
      const tipRadius = radius * layer.config.tipScale;
      const widthDirection = layer.config.orientation == "secondary"
        ? this.secondaryWidthDirection
        : this.cameraWidthDirection;

      this.updateRibbonGeometry(layer.geometry, widthDirection, quadHalfWidth, quadLength);

      layer.material.uniforms.time.value = this.pulseTime;
      layer.material.uniforms.opacity.value = this.visualOpacity * brightness * layer.config.opacityScale * pulse;
      layer.material.uniforms.bladeLength.value = Math.max(visibleLength, 0.0001);
      layer.material.uniforms.shapeRadius.value = radius;
      layer.material.uniforms.tipRadius.value = tipRadius;
      layer.material.uniforms.quadHalfWidth.value = quadHalfWidth;
      layer.material.uniforms.quadLength.value = quadLength;
      layer.material.uniforms.feather.value = feather;
    }

    if(this.pointLight instanceof THREE.PointLight){
      this.pointLight.visible = this.visible && this.powerLevel > 0.02;
      this.pointLight.position.set(0, visibleLength * 0.45, 0);
      this.pointLight.intensity = 0.28 * this.visualOpacity * brightness * pulse * (1.0 + this.swingBoost * 0.35);
      this.pointLight.distance = Math.max(visibleLength * 1.85, this.bladeLength * 0.45);
      this.pointLight.decay = 2;
    }
  }

  dispose(): void {
    while(this.children.length){
      const child = this.children[0] as THREE.Object3D;
      this.remove(child);

      if(child instanceof THREE.Mesh){
        child.geometry?.dispose?.();
        if(Array.isArray(child.material)){
          for(const material of child.material){
            material.dispose?.();
          }
        }else{
          child.material?.dispose?.();
        }
      }
    }

    this.bladeLayers = [];
    this.pointLight = undefined;
  }
}
