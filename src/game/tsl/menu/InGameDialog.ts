/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { InGameDialog as K1_InGameDialog } from "../../kotor/KOTOR";
import * as THREE from "three";
import { GFFObject } from "../../../resource/GFFObject";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { NWScript } from "../../../nwscript/NWScript";
import { OdysseyModel3D } from "../../../three/odyssey";
import { ModuleObjectManager } from "../../../managers/ModuleObjectManager";
import { ModuleCreature, ModuleObject } from "../../../module";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { ResourceLoader } from "../../../resource/ResourceLoader";
import { LIPObject } from "../../../resource/LIPObject";
import { FadeOverlayManager } from "../../../managers/FadeOverlayManager";
import { AudioLoader } from "../../../audio/AudioLoader";
import { DLGNode } from "../../../resource/DLGNode";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The InGameDialog menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.LBL_MESSAGE.setText('');

      this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
      this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
      this.LB_REPLIES.calculatePosition();
      this.LB_REPLIES.calculateBox();
      this.LB_REPLIES.padding = 5;

      this.barHeight = 100;

      let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      let material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
      this.topBar = new THREE.Mesh( geometry, material );
      this.bottomBar = new THREE.Mesh( geometry, material );

      this._resetLetterBox();

      this.tGuiPanel.widget.add(this.topBar);
      this.tGuiPanel.widget.add(this.bottomBar);
      resolve();
    });
  }

  GetActorAnimation(index = 0) {
    return 'CUT' + ('000' + (index - 1200 + 1)).slice(-3) + 'W';
  }

  GetDialogAnimation(index = 0) {
    console.log('GetDialogAnimation', index);
    if (index >= 1000 && index < 1400) {
      switch (index) {
      case 1009:
        return {
          name: 'cut' + ('000' + (index - 1400 + 1)).slice(-3),
          looping: '0'
        };
      case 1010:
        return {
          name: 'cut' + ('000' + (index - 1000 + 1)).slice(-3),
          looping: '0'
        };
      case 1011:
        return {
          name: 'cut' + ('000' + (index - 1000 + 1)).slice(-3),
          looping: '0'
        };
      case 1012:
        return {
          name: 'cut' + ('000' + (index - 1000 + 1)).slice(-3),
          looping: '0'
        };
      case 1013:
        return {
          name: 'cut' + ('000' + (index - 1000 + 1)).slice(-3),
          looping: '0'
        };
      }
    } else if (index >= 1400 && index < 1500) {
      switch (index) {
      case 1409:
        return {
          name: 'cut' + ('000' + (index - 1400 + 1)).slice(-3) + 'L',
          looping: '1'
        };
      case 1410:
        return {
          name: 'cut' + ('000' + (index - 1400 + 1)).slice(-3) + 'L',
          looping: '1'
        };
      case 1411:
        return {
          name: 'cut' + ('000' + (index - 1400 + 1)).slice(-3) + 'L',
          looping: '1'
        };
      case 1412:
        return {
          name: 'cut' + ('000' + (index - 1400 + 1)).slice(-3) + 'L',
          looping: '1'
        };
      case 1413:
        return {
          name: 'cut' + ('000' + (index - 1400)).slice(-3) + 'L',
          looping: '1'
        };
      }
    } else if (index >= 10000) {
      const animations2DA = TwoDAManager.datatables.get('animations');
      switch (index) {
      case 30:
        return animations2DA?.rows[18];
        break;
      case 35:
        return animations2DA?.rows[24];
        break;
      case 38:
        return animations2DA?.rows[25];
        break;
      case 39:
        return animations2DA?.rows[27];
        break;
      case 40:
        return animations2DA?.rows[26];
        break;
      case 41:
        return animations2DA?.rows[29];
        break;
      case 42:
        return animations2DA?.rows[28];
        break;
      case 121:
        return animations2DA?.rows[44];
        break;
      case 127:
        return animations2DA?.rows[38];
        break;
      case 403:
        return {
          name: 'touchheart',
          looping: '0'
        };
        break;
      case 404:
        return {
          name: 'rolleyes',
          looping: '0'
        };
        break;
      case 405:
        return {
          name: 'itemequip',
          looping: '0'
        };
        break;
      case 406:
        return {
          name: 'standstill',
          looping: '0'
        };
        break;
      case 407:
        return {
          name: 'nodyes',
          looping: '0'
        };
        break;
      case 408:
        return {
          name: 'nodno',
          looping: '0'
        };
        break;
      case 409:
        return {
          name: 'point',
          looping: '0'
        };
        break;
      case 410:
        return {
          name: 'pointloop',
          looping: '1'
        };
        break;
      case 411:
        return {
          name: 'pointdown',
          looping: '0'
        };
        break;
      case 412:
        return {
          name: 'scanning',
          looping: '0'
        };
        break;
      case 413:
        return {
          name: 'shrug',
          looping: '0'
        };
        break;
      case 424:
        return {
          name: 'sit',
          looping: '0'
        };
        break;
      case 425:
        return {
          name: 'animloop2',
          looping: '1'
        };
        break;
      case 426:
        return {
          name: 'animloop3',
          looping: '1'
        };
        break;
      case 427:
        return {
          name: 'animloop1',
          looping: '1'
        };
        break;
      case 428:
        return {
          name: 'animloop1',
          looping: '1'
        };
        break;
      case 499:
        return {
          name: 'cuthand',
          looping: '0'
        };
        break;
      case 500:
        return {
          name: 'lhandchop',
          looping: '0'
        };
        break;
      case 501:
        return {
          name: 'Collapse',
          looping: '0'
        };
        break;
      case 503:
        return {
          name: 'Collapsestand',
          looping: '0'
        };
        break;
      case 504:
        return {
          name: 'powerpunch',
          looping: '0'
        };
        break;
      case 507:
        return {
          name: 'offhood',
          looping: '0'
        };
        break;
      case 508:
        return {
          name: 'onhood',
          looping: '0'
        };
        break;
      default:
        return undefined;
        break;
      }
    }
  }
  
}
