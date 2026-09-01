/**
 * Constrained contribution / extension model for Forge module editor.
 *
 * @file ModuleExtensionTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ValidationIssue } from "@/apps/forge/module-editor/validation/ModuleValidationTypes";
import type { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";

export interface ModuleValidatorContribution {
  id: string;
  label: string;
  validate: (module: ForgeModule) => Promise<ValidationIssue[]> | ValidationIssue[];
}

export interface ModuleCommandContribution {
  id: string;
  title: string;
  category?: string;
  run: () => void | Promise<void>;
}

export interface ModuleInspectorSectionContribution {
  id: string;
  title: string;
  /** Object constructor names this section applies to, or empty for all. */
  objectTypes?: string[];
  render: (object: unknown) => unknown;
}

export interface ModuleExtensionManifest {
  id: string;
  name: string;
  version: string;
  validators?: ModuleValidatorContribution[];
  commands?: ModuleCommandContribution[];
  inspectorSections?: ModuleInspectorSectionContribution[];
}

const manifests: ModuleExtensionManifest[] = [];

export class ModuleExtensionRegistry {
  static register(manifest: ModuleExtensionManifest): void {
    const index = manifests.findIndex((item) => item.id === manifest.id);
    if (index >= 0) {
      manifests[index] = manifest;
    } else {
      manifests.push(manifest);
    }
  }

  static unregister(id: string): void {
    const index = manifests.findIndex((item) => item.id === id);
    if (index >= 0) {
      manifests.splice(index, 1);
    }
  }

  static list(): ModuleExtensionManifest[] {
    return manifests.slice();
  }

  static validators(): ModuleValidatorContribution[] {
    return manifests.flatMap((manifest) => manifest.validators || []);
  }

  static commands(): ModuleCommandContribution[] {
    return manifests.flatMap((manifest) => manifest.commands || []);
  }
}
