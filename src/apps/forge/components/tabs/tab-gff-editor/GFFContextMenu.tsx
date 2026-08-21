/**
 * Context menus for the generic GFF tree.
 *
 * @file GFFContextMenu.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { gffFieldTypeOptions } from "@/apps/forge/helpers/gffJsonCodec";

export interface GFFStructContextMenuArgs {
  isRoot: boolean;
  canPaste: boolean;
  onAddField: (type: number) => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export interface GFFFieldContextMenuArgs {
  isList: boolean;
  canPaste: boolean;
  onAddStruct?: () => void;
  onChangeType: (type: number) => void;
  onRename?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const typeItems = (onPick: (type: number) => void, idPrefix: string): ContextMenuItem[] => {
  return gffFieldTypeOptions().map((entry) => ({
    id: `${idPrefix}-${entry.type}`,
    label: entry.label,
    onClick: () => onPick(entry.type),
  }));
};

export const createGFFStructContextMenuItems = (args: GFFStructContextMenuArgs): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [
    {
      id: "add-field",
      label: "Add Field",
      submenu: typeItems(args.onAddField, "add-field"),
    },
    { id: "separator-edit", separator: true },
    { id: "cut", label: "Cut", shortcut: "Ctrl+X", onClick: args.onCut, disabled: args.isRoot || !args.onCut },
    { id: "copy", label: "Copy", shortcut: "Ctrl+C", onClick: args.onCopy, disabled: !args.onCopy },
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", onClick: args.onPaste, disabled: !args.canPaste },
    { id: "duplicate", label: "Duplicate", shortcut: "Ctrl+D", onClick: args.onDuplicate, disabled: args.isRoot || !args.onDuplicate },
    { id: "separator-delete", separator: true },
    { id: "delete", label: "Delete", shortcut: "Del", onClick: args.onDelete, disabled: args.isRoot || !args.onDelete },
  ];
  return items;
};

export const createGFFFieldContextMenuItems = (args: GFFFieldContextMenuArgs): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [];
  if (args.isList) {
    items.push({
      id: "add-struct",
      label: "Add Struct",
      onClick: args.onAddStruct,
    });
  }
  items.push(
    {
      id: "change-type",
      label: "Change Type",
      submenu: typeItems(args.onChangeType, "change-type"),
    },
    { id: "rename", label: "Rename", shortcut: "F2", onClick: args.onRename },
    { id: "separator-edit", separator: true },
    { id: "cut", label: "Cut", shortcut: "Ctrl+X", onClick: args.onCut },
    { id: "copy", label: "Copy", shortcut: "Ctrl+C", onClick: args.onCopy },
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", onClick: args.onPaste, disabled: !args.canPaste },
    { id: "duplicate", label: "Duplicate", shortcut: "Ctrl+D", onClick: args.onDuplicate },
    { id: "separator-delete", separator: true },
    { id: "delete", label: "Delete", shortcut: "Del", onClick: args.onDelete },
  );
  return items;
};
