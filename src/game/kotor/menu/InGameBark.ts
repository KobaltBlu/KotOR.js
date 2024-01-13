import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";
import * as THREE from "three";
import { ResourceLoader } from "../../../loaders";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { LIPObject } from "../../../resource/LIPObject";
import { GameState } from "../../../GameState";
import { ModuleObjectType } from "../../../enums";
import { BitWise } from "../../../utility/BitWise";

/**
 * InGameBark class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameBark.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameBark extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_BARKTEXT: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'barkbubble';
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

  bark(entry: any = null) {
    if (entry != null) {
      this.show();
      this.LBL_BARKTEXT.setText(entry.text);
      let size = new THREE.Vector3();
      this.LBL_BARKTEXT.text.geometry.boundingBox.getSize(size);
      this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
      this.tGuiPanel.resizeControl();
      this.tGuiPanel.widget.position.x = -GameState.ResolutionManager.getViewportWidth() / 2 + this.tGuiPanel.extent.width / 2 + 10;
      this.tGuiPanel.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - this.tGuiPanel.extent.height / 2 - 134;
      if (entry.sound != '') {
        console.log('lip', entry.sound);
        ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound).then((buffer: Buffer) => {
          if (BitWise.InstanceOfObject(entry.speaker, ModuleObjectType.ModuleCreature)) {
            entry.speaker.setLIP(new LIPObject(buffer));
          }
        }).catch( (e) => {console.error(e)});
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
        ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref).then((buffer: Buffer) => {
          if (BitWise.InstanceOfObject(entry.speaker, ModuleObjectType.ModuleCreature)) {
            entry.speaker.setLIP(new LIPObject(buffer));
          }
        }).catch( (e) => {console.error(e)});
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
