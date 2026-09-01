import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleCreature } from "@/module/ModuleCreature";

export interface AIScriptOption {
  nameStrRef: number;
  descStrRef: number;
  aiState: number;
  getName: () => string;
}

/**
 * MenuScriptSelect — retail (`scriptselect`).
 *
 * Character BTN_SCRIPTS → SetCreatureID + AddPanel @ HandleInputEvent 0x29.
 * aiscripts.2da: NAME_STRREF / DESCRIPTION_STRREF / AISTATE (ctor).
 * Accept writes creature_stats->ai_state (HandleInputEvent 0x27).
 *
 * @file MenuScriptSelect.ts
 */
export class MenuScriptSelect extends GameMenu {

  LST_AIState: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_Back: GUIButton;
  BTN_Accept: GUIButton;

  creature: ModuleCreature | undefined;
  options: AIScriptOption[] = [];
  selected: AIScriptOption | undefined;

  constructor(){
    super();
    this.gui_resref = 'scriptselect';
    this.background = '';
    this.voidFill = false;
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

  /** Retail ctor loads aiscripts.2da NAME_STRREF / DESCRIPTION_STRREF / AISTATE. */
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
        // Keep empty/zero rows — retail includes all row_count entries.
      }
      this.options.push({
        nameStrRef,
        descStrRef,
        aiState,
        getName: () => GameState.TLKManager?.GetStringById?.(nameStrRef)?.Value || '',
      });
    }
  }

  /**
   * Retail SetCreatureID — select list row matching creature ai_state.
   */
  setCreature(creature: ModuleCreature | undefined){
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

  /** Retail SetDescription — DESCRIPTION_STRREF for selected row. */
  UpdateSelected(){
    const strRef = this.selected?.descStrRef | 0;
    this.LB_DESC?.setItem(
      strRef ? (GameState.TLKManager?.GetStringById?.(strRef)?.Value || '') : ''
    );
  }

  /** Retail Accept (0x27) — write ai_state then pop modal. */
  acceptAndClose(){
    if(this.creature && this.selected){
      this.creature.aiState = this.selected.aiState | 0;
    }
    GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
    this.close();
  }

  openForCreature(creature: ModuleCreature | undefined){
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
