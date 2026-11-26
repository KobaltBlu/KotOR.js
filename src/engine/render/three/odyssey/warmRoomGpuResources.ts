import * as THREE from "three";
import type { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import type { GrassBin } from "@engine/managers/GrassManager";
import { runOdysseyDepthPrepass } from "@engine/render/odysseyDepthPrepass";
import { ShaderProgramRetention } from "@engine/render/three/odyssey/ShaderProgramRetention";

export type WarmRoomGpuRoom = {
  model?: OdysseyModel3D;
  grass?: THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
  grassBins?: GrassBin[];
};

const WARM_DRAW_SIZE = 8;

export type WarmSceneGeometryDrawOptions = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene | THREE.Object3D;
  camera: THREE.Camera;
  /** Subtrees left unchanged (e.g. debug walkmeshes / helpers). */
  skipRoots?: ReadonlySet<THREE.Object3D>;
  /** Match composer RT format for ANGLE pixel-shader variants. */
  colorTargetTemplate?: THREE.WebGLRenderTarget | null;
  /** Called immediately before the warm color draw (UBO / shadow mark). */
  beforeRender?: () => void;
};

export type RendererMemorySnapshot = {
  geometries: number;
  textures: number;
};

/** Dev-only post-reveal frame memory watch (see `startModuleGpuWarmFrameWatch`). */
export class ModuleGpuWarmLog {
  static enabled = false;
  static framesRemaining = 0;
  static lastWarmMs = 0;
  static lastMemBefore: RendererMemorySnapshot | null = null;
  static lastMemAfter: RendererMemorySnapshot | null = null;

  static initFromUrl(): void {
    try {
      if(typeof location !== "undefined" && /[?&]gpuwarm=1(?:&|$)/.test(location.search)){
        ModuleGpuWarmLog.enabled = true;
      }
    }catch(_e){
      // non-browser
    }
  }

  static snapshotRendererMemory(renderer: THREE.WebGLRenderer): RendererMemorySnapshot {
    const mem = renderer.info.memory;
    return { geometries: mem.geometries, textures: mem.textures };
  }

  static logWarmComplete(ms: number, before: RendererMemorySnapshot, after: RendererMemorySnapshot): void {
    if(!ModuleGpuWarmLog.enabled){ return; }
    ModuleGpuWarmLog.lastWarmMs = ms;
    ModuleGpuWarmLog.lastMemBefore = before;
    ModuleGpuWarmLog.lastMemAfter = after;
    console.log(
      `[ModuleGpuWarm] warm-up ${ms.toFixed(1)}ms geometries ${before.geometries}→${after.geometries} textures ${before.textures}→${after.textures}`
    );
  }

  static startPostRevealFrameWatch(frames = 120): void {
    if(!ModuleGpuWarmLog.enabled){ return; }
    ModuleGpuWarmLog.framesRemaining = frames;
  }

  static tickFrame(renderer: THREE.WebGLRenderer): void {
    if(ModuleGpuWarmLog.framesRemaining <= 0){ return; }
    const mem = ModuleGpuWarmLog.snapshotRendererMemory(renderer);
    const n = 120 - ModuleGpuWarmLog.framesRemaining + 1;
    if(n === 1 || n === 60 || n === 120 || ModuleGpuWarmLog.framesRemaining === 1){
      console.log(
        `[ModuleGpuWarm] post-reveal frame ${n} geometries=${mem.geometries} textures=${mem.textures}`
      );
    }
    ModuleGpuWarmLog.framesRemaining--;
  }
}

function isUnderSkipRoot(obj: THREE.Object3D, skipRoots?: ReadonlySet<THREE.Object3D>): boolean {
  if(!skipRoots || skipRoots.size === 0){ return false; }
  let node: THREE.Object3D | null = obj;
  while(node){
    if(skipRoots.has(node)){ return true; }
    node = node.parent;
  }
  return false;
}

function isDrawableForWarm(obj: THREE.Object3D): boolean {
  const o = obj as THREE.Mesh & THREE.Line & THREE.Points & THREE.Sprite;
  return !!(o.isMesh || o.isSkinnedMesh || o.isLine || o.isPoints || o.isSprite);
}

function createWarmColorTarget(
  template: THREE.WebGLRenderTarget | null | undefined,
  size: number
): THREE.WebGLRenderTarget {
  const tex = template?.texture;
  const rt = new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: tex?.format ?? THREE.RGBAFormat,
    type: tex?.type,
    colorSpace: tex?.colorSpace,
    depthBuffer: true,
    stencilBuffer: template?.stencilBuffer ?? true,
  });
  rt.depthTexture = new THREE.DepthTexture(size, size);
  rt.depthTexture.type = THREE.UnsignedShortType;
  return rt;
}

/**
 * One offscreen draw with every mesh forced visible and frustumCulled off so
 * geometry buffers, VAOs, and linked programs upload before gameplay frustum reveals.
 */
export function warmSceneGeometryDraw(options: WarmSceneGeometryDrawOptions): void {
  const { renderer, scene, camera, skipRoots, colorTargetTemplate, beforeRender } = options;

  const savedVisible: Array<{ obj: THREE.Object3D; visible: boolean }> = [];
  const savedFrustum: Array<{ obj: THREE.Object3D; frustumCulled: boolean }> = [];

  scene.traverse((obj) => {
    if(isUnderSkipRoot(obj, skipRoots)){ return; }
    // Lights keep their gameplay visibility: three keys programs on the active
    // shadow-casting light set, so forcing hidden lights on links extra variants.
    if(!obj.visible && !(obj as THREE.Light).isLight){
      savedVisible.push({ obj, visible: false });
      obj.visible = true;
    }
    if(isDrawableForWarm(obj)){
      const draw = obj as THREE.Object3D & { frustumCulled?: boolean };
      if(draw.frustumCulled !== false){
        savedFrustum.push({ obj, frustumCulled: draw.frustumCulled ?? true });
        draw.frustumCulled = false;
      }
    }
  });

  const colorTarget = createWarmColorTarget(colorTargetTemplate, WARM_DRAW_SIZE);
  const depthTarget = createWarmColorTarget(colorTargetTemplate, WARM_DRAW_SIZE);

  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;

  try{
    beforeRender?.();

    renderer.setRenderTarget(colorTarget);
    renderer.autoClear = true;
    renderer.clear(true, true, true);
    renderer.render(scene as THREE.Scene, camera);

    runOdysseyDepthPrepass({
      scene: scene as THREE.Scene,
      renderer,
      camera,
      depthTarget,
    });
  }finally{
    for(let i = 0; i < savedFrustum.length; i++){
      const entry = savedFrustum[i];
      (entry.obj as THREE.Object3D & { frustumCulled?: boolean }).frustumCulled = entry.frustumCulled;
    }
    for(let i = 0; i < savedVisible.length; i++){
      savedVisible[i].obj.visible = savedVisible[i].visible;
    }
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    colorTarget.dispose();
    depthTarget.dispose();
  }
}

/**
 * Start compiling every material in `scene` with `target` bound, then keep the
 * world out of regular frames until linking finishes. A frame that draws a
 * program before its link completes blocks the main thread on the driver;
 * hiding the scene lets KHR_parallel_shader_compile link in the background
 * while the load screen keeps animating.
 */
export async function compileSceneOffscreen(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene | THREE.Object3D,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget | null
): Promise<void> {
  const prevTarget = renderer.getRenderTarget();
  let pending: Promise<unknown> | undefined;
  try{
    renderer.setRenderTarget(target);
    if(typeof renderer.compileAsync === "function"){
      pending = renderer.compileAsync(scene as THREE.Scene, camera);
    }else{
      renderer.compile(scene as THREE.Scene, camera);
    }
  }finally{
    renderer.setRenderTarget(prevTarget);
  }
  if(!pending){ return; }

  const hideWorld = scene.visible;
  if(hideWorld){ scene.visible = false; }
  try{
    await pending;
  }finally{
    if(hideWorld){ scene.visible = true; }
  }
}

export type WarmModuleGpuOptions = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene | THREE.Object3D;
  camera: THREE.Camera;
  textureTargets: WarmRoomGpuRoom[];
  skipRoots?: ReadonlySet<THREE.Object3D>;
  colorTargetTemplate?: THREE.WebGLRenderTarget | null;
  beforeRender?: () => void;
};

/**
 * Textures + async shader compile + forced geometry draw (load-screen safe).
 */
export async function warmModuleGpu(options: WarmModuleGpuOptions): Promise<void> {
  const {
    renderer,
    scene,
    camera,
    textureTargets,
    skipRoots,
    colorTargetTemplate,
    beforeRender,
  } = options;

  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const memBefore = ModuleGpuWarmLog.snapshotRendererMemory(renderer);

  warmRoomGpuResources(textureTargets, renderer);

  // Compile against an offscreen target: gameplay draws the world into the
  // composer's render targets, and three keys programs on output color space /
  // tone mapping, which differ between the canvas and a render target.
  const compileTarget = createWarmColorTarget(colorTargetTemplate, WARM_DRAW_SIZE);
  try{
    await compileSceneOffscreen(renderer, scene, camera, compileTarget);

    warmSceneGeometryDraw({
      renderer,
      scene,
      camera,
      skipRoots,
      colorTargetTemplate,
      beforeRender,
    });

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(compileTarget);
    try{
      ShaderProgramRetention.retain(renderer, scene, camera);
    }finally{
      renderer.setRenderTarget(prevTarget);
    }
  }finally{
    compileTarget.dispose();
  }

  const memAfter = ModuleGpuWarmLog.snapshotRendererMemory(renderer);
  if(typeof performance !== "undefined"){
    ModuleGpuWarmLog.logWarmComplete(performance.now() - t0, memBefore, memAfter);
  }
}

/**
 * Upload room diffuse / lightmap / env / bump textures (and grass) to the GPU
 * so the first VIS / frustum reveal does not pay deferred texImage2D stalls.
 */
export function warmRoomGpuResources(
  rooms: WarmRoomGpuRoom[],
  renderer: THREE.WebGLRenderer | undefined | null
): void {
  if(!renderer || typeof (renderer as any).initTexture !== "function"){
    return;
  }

  const seen = new Set<THREE.Texture>();
  const initTex = (tex?: THREE.Texture | null) => {
    if(!tex || seen.has(tex)){ return; }
    seen.add(tex);
    try{
      (renderer as any).initTexture(tex);
    }catch(_e){
      // Ignore invalid / already-disposed textures during warm-up.
    }
  };

  const warmMaterial = (material?: THREE.Material | null) => {
    if(!material){ return; }
    const m = material as THREE.Material & {
      map?: THREE.Texture;
      lightMap?: THREE.Texture;
      envMap?: THREE.Texture;
      bumpMap?: THREE.Texture;
      normalMap?: THREE.Texture;
      uniforms?: Record<string, { value?: THREE.Texture | null }>;
    };
    initTex(m.map);
    initTex(m.lightMap);
    initTex(m.envMap);
    initTex(m.bumpMap);
    initTex(m.normalMap);
    const u = m.uniforms;
    if(u){
      initTex(u.map?.value);
      initTex(u.lightMap?.value);
      initTex(u.envMap?.value);
      initTex(u.bumpMap?.value);
      initTex(u.normalMap?.value);
    }
  };

  const warmMaterials = (mats?: THREE.Material | THREE.Material[] | null) => {
    if(!mats){ return; }
    if(Array.isArray(mats)){
      for(let i = 0; i < mats.length; i++){
        warmMaterial(mats[i]);
      }
      return;
    }
    warmMaterial(mats);
  };

  for(let i = 0; i < rooms.length; i++){
    const room = rooms[i];
    const model = room.model;
    if(model){
      warmMaterials((model as OdysseyModel3D).materials);
      model.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh & { materials?: THREE.Material[] };
        warmMaterials(mesh.material);
        warmMaterials(mesh.materials);
      });
    }
    if(room.grassBins?.length){
      for(let b = 0; b < room.grassBins.length; b++){
        warmMaterials(room.grassBins[b].mesh.material);
      }
    }else if(room.grass){
      warmMaterials(room.grass.material);
      room.grass.traverse?.((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        warmMaterials(mesh.material);
      });
    }
  }
}

/** Collect `.model` entries from module area objects for texture warm-up. */
export function collectModuleGpuTextureTargets(area: {
  rooms?: WarmRoomGpuRoom[];
  creatures?: Array<{ model?: OdysseyModel3D }>;
  placeables?: Array<{ model?: OdysseyModel3D }>;
  doors?: Array<{ model?: OdysseyModel3D }>;
}, party: Array<{ model?: OdysseyModel3D }>): WarmRoomGpuRoom[] {
  const out: WarmRoomGpuRoom[] = [];
  const rooms = area.rooms;
  if(rooms?.length){
    for(let i = 0; i < rooms.length; i++){
      out.push(rooms[i]);
    }
  }
  const pushModel = (obj?: { model?: OdysseyModel3D }) => {
    if(obj?.model){
      out.push({ model: obj.model });
    }
  };
  const creatures = area.creatures;
  if(creatures){
    for(let i = 0; i < creatures.length; i++){
      pushModel(creatures[i]);
    }
  }
  const placeables = area.placeables;
  if(placeables){
    for(let i = 0; i < placeables.length; i++){
      pushModel(placeables[i]);
    }
  }
  const doors = area.doors;
  if(doors){
    for(let i = 0; i < doors.length; i++){
      pushModel(doors[i]);
    }
  }
  for(let i = 0; i < party.length; i++){
    pushModel(party[i]);
  }
  return out;
}

ModuleGpuWarmLog.initFromUrl();

/**
 * Force every room model/grass visible for renderer.compile, then restore.
 * Does not touch visActive / audio — render-only.
 * @deprecated Superseded by {@link warmModuleGpu} after load; kept for tests.
 */
export function compileAreaRoomsVisible(
  rooms: WarmRoomGpuRoom[],
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera
): void {
  const savedModel: Array<boolean | undefined> = new Array(rooms.length);
  const savedGrass: Array<boolean | undefined> = new Array(rooms.length);
  const savedBins: Array<Array<boolean | undefined> | undefined> = new Array(rooms.length);

  for(let i = 0; i < rooms.length; i++){
    const room = rooms[i];
    if(room.model){
      savedModel[i] = room.model.visible;
      room.model.visible = true;
    }
    if(room.grassBins?.length){
      savedBins[i] = room.grassBins.map((bin) => {
        const v = bin.mesh.visible;
        bin.mesh.visible = true;
        return v;
      });
    }else if(room.grass){
      savedGrass[i] = room.grass.visible;
      room.grass.visible = true;
    }
  }

  try{
    renderer.compile(scene as THREE.Scene, camera);
  }finally{
    for(let i = 0; i < rooms.length; i++){
      const room = rooms[i];
      if(room.model && savedModel[i] !== undefined){
        room.model.visible = savedModel[i] as boolean;
      }
      if(room.grassBins?.length && savedBins[i]){
        for(let b = 0; b < room.grassBins.length; b++){
          const v = savedBins[i]![b];
          if(v !== undefined){
            room.grassBins[b].mesh.visible = v;
          }
        }
      }else if(room.grass && savedGrass[i] !== undefined){
        room.grass.visible = savedGrass[i] as boolean;
      }
    }
  }
}
