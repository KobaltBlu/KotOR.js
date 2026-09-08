import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import {
  GameMenu,
  GUI_DESIGN_HEIGHT,
  GUI_DESIGN_WIDTH,
  asExtentInt,
  truncDiv,
} from "@/gui";
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

  /** pause.gui / pause_p EXTENT LEFT/TOP (CSWGuiInGamePause saves these after load). */
  protected designLeft = 0;
  protected designTop = 0;

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
    // Retail keeps design LEFT/TOP; root widget is otherwise centered at (0,0).
    // Capture before skipInit so TSL (pause_p) still gets its layout origin.
    if(this.tGuiPanel){
      this.designLeft = asExtentInt(this.tGuiPanel.extent.left);
      this.designTop = asExtentInt(this.tGuiPanel.extent.top);
      this.tGuiPanel.extent.left = 0;
      this.tGuiPanel.extent.top = 0;
    }
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_UNPAUSE.addEventListener('click', (e) => {
        GameState.AutoPauseManager.Unpause();
      });
      this.recalculatePosition();
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
   * Place the banner from pause.gui design LEFT/TOP inside the centered 640×480
   * letterbox (retail: left=195, top=96 → upper play space, not viewport center).
   * Uses root offset so getPanelLocalMouse tracks the translate.
   */
  recalculatePosition() {
    if(!this.tGuiPanel){ return; }
    const w = asExtentInt(this.tGuiPanel.extent.width);
    const h = asExtentInt(this.tGuiPanel.extent.height);
    this.tGuiPanel.extent.left = 0;
    this.tGuiPanel.extent.top = 0;
    this.tGuiPanel.offset.x = asExtentInt(
      -truncDiv(GUI_DESIGN_WIDTH, 2) + this.designLeft + truncDiv(w, 2)
    );
    this.tGuiPanel.offset.y = asExtentInt(
      truncDiv(GUI_DESIGN_HEIGHT, 2) - this.designTop - truncDiv(h, 2)
    );
    this.tGuiPanel.recalculate();
  }

}
