import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GameMenu } from "@/gui";
import type { GUILabel, GUIButton } from "@/gui";

/** Retail CSWGuiInGamePause::SetPauseReason TLK ids (K1). */
const TLK_PAUSE_GENERIC = 0x5e4;       // 1508
const TLK_PAUSE_ENEMY_K1 = 0xbc54;     // 48212
const TLK_PAUSE_END_ROUND = 0xa5c0;    // 42432
const TLK_PAUSE_ACTION_MENU = 0xa5f2;  // 42482
const TLK_PAUSE_NEW_TARGET = 0xa5f1;   // 42481
const TLK_PAUSE_PARTY_KILLED = 0xa59d; // 42397
const TLK_PAUSE_REASON10_K1 = 0xbd27;  // 48423
const TLK_PAUSE_MINE_K1 = 0xbfde;      // 49118

/** K2 remaps for enemy / mine / reason 10. */
const TLK_PAUSE_ENEMY_K2 = 0xbe5c;     // 48732
const TLK_PAUSE_REASON10_K2 = 0xbe5e;  // 48734
const TLK_PAUSE_MINE_K2 = 0xbe5f;      // 48735
/** K2 rewrites LBL_PRESS when shown. */
const TLK_PRESS_CONTINUE_K2 = 0x21477; // 136311

/**
 * InGamePause class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGamePause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGamePause extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_PAUSEREASON: GUILabel;
  LBL_PRESS: GUILabel;
  BTN_UNPAUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pause';
    this.background = '';
    this.voidFill = false;
    // Overlay only — do not SetEngineMode(INGAME). Minigame Escape pause must
    // keep Mode==MINIGAME so FollowerCamera stays on camerahook.
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_UNPAUSE.addEventListener('click', (e) => {
        GameState.AutoPauseManager.Unpause();
      });
      resolve();
    });
  }

  /**
   * Retail CSWGuiInGamePause::SetPauseReason — map reason byte → LBL_PAUSEREASON
   * TLK and show/hide LBL_PRESS (enemy/mine hide press).
   */
  setPauseReason(reason: AutoPauseState | number){
    const isTSL = GameState.GameKey == GameEngineType.TSL;
    let strRef = TLK_PAUSE_GENERIC;
    let showPress = true;

    switch(reason as number){
      case AutoPauseState.EnemySighted:
        strRef = isTSL ? TLK_PAUSE_ENEMY_K2 : TLK_PAUSE_ENEMY_K1;
        showPress = false;
        break;
      case AutoPauseState.CombatRoundEnd:
        strRef = TLK_PAUSE_END_ROUND;
        break;
      case AutoPauseState.ActionMenuUsed:
        strRef = TLK_PAUSE_ACTION_MENU;
        break;
      case AutoPauseState.NewTargetSelected:
        strRef = TLK_PAUSE_NEW_TARGET;
        break;
      case AutoPauseState.PartyMemberKilled:
        strRef = TLK_PAUSE_PARTY_KILLED;
        break;
      case AutoPauseState.UnusedReason10:
        strRef = isTSL ? TLK_PAUSE_REASON10_K2 : TLK_PAUSE_REASON10_K1;
        break;
      case AutoPauseState.MineSighted:
        strRef = isTSL ? TLK_PAUSE_MINE_K2 : TLK_PAUSE_MINE_K1;
        showPress = false;
        break;
      default:
        // Generic (0), Manual (4), and any unknown → TLK 1508
        strRef = TLK_PAUSE_GENERIC;
        break;
    }

    const reasonText = GameState.TLKManager.GetStringById(strRef)?.Value ?? '';
    this.LBL_PAUSEREASON?.setText(reasonText);

    if(showPress){
      if(isTSL){
        const pressText = GameState.TLKManager.GetStringById(TLK_PRESS_CONTINUE_K2)?.Value;
        if(pressText) this.LBL_PRESS?.setText(pressText);
      }
      this.LBL_PRESS?.show();
    }else{
      this.LBL_PRESS?.hide();
    }
  }

  show() {
    super.show();
    this.setPauseReason(GameState.AutoPauseManager.CurrentReason);
    this.tGuiPanel.pulsing = true;
    this.LBL_PAUSEREASON.pulsing = true;
    this.LBL_PRESS.pulsing = true;
  }

  update(delta: number = 0) {
    super.update(delta);
    this.tGuiPanel.extent.left = (GameState.ResolutionManager.getViewportWidth() / 2) - (this.tGuiPanel.extent.width / 2) - 0;
    this.tGuiPanel.extent.top = (-GameState.ResolutionManager.getViewportHeight() / 2) + (this.tGuiPanel.extent.height / 2) + 36;
    this.recalculatePosition();
  }
  
}
