import type { GUIControl } from "@/gui/GUIControl";

/**
 * Applies shared PROTOITEM font/texture from the list template to a row control.
 */
export function applyProtoTemplateSkin(row: GUIControl, template: GUIControl): void {
  row.guiFont = template.guiFont;
  if (row.text?.material?.uniforms?.map && template.text?.material?.uniforms?.map) {
    row.text.texture = template.text.texture;
    row.text.material.uniforms.map.value = template.text.material.uniforms.map.value;
  }
}

/**
 * Pure skin rule for tests: the PROTOITEM template contributes font/texture only.
 * Row extent (width AND height) is authoritative — retail derives height from the
 * menu/entry-class base extent (GUIProtoItem.getRetailBaseExtent), never the template.
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
