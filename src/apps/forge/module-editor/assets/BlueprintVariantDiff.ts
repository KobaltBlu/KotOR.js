/**
 * Blueprint variant / override diff helpers.
 *
 * @file BlueprintVariantDiff.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as KotOR from "@/apps/forge/KotOR";

export interface BlueprintFieldDiff {
  label: string;
  inherited: string;
  override: string;
  changed: boolean;
}

function fieldPreview(field?: KotOR.GFFField): string {
  if (!field) return "";
  try {
    if (field.getType?.() === KotOR.GFFDataType.CEXOLOCSTRING) {
      return field.getCExoLocString()?.getValue?.() || "";
    }
    const value = field.getValue?.();
    if (value == null) return "";
    return String(value);
  } catch {
    return "";
  }
}

/**
 * Compare a project override GFF against a retail/base template GFF.
 * Marks fields that differ as overrides; identical fields are inherited.
 */
export function diffBlueprintGff(
  base: KotOR.GFFObject | undefined,
  override: KotOR.GFFObject | undefined,
): BlueprintFieldDiff[] {
  if (!override?.RootNode) {
    return [];
  }
  const labels = new Set<string>();
  for (const field of override.RootNode.getFields?.() || []) {
    labels.add(field.getLabel());
  }
  if (base?.RootNode) {
    for (const field of base.RootNode.getFields?.() || []) {
      labels.add(field.getLabel());
    }
  }
  const diffs: BlueprintFieldDiff[] = [];
  for (const label of Array.from(labels).sort()) {
    const inherited = fieldPreview(base?.RootNode?.getFieldByLabel?.(label));
    const current = fieldPreview(override.RootNode.getFieldByLabel(label));
    diffs.push({
      label,
      inherited,
      override: current,
      changed: inherited !== current,
    });
  }
  return diffs;
}

export function countOverrides(diffs: BlueprintFieldDiff[]): number {
  return diffs.filter((diff) => diff.changed).length;
}
