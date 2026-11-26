import * as THREE from "three";

/**
 * Keeps linked WebGL programs alive across module unloads so the next module
 * load reuses them instead of re-linking every shader variant.
 *
 * Two things must survive for a later material to hit three's program cache:
 *  - the WebGLProgram itself (three destroys it when its usedTimes reaches 0), and
 *  - the custom shader stages a ShaderMaterial's cache key is built from. Stage ids
 *    come from a global counter, and three drops a stage when the last material
 *    using that shader code is disposed, so a recreated stage gets a new id and
 *    every program keyed on the old id becomes unreachable.
 *
 * Programs are pinned by holding one extra use. Stages are pinned by compiling one
 * never-disposed "keeper" material per distinct shader source; keepers carry no
 * textures and are never drawn.
 */
export class ShaderProgramRetention {
  static enabled = true;
  /** Upper bound on pinned programs (each holds a small amount of GPU memory). */
  static maxPinnedPrograms = 768;
  /** Upper bound on keeper materials (one per distinct vertex+fragment source). */
  static maxKeepers = 256;

  private static pinned = new WeakSet<object>();
  private static pinnedCount = 0;
  private static keepers = new Map<string, THREE.ShaderMaterial>();
  private static renderer: THREE.WebGLRenderer | null = null;
  /** three replaces its program list when the GL context is restored. */
  private static programList: unknown = null;

  static get pinnedProgramCount(): number { return ShaderProgramRetention.pinnedCount; }
  static get keeperCount(): number { return ShaderProgramRetention.keepers.size; }

  /** Forget all retention state (e.g. renderer replaced or context lost). */
  static reset(): void {
    for(const keeper of ShaderProgramRetention.keepers.values()){
      keeper.dispose();
    }
    ShaderProgramRetention.keepers.clear();
    ShaderProgramRetention.pinned = new WeakSet<object>();
    ShaderProgramRetention.pinnedCount = 0;
    ShaderProgramRetention.renderer = null;
    ShaderProgramRetention.programList = null;
  }

  /**
   * Pin every program the renderer currently holds and keep the custom shader
   * stages for every ShaderMaterial in `scene` alive. Call while the render target
   * that gameplay draws into (or one with the same color space rules) is bound,
   * right after the scene has been compiled, so keeper compiles hit the cache.
   */
  static retain(renderer: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera): void {
    if(!ShaderProgramRetention.enabled || !renderer){ return; }
    const programList = (renderer.info as { programs?: unknown }).programs ?? null;
    if(
      (ShaderProgramRetention.renderer && ShaderProgramRetention.renderer !== renderer) ||
      (ShaderProgramRetention.programList && ShaderProgramRetention.programList !== programList)
    ){
      ShaderProgramRetention.reset();
    }
    ShaderProgramRetention.renderer = renderer;
    ShaderProgramRetention.programList = programList;

    ShaderProgramRetention.retainStages(renderer, scene, camera);
    ShaderProgramRetention.pinPrograms(renderer);
  }

  static pinPrograms(renderer: THREE.WebGLRenderer): void {
    const programs = (renderer.info as { programs?: Array<{ usedTimes: number }> | null }).programs;
    if(!programs){ return; }
    for(let i = 0; i < programs.length; i++){
      if(ShaderProgramRetention.pinnedCount >= ShaderProgramRetention.maxPinnedPrograms){ return; }
      const program = programs[i];
      if(!program || ShaderProgramRetention.pinned.has(program)){ continue; }
      program.usedTimes++;
      ShaderProgramRetention.pinned.add(program);
      ShaderProgramRetention.pinnedCount++;
    }
  }

  private static retainStages(renderer: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera): void {
    const proxies: THREE.Object3D[] = [];
    const keepers = ShaderProgramRetention.keepers;
    scene.traverse((obj) => {
      const drawable = obj as THREE.Mesh;
      if(!(drawable.isMesh || (obj as THREE.Points).isPoints || (obj as THREE.Line).isLine || (obj as THREE.Sprite).isSprite)){
        return;
      }
      const mats = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
      for(let i = 0; i < mats.length; i++){
        const mat = mats[i] as THREE.ShaderMaterial;
        if(!mat || !mat.isShaderMaterial){ continue; }
        if(keepers.size >= ShaderProgramRetention.maxKeepers){ return; }
        const key = mat.vertexShader + "\u0000" + mat.fragmentShader;
        if(keepers.has(key)){ continue; }
        const keeper = createKeeperMaterial(mat);
        keepers.set(key, keeper);
        // Same object flags (skinning, instancing, geometry attributes) as the
        // source mesh, so the keeper resolves to an already-linked program.
        const proxy = Object.create(obj) as THREE.Object3D;
        (proxy as THREE.Mesh).material = keeper;
        proxy.children = [];
        proxies.push(proxy);
      }
    });
    if(!proxies.length){ return; }

    const holder = new THREE.Scene();
    holder.children = proxies;
    try{
      renderer.compile(holder, camera, scene as THREE.Scene);
    }catch(e){
      console.warn("ShaderProgramRetention: keeper compile failed", e);
    }
    holder.children = [];
  }
}

/**
 * A texture-free copy of `source` with the same shader code, defines and render
 * state. Never drawn; it only has to resolve to the same program cache key.
 */
export function createKeeperMaterial(source: THREE.ShaderMaterial): THREE.ShaderMaterial {
  const keeper = (source as THREE.RawShaderMaterial).isRawShaderMaterial
    ? new THREE.RawShaderMaterial()
    : new THREE.ShaderMaterial();
  // Material.copy JSON-clones userData, which may hold scene references.
  const userData = source.userData;
  source.userData = {};
  try{
    THREE.Material.prototype.copy.call(keeper, source);
  }finally{
    source.userData = userData;
  }
  (keeper as { type: string }).type = source.type;
  keeper.vertexShader = source.vertexShader;
  keeper.fragmentShader = source.fragmentShader;
  keeper.defines = Object.assign({}, source.defines);
  keeper.wireframe = source.wireframe;
  keeper.wireframeLinewidth = source.wireframeLinewidth;
  keeper.fog = source.fog;
  keeper.lights = source.lights;
  keeper.clipping = source.clipping;
  keeper.extensions = Object.assign({}, source.extensions);
  keeper.glslVersion = source.glslVersion;
  keeper.index0AttributeName = source.index0AttributeName;
  keeper.defaultAttributeValues = Object.assign({}, source.defaultAttributeValues);
  keeper.name = source.name ? `${source.name}:keeper` : "keeper";

  // Fresh uniform slots (three writes light / clipping values into them) with no
  // texture references, so a keeper never retains image data.
  const uniforms: Record<string, THREE.IUniform> = {};
  const src = source.uniforms || {};
  for(const k in src){
    const value = src[k]?.value;
    if(value && (value as THREE.Texture).isTexture){
      uniforms[k] = { value: null };
    }else if(Array.isArray(value) && value.some((v) => v && (v as THREE.Texture).isTexture)){
      uniforms[k] = { value: [] };
    }else{
      uniforms[k] = { value };
    }
  }
  keeper.uniforms = uniforms;
  keeper.uniformsGroups = [];
  return keeper;
}
