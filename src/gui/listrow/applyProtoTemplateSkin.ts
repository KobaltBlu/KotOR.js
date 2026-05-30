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
 * Custom row presenters: font from template; colors cloned in addItem path.
 */
export function applyCustomProtoRowSkin(row: GUIControl, template: GUIControl): void {
  row.guiFont = template.guiFont;
}
