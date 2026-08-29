/**
 * Multi-object selection for the module editor.
 *
 * @file SelectionService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import type { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export interface SelectionFilter {
  /** Object type names allowed when non-empty (e.g. "creature"). */
  types?: string[];
  /** Hide locked objects from selection. */
  excludeLocked?: boolean;
  /** Hide hidden objects from selection. */
  excludeHidden?: boolean;
}

export class SelectionService extends EventListenerModel {
  private primary: ForgeGameObject | undefined;
  private selected: ForgeGameObject[] = [];
  private locked = new Set<string>();
  private hidden = new Set<string>();
  private filter: SelectionFilter = {};
  entryPointSelected = false;

  get primaryObject(): ForgeGameObject | undefined {
    return this.primary;
  }

  get objects(): readonly ForgeGameObject[] {
    return this.selected;
  }

  get count(): number {
    return this.selected.length;
  }

  getFilter(): SelectionFilter {
    return { ...this.filter, types: this.filter.types ? [...this.filter.types] : undefined };
  }

  setFilter(filter: SelectionFilter): void {
    this.filter = {
      ...filter,
      types: filter.types ? [...filter.types] : undefined,
    };
    this.processEventListener("onFilterChanged", [this.filter]);
  }

  isLocked(object: ForgeGameObject): boolean {
    return this.locked.has(this.keyOf(object));
  }

  isHidden(object: ForgeGameObject): boolean {
    return this.hidden.has(this.keyOf(object));
  }

  setLocked(object: ForgeGameObject, locked: boolean): void {
    const key = this.keyOf(object);
    if (locked) {
      this.locked.add(key);
      this.remove(object);
    } else {
      this.locked.delete(key);
    }
    this.processEventListener("onLockChanged", [object, locked]);
  }

  setHidden(object: ForgeGameObject, hidden: boolean): void {
    const key = this.keyOf(object);
    if (hidden) {
      this.hidden.add(key);
      this.remove(object);
    } else {
      this.hidden.delete(key);
    }
    this.processEventListener("onHideChanged", [object, hidden]);
  }

  clear(): void {
    this.primary = undefined;
    this.selected = [];
    this.entryPointSelected = false;
    this.emitSelectionChanged();
  }

  select(object: ForgeGameObject | undefined, additive = false): void {
    this.entryPointSelected = false;
    if (!object) {
      if (!additive) {
        this.clear();
      }
      return;
    }
    if (!this.passesFilter(object)) {
      return;
    }
    if (additive) {
      const index = this.selected.indexOf(object);
      if (index >= 0) {
        this.selected.splice(index, 1);
        this.primary = this.selected[this.selected.length - 1];
      } else {
        this.selected.push(object);
        this.primary = object;
      }
    } else {
      this.selected = [object];
      this.primary = object;
    }
    this.emitSelectionChanged();
  }

  selectMany(objects: ForgeGameObject[], additive = false): void {
    this.entryPointSelected = false;
    const next = objects.filter((object) => this.passesFilter(object));
    if (additive) {
      for (const object of next) {
        if (this.selected.indexOf(object) < 0) {
          this.selected.push(object);
        }
      }
    } else {
      this.selected = next.slice();
    }
    this.primary = this.selected[this.selected.length - 1];
    this.emitSelectionChanged();
  }

  selectEntryPoint(): void {
    this.primary = undefined;
    this.selected = [];
    this.entryPointSelected = true;
    this.emitSelectionChanged();
  }

  remove(object: ForgeGameObject): void {
    const index = this.selected.indexOf(object);
    if (index < 0) {
      return;
    }
    this.selected.splice(index, 1);
    if (this.primary === object) {
      this.primary = this.selected[this.selected.length - 1];
    }
    this.emitSelectionChanged();
  }

  private passesFilter(object: ForgeGameObject): boolean {
    if (this.filter.excludeLocked && this.isLocked(object)) {
      return false;
    }
    if (this.filter.excludeHidden && this.isHidden(object)) {
      return false;
    }
    if (this.filter.types && this.filter.types.length > 0) {
      const type = String((object as any).objectType || object.constructor?.name || "").toLowerCase();
      if (!this.filter.types.some((candidate) => type.includes(candidate.toLowerCase()))) {
        return false;
      }
    }
    return true;
  }

  private keyOf(object: ForgeGameObject): string {
    return String((object as any).uuid || (object as any).tag || object.templateResRef || object.constructor.name);
  }

  private emitSelectionChanged(): void {
    this.processEventListener("onSelectionChanged", [this.primary, this.selected.slice(), this.entryPointSelected]);
  }
}
