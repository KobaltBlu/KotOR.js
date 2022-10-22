/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, MenuManager } from "../../../gui";
import * as THREE from "three";
import { ResourceLoader } from "../../../resource/ResourceLoader";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { ModuleCreature } from "../../../module";
import { LIPObject } from "../../../resource/LIPObject";

/* @file
* The InGameBark menu class.
*/

export class InGameBark extends GameMenu {

  LBL_BARKTEXT: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'barkbubble';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

bark(entry: any = null) {
  if (entry != null) {
    this.Show();
    this.LBL_BARKTEXT.setText(entry.text);
    let size = new THREE.Vector3();
    this.LBL_BARKTEXT.text.geometry.boundingBox.getSize(size);
    this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
    this.tGuiPanel.resizeControl();
    this.tGuiPanel.widget.position.x = -window.innerWidth / 2 + this.tGuiPanel.extent.width / 2 + 10;
    this.tGuiPanel.widget.position.y = window.innerHeight / 2 - this.tGuiPanel.extent.height / 2 - 134;
    if (entry.sound != '') {
      console.log('lip', entry.sound);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound, (buffer: Buffer) => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      MenuManager.InGameDialog.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
        if (!error) {
          this.Close();
        } else {
          setTimeout(() => {
            this.Close();
          }, 3000);
        }
      });
    } else if (entry.vo_resref != '') {
      console.log('lip', entry.vo_resref);
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref, (buffer: Buffer) => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      MenuManager.InGameDialog.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
        if (!error) {
          this.Close();
        } else {
          setTimeout(() => {
            this.Close();
          }, 3000);
        }
      });
    } else {
      console.error('VO ERROR', entry);
      setTimeout(() => {
        this.Close();
      }, 3000);
    }
  }
}
  
}
