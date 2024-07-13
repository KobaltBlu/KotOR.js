import { GameState } from "../../../GameState";
import type { GUILabel, GUIListBox } from "../../../gui";
import { ITwoDAAnimation } from "../../../interface";
import { InGameDialog as K1_InGameDialog } from "../../kotor/KOTOR";
import * as THREE from "three";

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

      this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth()/2) + this.LB_REPLIES.extent.width/2 + 16;
      this.LB_REPLIES.extent.top = (GameState.ResolutionManager.getViewportHeight()/2) - this.LB_REPLIES.extent.height/2;
      this.LB_REPLIES.calculatePosition();
      this.LB_REPLIES.calculateBox();
      this.LB_REPLIES.padding = 5;

      this.barHeight = 100;

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

  getDialogAnimation(index = 0): any {
    console.log('GetDialogAnimation', index);
    if (index >= 1000 && index < 1400) {
      const id = (index - 999);
      return {
        name: 'cut' + ('000' + id).slice(-3),
        looping: '1'
      };
    } else if (index >= 1400 && index < 1500) {
      const id = (index - 1399);
      return {
        name: 'cut' + ('000' + id).slice(-3) + 'L',
        looping: '1'
      };
    } else if (index >= 10000) {
      const animations2DA = GameState.TwoDAManager.datatables.get('animations');
      if(!animations2DA){ return; }

      switch (index - 10000) {
        case 30:
          return animations2DA.rows[18];
        case 35:
          return animations2DA.rows[24];
        case 38:
          return animations2DA.rows[25];
        case 39:
          return animations2DA.rows[27];
        case 40:
          return animations2DA.rows[26];
        case 41:
          return animations2DA.rows[29];
        case 42:
          return animations2DA.rows[28];
        case 121:
          return animations2DA.rows[44];
        case 127:
          return animations2DA.rows[38];
        case 403:
          return animations2DA.rows[462];
        case 404:
          return animations2DA.rows[463];
        case 405:
          return animations2DA.rows[464];
        case 406:
          return animations2DA.rows[465];
        case 407:
          return animations2DA.rows[466];
        case 408:
          return animations2DA.rows[467];
        case 409:
          return animations2DA.rows[468];
        case 410:
          return animations2DA.rows[469];
        case 411:
          return animations2DA.rows[470];
        case 412:
          return animations2DA.rows[471];
        case 413:
          return animations2DA.rows[472];
        case 424:
          return animations2DA.rows[316];
        case 425:
          return animations2DA.rows[317];
        case 426:
          return animations2DA.rows[318];
        case 427:
          return animations2DA.rows[319];
        case 428:
          return animations2DA.rows[320];
        case 499:
          return animations2DA.rows[557];
        case 500:
          return animations2DA.rows[558];
        case 501:
          return animations2DA.rows[559];
        case 502:
          return animations2DA.rows[560];
        case 503:
          return animations2DA.rows[561];
        case 504:
          return animations2DA.rows[562];
        case 507:
          return animations2DA.rows[565];
        case 508:
          return animations2DA.rows[566];
      }
    }

    return undefined;
  }
  
}
