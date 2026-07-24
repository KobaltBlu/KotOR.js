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
 * Custom row presenters: font + PROTOITEM extent from template.
 * Presenters may still override height for documented per-menu cases
 * (inventory/equip/container, keymap).
 */
export function applyCustomProtoRowSkin(row: GUIControl, template: GUIControl): void {
  row.guiFont = template.guiFont;
  if(template.extent){
    if(template.extent.width){
      row.setExtentWidth(template.extent.width);
    }
    if(template.extent.height){
      row.setExtentHeight(template.extent.height);
    }
  }
}
