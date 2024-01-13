import type { GUILabel } from "../../../gui";
import { InGameBark as K1_InGameBark } from "../../kotor/KOTOR";
import * as THREE from "three";
import { LIPObject } from "../../../resource/LIPObject";
import { ModuleCreature } from "../../../module";
import { GameState } from "../../../GameState";

/**
 * InGameBark class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameBark.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameBark extends K1_InGameBark {

  declare LBL_BARKTEXT: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'barkbubble_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_BARKTEXT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      resolve();
    });
  }

  bark(entry: any) {
    if (entry) {
      this.show();
      this.LBL_BARKTEXT.setText(entry.text);
      let size = new THREE.Vector3();
      this.LBL_BARKTEXT.text.geometry.boundingBox?.getSize(size);
      this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
      this.tGuiPanel.resizeControl();
      this.tGuiPanel.widget.position.x = -GameState.ResolutionManager.getViewportWidth() / 2 + this.tGuiPanel.extent.width / 2 + 10;
      this.tGuiPanel.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - this.tGuiPanel.extent.height / 2 - 134;
      this.LBL_BARKTEXT.setText(entry.text);
      if (entry.sound != '') {
        console.log('lip', entry.sound);
        LIPObject.Load(entry.sound).then((lip: LIPObject) => {
          if (entry.speaker instanceof ModuleCreature) {
            entry.speaker.setLIP(lip);
          }
        });
        this.manager.InGameDialog.audioEmitter.playStreamWave(entry.sound).then((audioNode) => {
          audioNode.onended = () => {
            this.close();
          };
        }).catch((e) => {
          setTimeout(() => {
            this.close();
          }, 3000);
        });
      } else if (entry.vo_resref != '') {
        console.log('lip', entry.vo_resref);
        LIPObject.Load(entry.vo_resref).then((lip: LIPObject) => {
          if (entry.speaker instanceof ModuleCreature) {
            entry.speaker.setLIP(lip);
          }
        });
        this.manager.InGameDialog.audioEmitter.playStreamWave(entry.vo_resref).then((audioNode) => {
          audioNode.onended = () => {
            this.close();
          };
        }).catch((e) => {
          setTimeout(() => {
            this.close();
          }, 3000);
        });
      } else {
        console.error('VO ERROR', entry);
        setTimeout(() => {
          this.close();
        }, 3000);
      }
    }
  }
  
}
