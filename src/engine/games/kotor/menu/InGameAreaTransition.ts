import { EngineMode } from "@engine/enums/engine/EngineMode";
import { GameMenu, GUIPanelCoordFlags } from "@engine/gui";
import type { GUILabel } from "@engine/gui";
import type { ModuleObject } from "@engine/module/ModuleObject";
import { GameState } from "@engine/runtime/GameState";

import { isDoor } from "@engine/module/guards/isDoor";
import { isTrigger } from "@engine/module/guards/isTrigger";

/**
 * InGameAreaTransition class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * UpdateAreaTransitionGUI /
 * HideAreaTransition (K1, K2).
 *
 * @file InGameAreaTransition.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameAreaTransition extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  /** Overlay so show does not force EngineMode via GameMenu.show. */
  isOverlayGUI = true;
  /**
   * ctor: bit_flags = flags & ~DockDesignY | DockDesignX
   * (K1).
   */
  panelCoordFlags: number = GUIPanelCoordFlags.UseExtentOffset | GUIPanelCoordFlags.DockDesignX;

  LBL_ICON: GUILabel;
  LBL_TEXTBG: GUILabel;
  LBL_DESCRIPTION: GUILabel;

  /** Object currently driving the destination label. */
  transitionObject: ModuleObject;

  constructor(){
    super();
    this.gui_resref = 'areatransition';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  SetDescription(text = '') {
    this.LBL_DESCRIPTION.setText(text);
  }

  /**
   * SetTransitionObject.
   * Pass undefined / falsy to clear (OBJECT_INVALID / 0x7F000000).
   */
  setTransitionObject(object: ModuleObject | undefined){
    if(!object){
      this.transitionObject = undefined;
      return;
    }

    if(isDoor(object) || isTrigger(object)){
      if(this.transitionObject !== object){
        this.transitionObject = object;
        this.SetDescription(object.getTransitionDestin());
      }
    }
  }

  unsetTransitionObject(object: ModuleObject){
    if(this.transitionObject == object){
      this.transitionObject = undefined;
    }
  }

  /**
   * UpdateAreaTransitionGUI.
   * Show when a candidate object is set and TransPending is clear; otherwise hide
   * (keeping the panel during TransPending).
   */
  updateAreaTransitionGUI(){
    const area = GameState.module?.area;
    // : require module/area/server area and sw_gui_status == 1 (in-game).
    if(!area || GameState.Mode !== EngineMode.INGAME){
      this.hideAreaTransition();
      return;
    }

    if(!this.transitionObject){
      this.hideAreaTransition();
      return;
    }

    if(area.transPending){
      // : PanelExists → SendPanelToBack; do not RemovePanel.
      return;
    }

    if(!this.isVisible()){
      this.show();
    }
  }

  /**
   * HideAreaTransition.
   * While TransPending, leave the panel up (SendPanelToBack). Otherwise clear the
   * transition object and RemovePanel.
   */
  hideAreaTransition(){
    const area = GameState.module?.area;
    if(area?.transPending){
      return;
    }
    this.transitionObject = undefined;
    if(this.isVisible()){
      this.hide();
    }
  }
  
}
