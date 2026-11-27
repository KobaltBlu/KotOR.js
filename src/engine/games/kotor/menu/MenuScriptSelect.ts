import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import type { Creature } from "@engine/module/Creature";

export interface AIScriptOption {
  nameStrRef: number;
  descStrRef: number;
  aiState: number;
  getName: () => string;
  /** Default PROTOITEM rows call `setText(node)` → `toString`. */
  toString: () => string;
}

/**
 * MenuScriptSelect — (`scriptselect`).
 *
 * Character BTN_SCRIPTS → SetCreatureID + AddPanel(flags=3) @ HandleInputEvent 0x29
 * (PushModalPanel — character stays drawn underneath).
 * aiscripts.2da: NAME_STRREF / DESCRIPTION_STRREF / AISTATE (ctor).
 * Accept / list AButton writes creature_stats->ai_state then PopModalPanel (0x27 / OnScriptSelected).
 *
 * @file MenuScriptSelect.ts
 */
export class MenuScriptSelect extends GameMenu {

  LST_AIState: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_Back: GUIButton;
  BTN_Accept: GUIButton;

  creature: Creature | undefined;
  options: AIScriptOption[] = [];
  selected: AIScriptOption | undefined;

  constructor(){
    super();
    this.gui_resref = 'scriptselect';
    this.background = '';
    this.voidFill = false;
    // AddPanel(flags=3) → PushModalPanel; character remains in the panel list.
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.loadOptionsFrom2DA();

      this.BTN_Back?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_Back;

      this.BTN_Accept?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.acceptAndClose();
      });
      this._button_a = this.BTN_Accept;

      if(this.LST_AIState){
        this.LST_AIState.onSelected = (opt: AIScriptOption) => {
          this.selected = opt;
          this.UpdateSelected();
        };
      }

      resolve();
    });
  }

  /** ctor loads aiscripts.2da NAME_STRREF / DESCRIPTION_STRREF / AISTATE. */
  loadOptionsFrom2DA(){
    const table = GameState.TwoDAManager?.datatables?.get('aiscripts');
    this.options = [];
    if(!table?.rows) return;

    const keys = Object.keys(table.rows);
    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      if(!row) continue;
      const nameStrRef = parseInt(row.NAME_STRREF ?? row.name_strref ?? '0', 10) | 0;
      const descStrRef = parseInt(row.DESCRIPTION_STRREF ?? row.description_strref ?? '0', 10) | 0;
      const aiState = parseInt(row.AISTATE ?? row.aistate ?? '0', 10) | 0;
      if(!nameStrRef && !descStrRef && !aiState && i === 0){
        // Keep empty/zero rows — includes all row_count entries.
      }
      this.options.push({
        nameStrRef,
        descStrRef,
        aiState,
        getName: () => GameState.TLKManager?.GetStringById?.(nameStrRef)?.Value || '',
        toString(){ return this.getName(); },
      });
    }
  }

  /**
   * SetCreatureID — select list row matching creature ai_state.
   */
  setCreature(creature: Creature | undefined){
    this.creature = creature;
    if(!this.options.length){
      this.loadOptionsFrom2DA();
    }

    let selectIndex = 0;
    const current = (creature?.aiState | 0);
    for(let i = 0; i < this.options.length; i++){
      if((this.options[i].aiState | 0) === current){
        selectIndex = i;
        break;
      }
    }

    this.LST_AIState?.setItems(this.options, {
      selectIndex: this.options.length ? selectIndex : -1,
    });

    if(!this.options.length){
      this.selected = undefined;
      this.LB_DESC?.setItem('');
    }else{
      this.selected = this.options[selectIndex];
      this.UpdateSelected();
    }
  }

  /** SetDescription — DESCRIPTION_STRREF for selected row. */
  UpdateSelected(){
    const strRef = this.selected?.descStrRef | 0;
    this.LB_DESC?.setItem(
      strRef ? (GameState.TLKManager?.GetStringById?.(strRef)?.Value || '') : ''
    );
  }

  /** Accept (0x27) — write ai_state then pop modal. */
  acceptAndClose(){
    if(this.creature && this.selected){
      this.creature.aiState = this.selected.aiState | 0;
    }
    GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
    this.close();
  }

  openForCreature(creature: Creature | undefined){
    this.setCreature(creature);
    this.open();
  }

  show(){
    super.show();
    if(this.creature){
      this.setCreature(this.creature);
    }
  }
}
