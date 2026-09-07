import { GameState } from "@/GameState";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import type { GUILabel, GUIButton } from "@/gui";
import { InGamePause as K1_InGamePause } from "@/game/kotor/KOTOR";

/** SetPauseReason TLK ids (TSL). */
const TLK_PAUSE_GENERIC = 0x5e4;
const TLK_PAUSE_ENEMY = 0xbe5c;
const TLK_PAUSE_END_ROUND = 0xa5c0;
const TLK_PAUSE_ACTION_MENU = 0xa5f2;
const TLK_PAUSE_NEW_TARGET = 0xa5f1;
const TLK_PAUSE_PARTY_KILLED = 0xa59d;
const TLK_PAUSE_REASON10 = 0xbe5e;
const TLK_PAUSE_MINE = 0xbe5f;
/** TSL rewrites LBL_PRESS when shown. */
const TLK_PRESS_CONTINUE = 0x21477;

/**
 * InGamePause class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file InGamePause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGamePause extends K1_InGamePause {

  declare LBL_PAUSEREASON: GUILabel;
  declare LBL_PRESS: GUILabel;
  declare BTN_UNPAUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pause_p';
    this.background = '';
    this.voidFill = false;
    // Overlay only — do not SetEngineMode(INGAME). Minigame Escape pause must
    // keep Mode==MINIGAME so FollowerCamera stays on camerahook.
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
      this.BTN_UNPAUSE.addEventListener('click', (e) => {
        GameState.AutoPauseManager.Unpause();
      });
    });
  }

  protected getPauseStrRef(reason: AutoPauseState | number): number {
    switch(reason as number){
      case AutoPauseState.EnemySighted: return TLK_PAUSE_ENEMY;
      case AutoPauseState.CombatRoundEnd: return TLK_PAUSE_END_ROUND;
      case AutoPauseState.ActionMenuUsed: return TLK_PAUSE_ACTION_MENU;
      case AutoPauseState.NewTargetSelected: return TLK_PAUSE_NEW_TARGET;
      case AutoPauseState.PartyMemberKilled: return TLK_PAUSE_PARTY_KILLED;
      case AutoPauseState.UnusedReason10: return TLK_PAUSE_REASON10;
      case AutoPauseState.MineSighted: return TLK_PAUSE_MINE;
      default: return TLK_PAUSE_GENERIC;
    }
  }

  protected applyPressLabelText(){
    const pressText = GameState.TLKManager.GetStringById(TLK_PRESS_CONTINUE)?.Value;
    if(pressText) this.LBL_PRESS?.setText(pressText);
  }

  update(delta: number = 0) {
    super.update(delta);
    this.tGuiPanel.extent.left = (GameState.ResolutionManager.getViewportWidth() / 2) - (this.tGuiPanel.extent.width / 2) - 5;
    this.tGuiPanel.extent.top = (-GameState.ResolutionManager.getViewportHeight() / 2) + (this.tGuiPanel.extent.height / 2) + 45;
    this.recalculatePosition();
  }
  
}
