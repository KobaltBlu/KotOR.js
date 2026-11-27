import type { ActionMenuItem } from "@engine/menu/ActionMenuItem";

/** No entry chosen yet: the slot shows its first entry. */
export const ACTION_MENU_NO_SELECTION = -1;

/**
 * ActionMenuPanel class.
 *
 * One HUD action slot. Entries that carry an `id` (every personal slot) are
 * selected by that id, so the choice follows the entry when the list is
 * rebuilt: using up a medpac does not shift the slot onto a different item,
 * and a remembered entry comes back once it reappears. A remembered id that
 * is missing from the list shows the first entry without being forgotten.
 * Entries without an id (target slots) keep plain index selection.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionMenuPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuPanel {
  selectedIndex = 0;
  /** Remembered entry id for id-keyed slots. */
  selectedId: number = ACTION_MENU_NO_SELECTION;
  actions: any[] = [];

  constructor(){

  }

  /** Whether this slot's entries are selected by id. */
  isKeyed(): boolean {
    return typeof this.actions[0]?.id === 'number';
  }

  /** Index of the remembered entry, or -1 when it is not in the list. */
  indexOfSelectedId(): number {
    if(this.selectedId === ACTION_MENU_NO_SELECTION) return -1;
    for(let i = 0; i < this.actions.length; i++){
      if(this.actions[i]?.id === this.selectedId) return i;
    }
    return -1;
  }

  /** Returns true when the selection moved. */
  previousAction(): boolean {
    if(this.isKeyed()){
      const count = this.actions.length;
      if(count <= 1) return false;
      const index = this.indexOfSelectedId();
      const prev = index <= 0 ? count - 1 : index - 1;
      this.selectedId = this.actions[prev].id;
      this.selectedIndex = prev;
      return true;
    }
    if(this.actions.length){
      this.selectedIndex -= 1;
      if(this.selectedIndex < 0)
      this.selectedIndex = this.actions.length - 1;
      return this.actions.length > 1;
    }
    this.selectedIndex = 0;
    return false;
  }

  /** Returns true when the selection moved. */
  nextAction(): boolean {
    if(this.isKeyed()){
      const count = this.actions.length;
      if(count <= 1) return false;
      // An unremembered slot is showing entry 0, so "next" is entry 1.
      const index = this.indexOfSelectedId();
      const next = index < 0 ? 1 : (index + 1) % count;
      this.selectedId = this.actions[next].id;
      this.selectedIndex = next;
      return true;
    }
    if(this.actions.length){
      this.selectedIndex += 1;
      if(this.selectedIndex > (this.actions.length - 1))
        this.selectedIndex = 0;
      return this.actions.length > 1;
    }
    this.selectedIndex = 0;
    return false;
  }

  /** Remember `id` as this slot's choice (it may not be listed yet). */
  selectId(id: number){
    this.selectedId = id;
  }

  addAction(action: ActionMenuItem){
    if(!action){ return; }
    this.actions.push(action);
  }

  getSelectedAction(){
    if(!this.actions.length){
      this.selectedIndex = 0;
      return undefined;
    }
    if(this.isKeyed()){
      const index = this.indexOfSelectedId();
      this.selectedIndex = index < 0 ? 0 : index;
      return this.actions[this.selectedIndex];
    }
    if(this.selectedIndex >= this.actions.length){
      this.selectedIndex = this.actions.length - 1;
    }
    if(this.selectedIndex < 0){
      this.selectedIndex = 0;
    }
    return this.actions[this.selectedIndex];
  }

  clearActions(){
    // Keep the selection across per-frame rebuilds; getSelectedAction resolves it.
    this.actions = [];
  }

  reset(){
    this.selectedIndex = 0;
    this.selectedId = ACTION_MENU_NO_SELECTION;
  }
}
