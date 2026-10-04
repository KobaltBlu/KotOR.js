import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@engine/gui";
import { AutoPauseState } from "@engine/enums/engine/AutoPauseState";

/** auto-pause menu description TLKs (ctor custom_value). */
const TLK_DESC_ENDROUND = 0xa5cd;
const TLK_DESC_ENEMYSIGHTED = 0xa5ce;
const TLK_DESC_MINESIGHTED = 0xbfdd;
const TLK_DESC_PARTYKILLED = 0xa5cf;
const TLK_DESC_ACTIONMENU = 0xbd20;
const TLK_DESC_TRIGGERS = 0xbc56;

type AutoPauseOption = {
  control: keyof MenuAutoPause;
  ini: string;
  type: AutoPauseState;
  desc: number;
};

/**
 * MenuAutoPause class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuAutoPause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuAutoPause extends GameMenu {

  LBL_TITLE: GUILabel;
  CB_ENEMYSIGHTED: GUICheckBox;
  CB_PARTYKILLED: GUICheckBox;
  CB_ACTIONMENU: GUICheckBox;
  LB_DETAILS: GUIListBox;
  CB_ENDROUND: GUICheckBox;
  CB_TRIGGERS: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  CB_MINESIGHTED: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optautopause';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  protected getAutoPauseOptions(): ReadonlyArray<AutoPauseOption> {
    return [
      { control: 'CB_ENDROUND', ini: 'Autopause Options.End Of Combat Round', type: AutoPauseState.CombatRoundEnd, desc: TLK_DESC_ENDROUND },
      { control: 'CB_ENEMYSIGHTED', ini: 'Autopause Options.Enemy Sighted', type: AutoPauseState.EnemySighted, desc: TLK_DESC_ENEMYSIGHTED },
      { control: 'CB_MINESIGHTED', ini: 'Autopause Options.Mine Sighted', type: AutoPauseState.MineSighted, desc: TLK_DESC_MINESIGHTED },
      { control: 'CB_PARTYKILLED', ini: 'Autopause Options.Party Killed', type: AutoPauseState.PartyMemberKilled, desc: TLK_DESC_PARTYKILLED },
      { control: 'CB_ACTIONMENU', ini: 'Autopause Options.Action Menu', type: AutoPauseState.ActionMenuUsed, desc: TLK_DESC_ACTIONMENU },
      { control: 'CB_TRIGGERS', ini: 'Autopause Options.New Target Selected', type: AutoPauseState.NewTargetSelected, desc: TLK_DESC_TRIGGERS },
    ];
  }

  /** default checkbox states (K1). */
  protected getDefaultEnabled(): ReadonlyArray<boolean> {
    return [false, true, true, true, false, true];
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      for(const entry of this.getAutoPauseOptions()){
        const checkbox = this[entry.control] as GUICheckBox;
        checkbox.attachINIProperty(entry.ini);
        checkbox.onValueChanged = () => {
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(
            entry.type,
            GameState.iniConfig.getProperty(entry.ini) == 1
          );
        };
        checkbox.addEventListener('hover', () => {
          this.setDescription(entry.desc);
        });
      }

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        void GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      resolve();
    });
  }

  show(): void {
    super.show();
    this.setupOptions();
    const options = this.getAutoPauseOptions();
    if(options.length){
      this.setDescription(options[0].desc);
    }
  }

  setupOptions(){
    for(const entry of this.getAutoPauseOptions()){
      const checkbox = this[entry.control] as GUICheckBox;
      const enabled = GameState.iniConfig.getProperty(entry.ini) == 1;
      checkbox.setValue(enabled);
      GameState.AutoPauseManager.SetAutoPauseTypeEnabled(entry.type, enabled);
    }
  }

  resetToDefaults(){
    const defaults = this.getDefaultEnabled();
    const options = this.getAutoPauseOptions();
    for(let i = 0; i < options.length; i++){
      const entry = options[i];
      const checkbox = this[entry.control] as GUICheckBox;
      checkbox.setValue(defaults[i]);
      GameState.AutoPauseManager.SetAutoPauseTypeEnabled(entry.type, defaults[i]);
    }
  }

  setDescription(strRef: number){
    this.LB_DETAILS.setItem(GameState.TLKManager.GetStringById(strRef)?.Value || '');
  }

}
