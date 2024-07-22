import { GameState } from "../../../GameState";
import { LBL_3DView } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { MenuGalaxyMap as K1_MenuGalaxyMap } from "../../kotor/KOTOR";
import { Planetary } from "../../../Planetary";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { NWScript } from "../../../nwscript/NWScript";
import { OdysseyModel } from "../../../odyssey";
import { OdysseyModel3D } from "../../../three/odyssey";
import { MDLLoader, TextureLoader } from "../../../loaders";

const STR_ALREADY_AT_THAT_LOCATION = 125629;

/**
 * MenuGalaxyMap class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGalaxyMap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        // Planetary.SetSelectedPlanet(GameState.GlobalVariableManager.GetGlobalNumber('K_CURRENT_PLANET'));
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!this.activePlanet?.selectable){
          if(this.activePlanet.lockedOutReason >= 0){
            GameState.MenuManager.InGameConfirm.fromStringRef(this.activePlanet.lockedOutReason);
          }
        }else if(this.activePlanet.id == Planetary.selectedIndex){
          GameState.MenuManager.InGameConfirm.fromStringRef(STR_ALREADY_AT_THAT_LOCATION);
        }else{
          if(this.script instanceof NWScriptInstance){
            this.script.run(GameState.PartyManager.party[0]);
          }
          this.close();
        }
      });

      this._3dViewPlanet = new LBL_3DView();
      this._3dViewPlanet.visible = true;
      this._3dViewPlanet.setControl(this._3D_PlanetModel);
      this._3D_PlanetModel.setText('');

      this.script = NWScript.Load('k_sup_galaxymap');
      NWScript.SetGlobalScript('k_sup_galaxymap', true);

      MDLLoader.loader.load('galaxy')
      .then((mdl: OdysseyModel) => {

        this._3dView = new LBL_3DView();
        this._3dView.visible = true;
        this._3dView.setControl(this._3D_PlanetDisplay);
        this._3D_PlanetDisplay.setText('');
        
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
