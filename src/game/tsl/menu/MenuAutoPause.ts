import type { GUILabel, GUICheckBox, GUIListBox, GUIButton } from "@/gui";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { MenuAutoPause as K1_MenuAutoPause } from "@/game/kotor/KOTOR";

/** auto-pause menu description TLKs (ctor custom_value). */
const TLK_DESC_ENDROUND = 0xa5cd;
const TLK_DESC_ENEMYSIGHTED = 0xa5ce;
const TLK_DESC_MINESIGHTED = 0xbe40;
const TLK_DESC_PARTYKILLED = 0xa5cf;
const TLK_DESC_ACTIONMENU = 0xbe41;
const TLK_DESC_TRIGGERS = 0xbe42;

/**
 * MenuAutoPause class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuAutoPause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuAutoPause extends K1_MenuAutoPause {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare CB_ENEMYSIGHTED: GUICheckBox;
  declare CB_PARTYKILLED: GUICheckBox;
  declare CB_ACTIONMENU: GUICheckBox;
  declare LB_DETAILS: GUIListBox;
  declare CB_ENDROUND: GUICheckBox;
  declare CB_TRIGGERS: GUICheckBox;
  declare CB_MINESIGHTED: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optautopause_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  protected getAutoPauseOptions() {
    return [
      { control: 'CB_ENDROUND' as const, ini: 'Autopause Options.End Of Combat Round', type: AutoPauseState.CombatRoundEnd, desc: TLK_DESC_ENDROUND },
      { control: 'CB_ENEMYSIGHTED' as const, ini: 'Autopause Options.Enemy Sighted', type: AutoPauseState.EnemySighted, desc: TLK_DESC_ENEMYSIGHTED },
      { control: 'CB_MINESIGHTED' as const, ini: 'Autopause Options.Mine Sighted', type: AutoPauseState.MineSighted, desc: TLK_DESC_MINESIGHTED },
      { control: 'CB_PARTYKILLED' as const, ini: 'Autopause Options.Party Killed', type: AutoPauseState.PartyMemberKilled, desc: TLK_DESC_PARTYKILLED },
      { control: 'CB_ACTIONMENU' as const, ini: 'Autopause Options.Action Menu', type: AutoPauseState.ActionMenuUsed, desc: TLK_DESC_ACTIONMENU },
      { control: 'CB_TRIGGERS' as const, ini: 'Autopause Options.New Target Selected', type: AutoPauseState.NewTargetSelected, desc: TLK_DESC_TRIGGERS },
    ];
  }

  /** default checkbox states (TSL). */
  protected getDefaultEnabled(): ReadonlyArray<boolean> {
    return [false, true, false, true, false, true];
  }
  
}
