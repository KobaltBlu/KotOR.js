import type { GUIControl } from "@engine/gui/GUIControl";
import { GUIControlType } from "@core/enums/gui/GUIControlType";

/**
 * Immutable snapshot of PROTOITEM-derived styling the listbox uses when building rows.
 * GFF is often a stub; row classes may still override layout.
 */
export class ProtoTemplateSnapshot {
  readonly type: GUIControlType;

  constructor(readonly source: GUIControl) {
    this.type = source.type;
  }

  static fromProtoTemplate(proto: GUIControl): ProtoTemplateSnapshot {
    return new ProtoTemplateSnapshot(proto);
  }
}
