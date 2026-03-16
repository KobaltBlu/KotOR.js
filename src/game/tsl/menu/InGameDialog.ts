import * as THREE from "three";

import { InGameDialog as K1_InGameDialog } from "@/game/kotor/KOTOR";
import { GameState } from "@/GameState";
import type { GUIControl, GUILabel, GUIListBox } from "@/gui";
import { ITwoDAAnimation } from "@/interface";
import { DLGNode } from "@/resource/DLGNode";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/**
 * InGameDialog class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameDialog extends K1_InGameDialog {

  declare LBL_MESSAGE: GUILabel;
  declare LB_REPLIES: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'dialog_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_MESSAGE.setText('');
      this.LBL_MESSAGE.setTextColor(this.LBL_MESSAGE.defaultColor.r, this.LBL_MESSAGE.defaultColor.g, this.LBL_MESSAGE.defaultColor.b);

      this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth()/2) + this.LB_REPLIES.extent.width/2 + 16;
      this.LB_REPLIES.extent.top = (GameState.ResolutionManager.getViewportHeight()/2) - this.LB_REPLIES.extent.height/2;
      this.LB_REPLIES.calculatePosition();
      this.LB_REPLIES.calculateBox();
      this.LB_REPLIES.padding = 5;
      this.LB_REPLIES.onSelected = (entry: any, control: any, index: number) => {
        GameState.CutsceneManager.selectReplyAtIndex(index);
      }

      let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      let material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
      this.topBar = new THREE.Mesh( geometry, material );
      this.bottomBar = new THREE.Mesh( geometry, material );

      this.resetLetterBox();

      this.tGuiPanel.widget.add(this.topBar);
      this.tGuiPanel.widget.add(this.bottomBar);
      resolve();
    });
  }
  
}
