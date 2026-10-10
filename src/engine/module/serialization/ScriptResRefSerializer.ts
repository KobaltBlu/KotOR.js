import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GffRoot } from '@engine/module/serialization/types';
import { readResRef } from '@engine/module/serialization/gffHelpers';

export interface ScriptResRefHost {
  scriptResRefs: Partial<Record<string, string>>;
  scripts?: { [key: string]: { name?: string } | undefined };
}

/**
 * Script hook RESREF fields on a root (or nested Scripts struct).
 */
export class ScriptResRefSerializer {
  static deserialize(
    target: ScriptResRefHost,
    root: GffRoot | undefined,
    scriptKeys: string[],
    defaultResRef?: string,
  ): void {
    if (!root?.hasField) return;
    for (const scriptKey of scriptKeys) {
      if (typeof target.scriptResRefs[scriptKey] === 'string') continue;
      if (root.hasField(scriptKey)) {
        target.scriptResRefs[scriptKey] = readResRef(root, scriptKey, '');
      } else if (defaultResRef !== undefined) {
        target.scriptResRefs[scriptKey] = defaultResRef;
      }
    }
  }

  static writeFields(
    parent: { addField: (f: GFFField) => GFFField },
    source: ScriptResRefHost,
    scriptKeys: string[],
    options?: { fallback?: string; preferLoadedName?: boolean },
  ): void {
    const fallback = options?.fallback;
    for (const key of scriptKeys) {
      let value: string | undefined;
      if (typeof source.scriptResRefs[key] === 'string') {
        value = source.scriptResRefs[key];
      } else if (options?.preferLoadedName) {
        value = source.scripts?.[key]?.name;
      }
      if (value === undefined) {
        value = fallback ?? '';
      }
      parent.addField(new GFFField(GFFDataType.RESREF, key)).setValue(value || '');
    }
  }
}
