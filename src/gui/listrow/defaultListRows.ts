import type { GUIListBox } from '@/gui/GUIListBox';
import type { GUIControl } from '@/gui/GUIControl';
import { GUIControlType } from '@/enums/gui/GUIControlType';
import { applyProtoTemplateSkin } from '@/gui/listrow/applyProtoTemplateSkin';

export interface GUIListItemCallbacks {
  onClick?: (e: unknown, ...args: unknown[]) => void;
  onValueChanged?: (e: unknown, ...args: unknown[]) => void;
  onHover?: (e: unknown, ...args: unknown[]) => void;
}

/**
 * Default PROTOITEM row kinds from GFF (no custom GUIProtoItemClass).
 */
export function createDefaultLabelOrProtoItemRow(
  list: GUIListBox,
  protoTemplate: GUIControl,
  node: unknown,
  scale: boolean,
  options: GUIListItemCallbacks
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

  if (typeof options.onClick === 'function') {
    ctrl.addEventListener('click', (e: unknown) => {
      (e as { stopPropagation?: () => void }).stopPropagation?.();
      list.select(ctrl);
      options.onClick!(node, ctrl);
    });
  }
  return ctrl;
}

export function createDefaultCheckBoxRow(
  list: GUIListBox,
  protoTemplate: GUIControl,
  node: unknown,
  scale: boolean,
  options: GUIListItemCallbacks
): GUIControl {
  const menu = list.menu;
  const ctrl = new menu.factory.GUICheckBox(menu, protoTemplate.control, list, scale);
  applyProtoTemplateSkin(ctrl, protoTemplate);
  ctrl.isProtoItem = false;
  ctrl.offset = list.offset;
  ctrl.node = node;
  ctrl.setList(list);

  const widget = ctrl.createControl();
  ctrl.setTextColor(ctrl.defaultColor.r, ctrl.defaultColor.g, ctrl.defaultColor.b);
  ctrl.setText(node as any);
  list.itemGroup.add(widget);

  if (typeof options.onClick === 'function') {
    ctrl.addEventListener('click', (e: unknown) => {
      (e as { stopPropagation?: () => void }).stopPropagation?.();
      list.select(ctrl);
      options.onClick!(node, ctrl);
    });
  }

  if (typeof options.onValueChanged === 'function') {
    ctrl.addEventListener('valueChanged', (e: unknown) => {
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
  options: GUIListItemCallbacks
): GUIControl | undefined {
  const menu = list.menu;
  let ctrl: GUIControl;
  try {
    ctrl = new menu.factory.GUIButton(menu, protoTemplate.control, list, scale);
    ctrl.extent.height = protoTemplate.extent.height;
    ctrl.extent.width = protoTemplate.extent.width;
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

    if (typeof options.onClick === 'function') {
      ctrl.addEventListener('click', (e: unknown) => {
        (e as { stopPropagation?: () => void }).stopPropagation?.();
        list.select(ctrl);
        options.onClick!(node, ctrl);
      });
    }
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
  options: GUIListItemCallbacks
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
      console.error('GUIListBox.addItem', 'Unknown ControlType', type);
      return undefined;
  }
}
