import * as THREE from "three";
import type { GUIChromeMapSlot, IGUIControlChrome } from "@/interface/gui/IGUIControlChrome";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";
import { asGuiSize, asExtentInt, writeOrthoAlignedPlanePositions } from "@/gui/GUICoord";
export {
  GUI_CHROME_REGION_CORNER,
  GUI_CHROME_REGION_EDGE,
  GUI_CHROME_REGION_FILL,
  buildChromeGeometryForControl,
  buildChromeGeometryFromWorldQuads,
  buildFillChromeGeometry,
  chromeFrameRings,
  chromeWorldQuadCorners,
  chromeWorldQuadsFromRings,
} from "@/gui/chromeGeometry";
export type { ChromeWorldQuad } from "@/gui/chromeGeometry";

/** Shader hoverMode: swap border↔highlight samples. */
export const GUI_HOVER_MODE_SWAP = 0;
/** Shader hoverMode: alpha-over highlight on top of border (Pazaak cards). */
export const GUI_HOVER_MODE_OVERLAY = 1;

/**
 * Frame thickness for a single chrome mesh when border and highlight dims differ.
 * Empty idle border + thicker highlight (K1 saveload buttons) → use highlight dim.
 * Sizes go through {@link asGuiSize} (0.4 → 1) so thin frames are not discarded.
 */
export function chromeFrameDimension(
  borderDim: number,
  highlightDim: number,
  hasBorderFrame: boolean,
  hasHighlightFrame: boolean,
): number {
  const b = asGuiSize(borderDim);
  const h = asGuiSize(highlightDim);
  if(!hasBorderFrame && hasHighlightFrame){
    return h;
  }
  if(!hasHighlightFrame){
    return b;
  }
  return Math.max(b, h);
}

const HAS_UNIFORM: Record<GUIChromeMapSlot, string> = {
  edgeMap: 'hasEdgeMap',
  cornerMap: 'hasCornerMap',
  fillMap: 'hasFillMap',
  highlightEdgeMap: 'hasHighlightEdgeMap',
  highlightCornerMap: 'hasHighlightCornerMap',
  highlightFillMap: 'hasHighlightFillMap',
};

/** Create the shared odyssey-gui chrome ShaderMaterial. */
export function createGuiChromeMaterial(
  borderColor: THREE.Color,
  highlightColor: THREE.Color,
): THREE.ShaderMaterial {
  const shader = GameState.ShaderManager.Shaders.get('odyssey-gui');
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([shader.getUniforms()]),
    vertexShader: shader.getVertex(),
    fragmentShader: shader.getFragment(),
    side: THREE.FrontSide,
    fog: false,
    visible: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    defines: {
      GUI_SORT: '',
      GUI_CHROME: '',
      // Three.js UV chunks only declare/pass vUv when USE_UV is set.
      USE_UV: '',
    },
  });
  material.uniforms.diffuse.value = borderColor.clone();
  material.uniforms.highlightDiffuse.value = highlightColor.clone();
  material.uniforms.fillDiffuse.value = new THREE.Color(1, 1, 1);
  material.uniforms.opacity.value = 1;
  material.uniforms.edgeOpacity.value = 1;
  material.uniforms.fillOpacity.value = 1;
  material.uniforms.hovered.value = 0;
  material.uniforms.hoverMode.value = 0;
  material.uniforms.enableFrame.value = 1;
  material.uniforms.enableFill.value = 1;
  return material;
}

export function createGuiChrome(): IGUIControlChrome {
  const geometry = new THREE.BufferGeometry();
  const material = createGuiChromeMaterial(
    new THREE.Color(1, 1, 1),
    new THREE.Color(1, 1, 0),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'GUIChrome';
  mesh.frustumCulled = false;
  return { geometry, material, mesh };
}

export function stampRegionAttribute(geometry: THREE.BufferGeometry, region: number): void {
  const pos = geometry.getAttribute('position');
  if(!pos) return;
  // Non-finite region (e.g. missing export → undefined) becomes NaN in Float32Array
  // and makes the chrome shader discard every fragment.
  const id = Number.isFinite(region) ? region : 0;
  const arr = new Float32Array(pos.count);
  arr.fill(id);
  geometry.setAttribute('region', new THREE.BufferAttribute(arr, 1));
}

export function layoutOrthoPlanePositions(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
): void {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  if(!pos || pos.count < 4) return;
  writeOrthoAlignedPlanePositions(
    pos,
    Math.max(0, asExtentInt(width)),
    Math.max(0, asExtentInt(height)),
  );
  geometry.computeBoundingBox();
}

export function bindChromeTexture(
  material: THREE.ShaderMaterial,
  slot: GUIChromeMapSlot,
  texture: THREE.Texture | null,
): void {
  TextureLoader.assignMaterialTexture(material, texture, slot);
  const hasKey = HAS_UNIFORM[slot];
  if(material.uniforms[hasKey]){
    material.uniforms[hasKey].value = texture instanceof THREE.Texture ? 1 : 0;
  }
  if(texture instanceof THREE.Texture && material.uniforms.uvTransform && (texture as any).matrix){
    material.uniforms.uvTransform.value = (texture as any).matrix;
    texture.updateMatrix();
  }
  material.uniformsNeedUpdate = true;
  material.needsUpdate = true;
}

export function clearChromeTexture(material: THREE.ShaderMaterial, slot: GUIChromeMapSlot): void {
  bindChromeTexture(material, slot, null);
}
