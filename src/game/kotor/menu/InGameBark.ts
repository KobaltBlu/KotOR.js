/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel } from "../../../gui";

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

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

bark(entry = null) {
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
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound, buffer => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      GameState.InGameDialog.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
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
      ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref, buffer => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(new LIPObject(buffer));
        }
      });
      GameState.InGameDialog.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
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
