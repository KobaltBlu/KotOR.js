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
   * SetPauseReason — TLK → LBL_PAUSEREASON, show/hide LBL_PRESS,
   * then resize reason / press / panel / unpause like retail.
   */
  setPauseReason(reason: AutoPauseState | number){
    const strRef = this.getPauseStrRef(reason);
    const showPress = this.shouldShowPressLabel(reason);
    const reasonLbl = this.LBL_PAUSEREASON;
    const pressLbl = this.LBL_PRESS;
    const panel = this.tGuiPanel;
    if(!reasonLbl || !panel){
      return;
    }

    const reasonText = GameState.TLKManager.GetStringById(strRef)?.Value ?? '';
    reasonLbl.setText(reasonText);

    const reasonHeight = reasonLbl.getIdealHeight?.() || reasonLbl.extent.height;
    reasonLbl.setExtentHeight(reasonHeight);

    let contentTop = reasonLbl.extent.top;
    let contentHeight = reasonHeight;

    if(showPress && pressLbl){
      this.applyPressLabelText();
      pressLbl.show();
      const pressHeight = pressLbl.getIdealHeight?.() || pressLbl.extent.height;
      const pressTop = reasonLbl.extent.top + 2 + reasonHeight;
      pressLbl.setExtentTop(pressTop);
      pressLbl.setExtentHeight(pressHeight);
      contentTop = pressTop;
      contentHeight = pressHeight;
    }else if(pressLbl){
      pressLbl.hide();
    }

    const panelHeight = contentTop + 5 + contentHeight;
    panel.setExtentHeight?.(panelHeight);
    if(panel.extent){
      panel.extent.height = panelHeight;
    }

    if(this.BTN_UNPAUSE){
      this.BTN_UNPAUSE.setExtentLeft?.(reasonLbl.extent.left);
      this.BTN_UNPAUSE.setExtentTop?.(reasonLbl.extent.top);
      this.BTN_UNPAUSE.setExtentWidth?.(reasonLbl.extent.width);
      this.BTN_UNPAUSE.setExtentHeight?.(panelHeight);
    }

    panel.recalculate?.();
    this.recalculatePosition();
  }

  show() {
    super.show();
    // Reason text is applied by AutoPauseManager.syncPauseOverlay before show (CGuiInGame::SetPaused).
    this.tGuiPanel.pulsing = true;
    this.LBL_PAUSEREASON.pulsing = true;
    if(this.shouldShowPressLabel(GameState.AutoPauseManager.CurrentReason)){
      this.LBL_PRESS.pulsing = true;
    }
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
