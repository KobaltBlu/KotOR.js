import { EngineMode } from "@/enums/engine/EngineMode";
import { GameMenu } from "@/gui";
import type { GUILabel } from "@/gui";
import { GameState } from "@/GameState";

/**
 * InGameComputerCam class.
 *
 * — placeable-cam overlay during
 * computer ConversationType==1 + CameraAngle==6. LBL_RETURN skips the current
 * entry; SetLiveFeedMessageVisible toggles the live-feed label.
 *
 * @file InGameComputerCam.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameComputerCam extends GameMenu {

  engineMode: EngineMode = EngineMode.DIALOG;
  LBL_RETURN: GUILabel;
  /** Optional live-feed caption from layout (name varies; resolved at init). */
  LBL_LIVEFEED: GUILabel | undefined;

  constructor(){
    super();
    this.gui_resref = 'computercamera';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.bindReturnClick();
      this.resolveLiveFeedLabel();
      resolve();
    });
  }

  protected bindReturnClick() {
    if(!this.LBL_RETURN){ return; }
    this.LBL_RETURN.addEventListener('click', () => {
      const entry = GameState.CutsceneManager?.currentEntry;
      if(entry){
        GameState.CutsceneManager.playerSkipEntry(entry);
      }
    });
  }

  protected resolveLiveFeedLabel() {
    // Prefer an explicit live-feed control if the layout names one.
    const named =
      this.getControlByName?.('LBL_MESSAGE') ||
      this.getControlByName?.('LBL_LIVEFEED') ||
      this.getControlByName?.('LBL_LIVE_FEED');
    if(named && named !== this.LBL_RETURN){
      this.LBL_LIVEFEED = named as GUILabel;
      return;
    }
    // Fallback: first non-Return label child on the panel.
    const children = this.tGuiPanel?.children || [];
    for(let i = 0; i < children.length; i++){
      const child = children[i] as GUILabel;
      if(child && child !== this.LBL_RETURN && (child as any).setText){
        this.LBL_LIVEFEED = child;
        return;
      }
    }
  }

  /**
   * SetLiveFeedMessageVisible
   * hidden when CamVidEffect is -2 or 10.
   */
  setLiveFeedVisible(visible: boolean) {
    if(!this.LBL_LIVEFEED){ return; }
    if(visible){
      this.LBL_LIVEFEED.show?.();
    }else{
      this.LBL_LIVEFEED.hide?.();
    }
  }

}
