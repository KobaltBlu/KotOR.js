import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { GameMenu } from "@/gui";
import type { GUILabel, GUIButton } from "@/gui";

/** SetPauseReason TLK ids (K1). */
const TLK_PAUSE_GENERIC = 0x5e4;
const TLK_PAUSE_ENEMY = 0xbc54;
const TLK_PAUSE_END_ROUND = 0xa5c0;
const TLK_PAUSE_ACTION_MENU = 0xa5f2;
const TLK_PAUSE_NEW_TARGET = 0xa5f1;
const TLK_PAUSE_PARTY_KILLED = 0xa59d;
const TLK_PAUSE_REASON10 = 0xbd27;
const TLK_PAUSE_MINE = 0xbfde;

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

  protected shouldShowPressLabel(reason: AutoPauseState | number): boolean {
    switch(reason as number){
      case AutoPauseState.EnemySighted:
      case AutoPauseState.MineSighted:
        return false;
      default:
        return true;
    }
  }

  /** K1 keeps the GUI default press caption; TSL rewrites it. */
  protected applyPressLabelText(){
    // no-op on K1
  }

  /**
   * SetPauseReason — map reason byte → LBL_PAUSEREASON
   * TLK and show/hide LBL_PRESS (enemy/mine hide press).
   */
  setPauseReason(reason: AutoPauseState | number){
    const strRef = this.getPauseStrRef(reason);
    const showPress = this.shouldShowPressLabel(reason);

    const reasonText = GameState.TLKManager.GetStringById(strRef)?.Value ?? '';
    this.LBL_PAUSEREASON?.setText(reasonText);

    if(showPress){
      this.applyPressLabelText();
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
    this.recalculatePosition();
  }

  hide() {
    super.hide();
  }

  resize() {
    this.recalculatePosition();
  }

  /**
   * Top-right of the viewport. Root panel position is extent.left / -extent.top
   * when parent size equals panel size (GameMenu centers the widget at 0,0).
   */
  recalculatePosition() {
    if(!this.tGuiPanel){ return; }
    this.tGuiPanel.extent.left =
      (GameState.ResolutionManager.getViewportWidth() / 2) - (this.tGuiPanel.extent.width / 2);
    this.tGuiPanel.extent.top =
      (-GameState.ResolutionManager.getViewportHeight() / 2) + (this.tGuiPanel.extent.height / 2) + 36;
    this.tGuiPanel.recalculate();
  }

}
