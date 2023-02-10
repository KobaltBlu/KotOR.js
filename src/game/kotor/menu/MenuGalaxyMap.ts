/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, MenuManager, LBL_3DView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { GlobalVariableManager } from "../../../managers/GlobalVariableManager";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyModel } from "../../../odyssey";
import { Planetary } from "../../../Planetary";
import { OdysseyModel3D } from "../../../three/odyssey";

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
  script: NWScriptInstance;
  _3dView: LBL_3DView;
  _3dViewModel: OdysseyModel3D;
  selectedPlanet: any;

  constructor(){
    super();
    this.gui_resref = 'galaxymap';
    this.background = '1600x1200map';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>( async (resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //Game.MenuActive = false;
        //Game.InGameOverlay.Show();
        //this.Hide();
        this.Close();
        Planetary.SetCurrentPlanet(GlobalVariableManager.GetGlobalNumber('K_CURRENT_PLANET'));
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //Game.MenuActive = false;
        //Game.InGameOverlay.Show();
        //this.Hide();
        this.Close();

        if(this.script instanceof NWScriptInstance){
          this.script.run(GameState.player);
        }

      });

      this.script = NWScript.Load('k_sup_galaxymap');
      NWScript.SetGlobalScript('k_sup_galaxymap', true);

      GameState.ModelLoader.load('galaxy')
      .then((mdl: OdysseyModel) => {
        this.tGuiPanel.widget.userData.fill.visible = false;

        this._3dView = new LBL_3DView();
        this._3dView.visible = true;
        (this._3D_PlanetDisplay.getFill().material as THREE.ShaderMaterial).uniforms.map.value = this._3dView.texture.texture;
        (this._3D_PlanetDisplay.getFill().material as THREE.ShaderMaterial).transparent = false;

        
        OdysseyModel3D.FromMDL(mdl, {
          context: this._3dView
        }).then((model: OdysseyModel3D) => {
          //console.log('Model Loaded', model);
          this._3dViewModel = model;
          
          this._3dView.camera.position.copy(model.camerahook.position);
          this._3dView.camera.quaternion.copy(model.camerahook.quaternion);

          this._3dView.addModel(this._3dViewModel);
          TextureLoader.LoadQueue(() => {

            resolve();

          });

        }).catch(resolve);
      }).catch(resolve);
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    try {
      this._3dView.render(delta);
      (this._3D_PlanetDisplay.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      
    }
  }

  UpdateScale() {
    let controls = MenuManager.MenuGalaxyMap.tGuiPanel.children;
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

  Show() {
    super.Show();
    GameState.MenuActive = true;
    this.selectedPlanet = GlobalVariableManager.GetGlobalNumber('K_CURRENT_PLANET');
    this.UpdateScale();
    let controls = MenuManager.MenuGalaxyMap.tGuiPanel.children;
    for (let i = 0; i < controls.length; i++) {
      let control = controls[i];
      let plnt = Planetary.GetPlanetByGUITag(control.name);
      if (plnt) {
        if (plnt.enabled) {
          control.show();
          control.disableBorder();
          control.addEventListener('click', (e: any) => {
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
