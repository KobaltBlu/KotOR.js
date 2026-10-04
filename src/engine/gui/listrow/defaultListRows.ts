import type { GUIListBox } from "@engine/gui/GUIListBox";
import type { GUIControl } from "@engine/gui/GUIControl";
import { GUICheckBox } from "@engine/gui/GUICheckBox";
import { GUIControlType } from "@core/enums/gui/GUIControlType";
import { applyProtoTemplateSkin } from "@engine/gui/listrow/applyProtoTemplateSkin";

export interface GUIListItemCallbacks {
  onClick?: (e: unknown, ...args: unknown[]) => void;
  onValueChanged?: (e: unknown, ...args: unknown[]) => void;
  onHover?: (e: unknown, ...args: unknown[]) => void;
}

function wireDefaultRowClick(
  list: GUIListBox,
  ctrl: GUIControl,
  node: unknown,
  options: GUIListItemCallbacks,
): void {
  if (ctrl.disableSelection || list.bitFlags.noSelectMode) {
    return;
  }

  // HandleLMouseDown: selectOnLeftClick → select on mouse down
  if (list.bitFlags.selectOnLeftClick || list.protoClickSelects) {
    ctrl.addEventListener("mouseDown", (e: unknown) => {
      (e as { stopPropagation?: () => void }).stopPropagation?.();
      const index = list.children.indexOf(ctrl);
      if (index >= 0 && index !== list.selectionIndex) {
        list.setSelectedControl(index, true);
      }
    });
  }

  ctrl.addEventListener("click", (e: unknown) => {
    (e as { stopPropagation?: () => void }).stopPropagation?.();
    list.select(ctrl);
    if (typeof options.onClick === "function") {
      options.onClick(node, ctrl);
    }
  });
}

/**
 * Default PROTOITEM row kinds from GFF (no custom GUIProtoItemClass).
 */
export function createDefaultLabelOrProtoItemRow(
  list: GUIListBox,
  protoTemplate: GUIControl,
  node: unknown,
  scale: boolean,
  options: GUIListItemCallbacks,
): GUIControl {
  const menu = list.menu;
  const ctrl = new menu.factory.GUIProtoItem(menu, protoTemplate.control, list, scale);
  applyProtoTemplateSkin(ctrl, protoTemplate);
  ctrl.isProtoItem = false;
  ctrl.offset = list.offset;
  ctrl.node = node;
  ctrl.setList(list);

  const widget = ctrl.createControl();
  ctrl.setTextColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);
  ctrl.setText(node as any);
  ctrl.buildText();

  list.itemGroup.add(widget);

  ctrl.setHighlightColor(ctrl.defaultHighlightColor.r, ctrl.defaultHighlightColor.g, ctrl.defaultHighlightColor.b);
  ctrl.setBorderColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);

  // Scroll-only description rows: hit-test OK, no hover hilight/pulse chrome.
  if (list.bitFlags.noSelectMode) {
    ctrl.disableHover = true;
  }

  wireDefaultRowClick(list, ctrl, node, options);
  return ctrl;
}

export function createDefaultCheckBoxRow(
  list: GUIListBox,
  protoTemplate: GUIControl,
  node: unknown,
  scale: boolean,
  options: GUIListItemCallbacks,
): GUIControl {
  const menu = list.menu;
  const ctrl = new menu.factory.GUICheckBox(menu, protoTemplate.control, list, scale);
  applyProtoTemplateSkin(ctrl, protoTemplate);
  // OptionsCheckbox Initialize(proto->extent, proto) — PROTOITEM extent is fixed pitch.
  const protoH = protoTemplate.extent?.height | 0;
  const protoW = protoTemplate.extent?.width | 0;
  if(protoH > 0){
    ctrl.setExtentHeight(protoH);
  }
  if(protoW > 0){
    ctrl.setExtentWidth(protoW);
  }
  ctrl.listRowAlignExtentToWrappedText = false;
  ctrl.isProtoItem = false;
  ctrl.offset = list.offset;
  ctrl.node = node;
  ctrl.setList(list);

  const widget = ctrl.createControl();
  ctrl.setTextColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);
  ctrl.setText(node as any);
  if(ctrl instanceof GUICheckBox){
    ctrl.alignText();
    ctrl.updateCBVisualState();
  }
  list.itemGroup.add(widget);

  wireDefaultRowClick(list, ctrl, node, options);

  if (typeof options.onValueChanged === "function") {
    ctrl.addEventListener("valueChanged", (e: unknown) => {
      (e as { stopPropagation?: () => void }).stopPropagation?.();
      options.onValueChanged!(node, ctrl);
    });
  }
  return ctrl;
}

export function createDefaultButtonRow(
  list: GUIListBox,
  protoTemplate: GUIControl,
  node: { getName: () => string },
  scale: boolean,
  options: GUIListItemCallbacks,
): GUIControl | undefined {
  const menu = list.menu;
  let ctrl: GUIControl;
  try {
    ctrl = new menu.factory.GUIButton(menu, protoTemplate.control, list, scale);
    // Height comes from the GFF-loaded extent (unverified fallback for default button rows);
    // supplies row height from menu/entry code, never the PROTOITEM template.
    ctrl.setExtentWidth(protoTemplate.extent.width);
    ctrl.guiFont = protoTemplate.guiFont;
    ctrl.isProtoItem = false;
    ctrl.offset = list.offset;
    ctrl.node = node;
    ctrl.setList(list);

    ctrl.setHighlightColor(ctrl.defaultHighlightColor.r, ctrl.defaultHighlightColor.g, ctrl.defaultHighlightColor.b);
    ctrl.setBorderColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);

    const widget = ctrl.createControl();
    ctrl.setTextColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);
    ctrl.setText(node.getName());

    list.itemGroup.add(widget);

    wireDefaultRowClick(list, ctrl, node, options);
    return ctrl;
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

export function createDefaultListRowByProtoType(
  list: GUIListBox,
  protoTemplate: GUIControl,
  type: number,
  node: any,
  scale: boolean,
  options: GUIListItemCallbacks,
): GUIControl | undefined {
  switch (type) {
    case GUIControlType.Label:
    case GUIControlType.ProtoItem:
      return createDefaultLabelOrProtoItemRow(list, protoTemplate, node, scale, options);
    case GUIControlType.CheckBox:
      return createDefaultCheckBoxRow(list, protoTemplate, node, scale, options);
    case GUIControlType.Button:
      return createDefaultButtonRow(list, protoTemplate, node, scale, options);
    default:
      console.error("GUIListBox.addItem", "Unknown ControlType", type);
      return undefined;
  }
}
