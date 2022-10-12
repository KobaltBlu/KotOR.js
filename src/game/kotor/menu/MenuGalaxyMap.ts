/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuGalaxyMap menu class.
*/

export class MenuGalaxyMap extends GameMenu {

  _3D_PlanetDisplay: GUILabel;
  LBL_Planet_Taris: GUIButton;
  LBL_Planet_Dantooine: GUIButton;
  LBL_Planet_Tatooine: GUIButton;
  LBL_Planet_Kashyyyk: GUIButton;
  LBL_Planet_Manaan: GUIButton;
  LBL_Planet_Korriban: GUIButton;
  LBL_Planet_UnknownWorld: GUIButton;
  LBL_Planet_EndarSpire: GUIButton;
  LBL_Planet_Leviathan: GUIButton;
  LBL_Planet_StarForge: GUIButton;
  _3D_PlanetModel: GUILabel;
  LBL_PLANETNAME: GUILabel;
  LBL_DESC: GUILabel;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;
  LBL_Live01: GUIButton;
  LBL_Live02: GUIButton;
  LBL_Live03: GUIButton;
  LBL_Live04: GUIButton;
  LBL_Live05: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'galaxymap';
    this.background = '1600x1200map';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Update(delta = 0) {
  super.Update(delta);
  try {
    this._3dView.render(delta);
    this.THREED_PlanetDisplay.fill.children[0].material.needsUpdate = true;
  } catch (e: any) {
  }
}

UpdateScale() {
  let controls = GameState.MenuGalaxyMap.tGuiPanel.children;
  for (let i = 0; i < controls.length; i++) {
    let control = controls[i];
    let plnt = Planetary.GetPlanetByGUITag(control.name);
    if (plnt) {
      if (plnt == Planetary.current) {
        control.widget.scale.setScalar(1.25);
      } else {
        control.widget.scale.setScalar(1);
      }
    }
  }
}

Show(object = null) {
  super.Show();
  GameState.MenuActive = true;
  this.selectedPlanet = GameState.getGlobalNumber('K_CURRENT_PLANET');
  this.UpdateScale();
  let controls = GameState.MenuGalaxyMap.tGuiPanel.children;
  for (let i = 0; i < controls.length; i++) {
    let control = controls[i];
    let plnt = Planetary.GetPlanetByGUITag(control.name);
    if (plnt) {
      if (plnt.enabled) {
        control.show();
        control.disableBorder();
        control.addEventListener('click', e => {
          e.stopPropagation();
          this.LBL_PLANETNAME.setText(plnt.getName());
          this.LBL_DESC.setText(plnt.getDescription());
          Planetary.SetCurrentPlanet(plnt.getId());
          this.UpdateScale();
        });
      } else {
        control.hide();
        control.disableBorder();
        control.removeEventListener('click');
      }
    }
  }
}
  
}
