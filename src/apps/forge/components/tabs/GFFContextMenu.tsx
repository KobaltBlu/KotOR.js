import React from 'react';
import { ContextMenuItem } from '../common/ContextMenu';
import * as KotOR from '../../KotOR';

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
    'BYTE', 'CHAR', 'WORD', 'SHORT', 'DWORD', 'INT', 'DWORD64', 'INT64',
    'FLOAT', 'DOUBLE', 'CEXOSTRING', 'RESREF', 'CEXOLOCSTRING', 'BINARY',
    'STRUCT', 'LIST', 'ORIENTATION', 'VECTOR', 'STRREF'
  ];

  const items: ContextMenuItem[] = [
    ...fieldTypes.map(fieldType => ({
      id: `add-field-${fieldType.toLowerCase()}`,
      label: `Add Field: ${fieldType}`,
      onClick: () => {
        const dataType = KotOR.GFFDataType[fieldType as keyof typeof KotOR.GFFDataType];
        if (dataType !== undefined) {
          struct.addField(new KotOR.GFFField(dataType, `New ${fieldType} Field`, 0));
          onFieldAdded();
        }
      }
    } as ContextMenuItem))
  ];

  return items;
};
