import { GameState } from "@/GameState";
import { GameMenu, LBL_3DView } from "@/gui";
import type { GUILabel, GUIButton, GUIControl } from "@/gui";
import { MDLLoader, TextureLoader } from "@/loaders";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { Planet, Planetary } from "@/engine/Planetary";
import { OdysseyModel3D } from "@/three/odyssey";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";

/**
 * MenuGalaxyMap class.
 *
 * engine-aligned K1.
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

  _3dViewPlanet: LBL_3DView;
  _3dViewPlanetModel: OdysseyModel3D;

  /** DisplayPlanet current_planet — last model shown (-1 = none). */
  currentPlanet: number = -1;

  /**
   * TSL OnPanelAdded snapshots the selected planet at open for the
   * already-at-location Accept check. K1 ignores this.
   */
  planetAtOpen: number = -1;

  /** Selected planet button held in highlight (Draw SetActive(1)). */
  private activePlanetControl: GUIControl | undefined;

  /** After DisplayPlanet, wait for zoomin to finish then start rotate. */
  private pendingPlanetRotate: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'galaxymap';
    this.background = '1600x1200map';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;

    this.BTN_BACK.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    this._button_b = this.BTN_BACK;

    this.BTN_ACCEPT.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAccept();
    });
    this._button_a = this.BTN_ACCEPT;

    this._3dViewPlanet = new LBL_3DView();
    this._3dViewPlanet.visible = true;
    this._3dViewPlanet.setControl(this._3D_PlanetModel);

    this.script = NWScript.Load('k_sup_galaxymap');
    NWScript.SetGlobalScript('k_sup_galaxymap', true);

    GameState.PerformanceMonitor.start('MenuGalaxyMap.loadGalaxyModel');
    const mdl = await MDLLoader.loader.load('galaxy');
    GameState.PerformanceMonitor.stop('MenuGalaxyMap.loadGalaxyModel');
    this.tGuiPanel.hideFill();

    this._3dView = new LBL_3DView();
    this._3dView.visible = true;
    this._3dView.setControl(this._3D_PlanetDisplay);

    GameState.PerformanceMonitor.start('MenuGalaxyMap.loadGalaxyModel.FromMDL');
    const model = await OdysseyModel3D.FromMDL(mdl, {
      context: this._3dView
    });
    GameState.PerformanceMonitor.stop('MenuGalaxyMap.loadGalaxyModel.FromMDL');

    this._3dViewModel = model;
    this._3dView.camera.position.copy(model.camerahook.position);
    this._3dView.camera.quaternion.copy(model.camerahook.quaternion);
    this._3dView.addModel(this._3dViewModel);
    // PlayAnimation("default", 1.0, 0) — keep spinning for visual parity
    this._3dViewModel.playAnimation('default', true);

    this.bindPlanetButtons();

    GameState.PerformanceMonitor.start('MenuGalaxyMap.loadGalaxyModel.TextureLoader.LoadQueue');
    TextureLoader.LoadQueue().then(() => {
      GameState.PerformanceMonitor.stop('MenuGalaxyMap.loadGalaxyModel.TextureLoader.LoadQueue');
    });
  }

  /**
   * ctor: InitControl from planetary.2da GUITag, Icon fill on both
   * borders, custom_value = row, AButton → OnPlanetClicked.
   */
  protected bindPlanetButtons(){
    const planets = Planetary.planets;
    if(!planets){ return; }

    for(let i = 0; i < 16 && i < planets.length; i++){
      const planet = planets[i];
      if(!planet?.guitag){ continue; }

      const control = this.getControlByName(planet.guitag) as GUIButton;
      if(!control){ continue; }

      if(planet.icon && planet.icon !== '****'){
        control.setFillTextureName(planet.icon);
      }

      control.disableBorder();
      control.removeEventListener('click');
      control.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onPlanetClicked(planet);
      });
    }
  }

  /**
   * K1 Accept: PlayGuiSound + RunScript(k_sup_galaxymap, OBJECT_INVALID) + hide.
   * TSL overrides for already-at / LockedOutReason.
   */
  onAccept(){
    if(this.script instanceof NWScriptInstance){
      this.script.run(undefined);
    }
    this.close();
  }

  /**
   * OnPlanetClicked — SetSelectedPlanet then DisplayPlanet(…, animate).
   */
  onPlanetClicked(planet: Planet){
    if(!planet){ return; }
    if(planet.id === Planetary.selectedIndex){ return; }

    const previous = Planetary.selectedIndex;
    Planetary.SetSelectedPlanet(planet.id);
    if(Planetary.selectedIndex === previous){
      // Not available+selectable — SetSelectedPlanet no-ops
      return;
    }

    this.setPlanetButtonActive(previous, false);
    this.setPlanetButtonActive(Planetary.selectedIndex, true);
    this.displayPlanet(Planetary.selectedIndex, true);
  }

  /**
   * DisplayPlanet — name/desc TLK, replace 3D model, zoomin + queued rotate.
   */
  displayPlanet(planetIndex: number, animate: boolean){
    if(planetIndex === -1 || planetIndex === this.currentPlanet){
      return;
    }

    const planet = Planetary.GetPlanetByIndex(planetIndex);
    if(!planet){ return; }

    this.LBL_PLANETNAME.setText(planet.getName());
    this.LBL_DESC.setText(planet.getDescription());

    if(Planetary.models.has(planet.model)){
      this._3dViewPlanet.removeModel(this._3dViewPlanetModel);
      const mdl = Planetary.models.get(planet.model);
      OdysseyModel3D.FromMDL(mdl, {
        context: this._3dViewPlanet
      }).then((model: OdysseyModel3D) => {
        this._3dViewPlanetModel = model;
        this._3dViewPlanet.camera.position.copy(model.camerahook.position);
        this._3dViewPlanet.camera.quaternion.copy(model.camerahook.quaternion);
        this._3dViewPlanet.addModel(this._3dViewPlanetModel);

        this.pendingPlanetRotate = false;
        if(animate){
          // : PlayAnimation("zoomin", FIRE_FORGET) then
          // PlayAnimation("rotate", QUEUE=0x20). Manager QUEUE support is
          // incomplete, so hand off to rotate when zoomin ends.
          const zoomin = model.odysseyAnimationMap.get('zoomin');
          if(zoomin){
            model.animationManager.playAnimation(zoomin, AuroraAnimationFlag.FIRE_FORGET, { loop: false });
            this.pendingPlanetRotate = true;
          }else{
            const rotate = model.odysseyAnimationMap.get('rotate');
            if(rotate){
              model.animationManager.playAnimation(rotate, AuroraAnimationFlag.LOOPING, { loop: true });
            }
          }
        }

        TextureLoader.LoadQueue();
      });
    }

    this.currentPlanet = planetIndex;
  }

  /**
   * Draw SetActive on the selected planet button (highlight).
   */
  setPlanetButtonActive(planetIndex: number, active: boolean){
    if(planetIndex < 0){ return; }
    const planet = Planetary.GetPlanetByIndex(planetIndex);
    if(!planet?.guitag){ return; }
    const control = this.getControlByName(planet.guitag);
    if(!control){ return; }

    if(active){
      if(this.activePlanetControl && this.activePlanetControl !== control){
        this.activePlanetControl.hideHighlight();
        this.activePlanetControl.showBorder();
        this.activePlanetControl.hover = false;
      }
      this.activePlanetControl = control;
      control.showHighlight();
      if(control.highlight?.edge){
        control.hideBorder();
      }
      control.hover = true;
    }else if(this.activePlanetControl === control){
      control.hideHighlight();
      control.showBorder();
      control.hover = false;
      this.activePlanetControl = undefined;
    }
  }

  update(delta = 0) {
    super.update(delta);
    // Draw: keep selected planet SetActive(1)
    if(Planetary.selectedIndex !== -1){
      this.setPlanetButtonActive(Planetary.selectedIndex, true);
    }
    this.updateGalaxyMapView(delta);
    this.updatePlanetView(delta);
  }

  updateGalaxyMapView(delta: number = 0){
    try {
      // LBL_3DView.render ticks OdysseyModel3D (emitters + anim). Do not
      // call model.update here or particles age/birth twice per frame.
      this._3dView?.render(delta);
      this._3D_PlanetDisplay?.markChromeNeedsUpdate();
    } catch (e: any) {
      console.error(e);
    }
  }

  updatePlanetView(delta: number = 0){
    try {
      const planetModel = this._3dViewPlanetModel;
      const _3dView = this._3dViewPlanet;
      if(planetModel){
        // Update once for zoomin/rotate, then sync camerahook before RTT.
        planetModel.update(delta);
        if(planetModel.camerahook){
          _3dView.camera.position.copy(planetModel.camerahook.position);
          _3dView.camera.quaternion.copy(planetModel.camerahook.quaternion);
        }

        if(this.pendingPlanetRotate){
          const name = planetModel.getAnimationName()?.toLowerCase();
          if(!name || name !== 'zoomin'){
            const rotate = planetModel.odysseyAnimationMap.get('rotate');
            if(rotate){
              planetModel.animationManager.playAnimation(
                rotate,
                AuroraAnimationFlag.LOOPING,
                { loop: true }
              );
            }
            this.pendingPlanetRotate = false;
          }
        }
      }

      _3dView?.render(delta, { skipModelUpdate: true });
      this._3D_PlanetModel?.markChromeNeedsUpdate();
    } catch (e: any) {
      console.error(e);
    }
  }

  /**
   * NextPlanet — wrap 0..15, only available+selectable.
   */
  nextPlanet(){
    const start = Planetary.selectedIndex;
    if(start === -1){ return; }

    this.setPlanetButtonActive(start, false);
    let planetId = start + 1;
    do {
      if(planetId > 15){ planetId = 0; }
      const planet = Planetary.GetPlanetByIndex(planetId);
      if(planet?.enabled && planet?.selectable){
        Planetary.SetSelectedPlanet(planetId);
        break;
      }
      planetId++;
    } while(planetId !== start);

    this.setPlanetButtonActive(Planetary.selectedIndex, true);
    this.displayPlanet(Planetary.selectedIndex, true);
  }

  /**
   * PrevPlanet — wrap 0..15, only available+selectable.
   */
  prevPlanet(){
    const start = Planetary.selectedIndex;
    if(start === -1){ return; }

    this.setPlanetButtonActive(start, false);
    let planetId = start - 1;
    do {
      if(planetId < 0){ planetId = 15; }
      const planet = Planetary.GetPlanetByIndex(planetId);
      if(planet?.enabled && planet?.selectable){
        Planetary.SetSelectedPlanet(planetId);
        break;
      }
      planetId--;
    } while(planetId !== start);

    this.setPlanetButtonActive(Planetary.selectedIndex, true);
    this.displayPlanet(Planetary.selectedIndex, true);
  }

  /**
   * OnPanelAdded — default selection, visibility from available, DisplayPlanet.
   */
  show() {
    super.show();

    // Snapshot for TSL already-at Accept check
    this.planetAtOpen = Planetary.selectedIndex;

    if(Planetary.selectedIndex === -1){
      for(let i = 0; i < 16; i++){
        const planet = Planetary.GetPlanetByIndex(i);
        if(planet?.enabled && planet?.selectable){
          Planetary.SetSelectedPlanet(i);
          break;
        }
      }
    }

    const planets = Planetary.planets;
    for(let i = 0; i < 16 && i < (planets?.length ?? 0); i++){
      const planet = planets[i];
      if(!planet?.guitag){ continue; }
      const control = this.getControlByName(planet.guitag);
      if(!control){ continue; }

      // : bit_flags visibility from GetPlanetAvailable only
      if(planet.enabled){
        control.show();
      }else{
        control.hide();
      }
    }

    if(Planetary.selectedIndex !== -1){
      this.setPlanetButtonActive(Planetary.selectedIndex, true);
    }
    this.displayPlanet(Planetary.selectedIndex, true);
  }

  hide() {
    // OnPanelRemoved — clear active highlights, reset current_planet
    for(let i = 0; i < 16; i++){
      this.setPlanetButtonActive(i, false);
    }
    this.currentPlanet = -1;
    this.activePlanetControl = undefined;
    super.hide();
  }

  triggerControllerDLeftPress() {
    this.prevPlanet();
  }

  triggerControllerDRightPress() {
    this.nextPlanet();
  }

  triggerControllerLStickXPress(positive = false) {
    if(positive){
      this.nextPlanet();
    }else{
      this.prevPlanet();
    }
  }

}
