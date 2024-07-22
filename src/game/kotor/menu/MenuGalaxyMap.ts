import { GameState } from "../../../GameState";
import { GameMenu, LBL_3DView } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { MDLLoader, TextureLoader } from "../../../loaders";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyModel } from "../../../odyssey";
import { Planet, Planetary } from "../../../Planetary";
import { OdysseyModel3D } from "../../../three/odyssey";

const STR_ALREADY_AT_THAT_LOCATION = 125629;

interface PlanetAnimStateInfo {
  lastAnimState: 'zoomin'|'rotate';
  currentAnimState: 'zoomin'|'rotate';
  started: boolean;
};

/**
 * MenuGalaxyMap class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGalaxyMap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  _3dViewPlanet: LBL_3DView;
  _3dViewPlanetModel: OdysseyModel3D;

  activePlanet: Planet;

  planetModelAnimationState: PlanetAnimStateInfo = {
    lastAnimState: undefined,
    currentAnimState: undefined,
    started: false
  }

  constructor(){
    super();
    this.gui_resref = 'galaxymap';
    this.background = '1600x1200map';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>( async (resolve, reject) => {
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

      this.script = NWScript.Load('k_sup_galaxymap');
      NWScript.SetGlobalScript('k_sup_galaxymap', true);

      MDLLoader.loader.load('galaxy')
      .then((mdl: OdysseyModel) => {
        this.tGuiPanel.widget.userData.fill.visible = false;

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

  update(delta = 0) {
    super.update(delta);
    this.UpdateScale();
    this.updatePlanetView(delta);
  }

  updateGalaxyMapView(delta: number = 0){
    try {
      this._3dView.render(delta);
      (this._3D_PlanetDisplay.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  updatePlanetView(delta: number = 0){
    try {
      const planetControl = this._3D_PlanetModel;
      const planetModel = this._3dViewPlanetModel;
      const _3dView = this._3dViewPlanet;
      if(planetModel){
        const currentAnimation = planetModel.getAnimationName();
        if(!currentAnimation){
          if(!this.planetModelAnimationState.started){
            this.planetModelAnimationState.started = true;
            planetModel.playAnimation(this.planetModelAnimationState.currentAnimState, false);
          }else{
            if(this.planetModelAnimationState.currentAnimState == 'rotate'){
              this.planetModelAnimationState.lastAnimState = 'zoomin';
              this.planetModelAnimationState.currentAnimState = 'rotate';
              this.planetModelAnimationState.started = false;
            }else{
              this.planetModelAnimationState.lastAnimState = 'rotate';
              this.planetModelAnimationState.currentAnimState = 'rotate';
              this.planetModelAnimationState.started = false;
            }
          }
        }

        planetModel.update(delta);
        _3dView.camera.position.copy(planetModel.camerahook.position);
        _3dView.camera.quaternion.copy(planetModel.camerahook.quaternion);
      }

      _3dView.render(delta);
      (planetControl.getFill().material as THREE.ShaderMaterial).needsUpdate = true;
    } catch (e: any) {
      console.error(e);
    }
  }

  UpdateScale() {
    let controls = this.manager.MenuGalaxyMap.tGuiPanel.children;
    for (let i = 0; i < controls.length; i++) {
      let control = controls[i];
      let plnt = Planetary.GetPlanetByGUITag(control.name);
      if (plnt) {
        if (plnt.enabled) {
          control.show();
          if (plnt == Planetary.selected) {
            control.widget.scale.setScalar(1.25);
          } else {
            control.widget.scale.setScalar(1);
          }
        }else{
          control.hide();
        }
      }
    }
  }

  changePlanet(planet: Planet){
    if(!planet){ return; }

    this.LBL_PLANETNAME.setText(planet.getName());
    this.LBL_DESC.setText(planet.getDescription());
    this.activePlanet = planet;
    // Planetary.SetSelectedPlanet(planet.getId());
    if(Planetary.models.has(planet.model)){
      this._3dViewPlanet.removeModel(this._3dViewPlanetModel);
      const mdl = Planetary.models.get(planet.model);
      OdysseyModel3D.FromMDL(mdl, {
        context: this._3dView
      }).then((model: OdysseyModel3D) => {
        this._3dViewPlanetModel = model;
        
        this._3dViewPlanet.camera.position.copy(model.camerahook.position);
        this._3dViewPlanet.camera.quaternion.copy(model.camerahook.quaternion);

        this._3dViewPlanet.addModel(this._3dViewPlanetModel);
        this.planetModelAnimationState.started = false;
        this.planetModelAnimationState.lastAnimState = undefined;
        this.planetModelAnimationState.currentAnimState = 'zoomin';

        TextureLoader.LoadQueue();
      });
    }
  }

  show() {
    super.show();
    // Planetary.SetSelectedPlanet(GameState.GlobalVariableManager.GetGlobalNumber('K_CURRENT_PLANET'));
    this.changePlanet(Planetary.selected);
    this.UpdateScale();
    const planets = Planetary.planets;
    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i];

      if(!planet){
        console.warn('invalid planet index', i);
        continue;
      }

      const control = this.getControlByName(planet.guitag);
      if (!control) {
        console.warn('invalid guitag', planet.guitag);
        continue;
      }

      control.removeEventListener('click');
      console.log(planet.label, planet.enabled);

      if (!planet.enabled) {
        control.hide();
        control.disableBorder();
        continue;
      }

      control.show();
      control.disableBorder();
      control.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changePlanet(planet);
      });
    }
  }
  
}
