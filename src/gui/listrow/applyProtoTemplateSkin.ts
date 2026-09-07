import type { GUIControl } from "@/gui/GUIControl";
import * as THREE from "three";

/**
 * Applies shared PROTOITEM font/texture from the list template to a row control.
 * Fully binds material.map / USE_MAP so the first list RTT pass has glyph alpha
 * even before the row's own font enqueue finishes.
 */
export function applyProtoTemplateSkin(row: GUIControl, template: GUIControl): void {
  row.guiFont = template.guiFont;
  const texture = template.text?.texture ?? template.text?.material?.uniforms?.map?.value;
  if (!(texture instanceof THREE.Texture) || !row.text?.material) {
    return;
  }

  const mat = row.text.material;
  row.text.texture = texture as typeof row.text.texture;
  if (mat.uniforms?.map) {
    mat.uniforms.map.value = texture;
  }
  (mat as any).map = texture;
  mat.defines = mat.defines || {};
  mat.defines.USE_UV = '';
  mat.defines.USE_MAP = '';
  mat.alphaTest = 0;
  if (mat.uniforms?.alphaTest) {
    mat.uniforms.alphaTest.value = 0;
  }
  mat.transparent = true;
  mat.depthTest = false;
  mat.depthWrite = false;
  mat.needsUpdate = true;
  mat.uniformsNeedUpdate = true;
}

/**
 * Pure skin rule for tests: the PROTOITEM template contributes font/texture only.
 * Row extent (width AND height) is authoritative — derives height from the
 * menu/entry-class base extent (GUIProtoItem.getProtoBaseExtent), never the template.
 */
export function customProtoRowExtentFromTemplate(
  rowExtent: { width: number; height: number },
  _templateExtent: { width: number; height: number },
): { width: number; height: number } {
  return {
    width: rowExtent.width,
    height: rowExtent.height,
  };
}
