/**
 * Named transactional commands for the module editor.
 *
 * @file EditorCommand.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type EditorCommandKind =
  | "transform"
  | "property"
  | "add"
  | "remove"
  | "duplicate"
  | "geometry"
  | "room"
  | "vis"
  | "entry"
  | "snapshot"
  | "custom";

export interface EditorCommand {
  id: string;
  label: string;
  kind: EditorCommandKind;
  timestamp: number;
  coalesceKey?: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

export interface EditorCommandDescriptor {
  label: string;
  kind: EditorCommandKind;
  coalesceKey?: string;
  coalesceMs?: number;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

let nextCommandId = 1;

export function createEditorCommand(descriptor: EditorCommandDescriptor): EditorCommand {
  return {
    id: `cmd-${nextCommandId++}`,
    label: descriptor.label,
    kind: descriptor.kind,
    timestamp: Date.now(),
    coalesceKey: descriptor.coalesceKey,
    undo: descriptor.undo,
    redo: descriptor.redo,
  };
}
