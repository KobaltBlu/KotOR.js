/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, LBL_3DView } from "../../../gui";
import { MenuGalaxyMap as K1_MenuGalaxyMap } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { Planetary } from "../../../Planetary";
import { GlobalVariableManager } from "../../../managers";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { NWScript } from "../../../nwscript/NWScript";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { TextureLoader } from "../../../loaders";

/* @file
* The MenuGalaxyMap menu class.
*/

export class MenuGalaxyMap extends K1_MenuGalaxyMap {

  declare LBL_BAR2: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare _3D_PlanetDisplay: GUILabel;
  declare LBL_Planet_MalachorV: GUIButton;
  declare LBL_Planet_Dantooine: GUIButton;
  declare LBL_Planet_NarShaddaa: GUIButton;
  declare LBL_Planet_PeragusII: GUIButton;
  declare LBL_Planet_Dxun: GUIButton;
  declare LBL_Planet_Korriban: GUIButton;
  declare LBL_Planet_Telos: GUIButton;
  declare LBL_Planet_Onderon: GUIButton;
  declare LBL_Planet_M478: GUIButton;
  declare LBL_Tutorial: GUIButton;
  declare _3D_PlanetModel: GUILabel;
  declare LBL_PLANETNAME: GUILabel;
  declare LBL_DESC: GUILabel;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_BACK: GUIButton;
  declare LBL_Planet_Citadel: GUIButton;
  declare LBL_EbonHawk: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'galaxymap_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
        Planetary.SetSelectedPlanet(GlobalVariableManager.GetGlobalNumber('K_CURRENT_PLANET'));
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();

        if(this.script instanceof NWScriptInstance){
          this.script.run(GameState.player);
        }

      });

      this._3dViewPlanet = new LBL_3DView();
      this._3dViewPlanet.visible = true;
      this._3dViewPlanet.setControl(this._3D_PlanetModel);

      this.script = NWScript.Load('k_sup_galaxymap');
      NWScript.SetGlobalScript('k_sup_galaxymap', true);

      GameState.ModelLoader.load('galaxy')
      .then((mdl: OdysseyModel) => {

        this._3dView = new LBL_3DView();
        this._3dView.visible = true;
        this._3dView.setControl(this._3D_PlanetDisplay);
        
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
  
}
