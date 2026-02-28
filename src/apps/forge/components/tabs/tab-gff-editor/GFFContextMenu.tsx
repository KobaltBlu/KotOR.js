import { ContextMenuItem } from '@/apps/forge/components/common/ContextMenu';
import * as KotOR from '@/apps/forge/KotOR';

export interface GFFContextMenuProps {
  struct: KotOR.GFFStruct;
  onFieldAdded: () => void;
  onStructCut?: () => void;
  onStructCopy?: () => void;
  onFieldPaste?: () => void;
  onStructDelete?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export const createGFFContextMenuItems = (props: GFFContextMenuProps): ContextMenuItem[] => {
  const {
    struct,
    onFieldAdded,
    onStructCut,
    onStructCopy,
    onFieldPaste,
    onStructDelete,
    onNew,
    onOpen,
    onClose
  } = props;

  const fieldTypes = [
    { label: 'BYTE', type: KotOR.GFFDataType.BYTE },
    { label: 'CHAR', type: KotOR.GFFDataType.CHAR },
    { label: 'WORD', type: KotOR.GFFDataType.WORD },
    { label: 'SHORT', type: KotOR.GFFDataType.SHORT },
    { label: 'DWORD', type: KotOR.GFFDataType.DWORD },
    { label: 'INT', type: KotOR.GFFDataType.INT },
    { label: 'DWORD64', type: KotOR.GFFDataType.DWORD64 },
    { label: 'INT64', type: KotOR.GFFDataType.INT64 },
    { label: 'FLOAT', type: KotOR.GFFDataType.FLOAT },
    { label: 'DOUBLE', type: KotOR.GFFDataType.DOUBLE },
    { label: 'CExoString', type: KotOR.GFFDataType.CEXOSTRING },
    { label: 'ResRef', type: KotOR.GFFDataType.RESREF },
    { label: 'CExoLocString', type: KotOR.GFFDataType.CEXOLOCSTRING },
    { label: 'VOID', type: KotOR.GFFDataType.VOID },
    { label: 'Struct', type: KotOR.GFFDataType.STRUCT },
    { label: 'List', type: KotOR.GFFDataType.LIST },
    { label: 'Orientation', type: KotOR.GFFDataType.ORIENTATION },
    { label: 'Vector', type: KotOR.GFFDataType.VECTOR },
  ];

  const addFieldItems: ContextMenuItem[] = fieldTypes.map((fieldType, _index) => ({
    id: `add-field-${fieldType.label.toLowerCase()}`,
    label: `Add ${fieldType.label}`,
    onClick: () => {
      struct.addField(new KotOR.GFFField(fieldType.type, 'New Field [Untitled]', 0));
      onFieldAdded();
    }
  }));

  return [
    ...addFieldItems,
    { id: 'separator-1', separator: true },
    {
      id: 'cut',
      label: 'Cut',
      onClick: onStructCut,
      disabled: !onStructCut
    },
    {
      id: 'copy',
      label: 'Copy',
      onClick: onStructCopy,
      disabled: !onStructCopy
    },
    {
      id: 'paste',
      label: 'Paste',
      onClick: onFieldPaste,
      disabled: !onFieldPaste
    },
    { id: 'separator-2', separator: true },
    {
      id: 'delete',
      label: 'Delete',
      onClick: onStructDelete,
      disabled: !onStructDelete
    }
  ];
};
