/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import * as THREE from "three";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, MenuManager, LBL_MapView } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";
import { MapMode } from "../../../enums/engine/MapMode";

/* @file
* The MenuMap menu class.
*/

export class MenuMap extends GameMenu {

  LBL_Map: GUILabel;
  LBL_MapNote: GUILabel;
  LBL_Area: GUILabel;
  LBL_COMPASS: GUILabel;
  BTN_UP: GUIButton;
  BTN_DOWN: GUIButton;
  BTN_PRTYSLCT: GUIButton;
  BTN_RETURN: GUIButton;
  BTN_EXIT: GUIButton;

  onOpenScript: NWScriptInstance;
  openScript: string;

  onTransitScript: NWScriptInstance;
  transitScript: string;
  miniMap: LBL_MapView;

  constructor(){
    super();
    this.gui_resref = 'map';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>( async (resolve, reject) => {
      this.BTN_PRTYSLCT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuPartySelection.Open();
      });

      this.BTN_RETURN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
        if(!GameState.module.area.Unescapable){
          if(this.onTransitScript instanceof NWScriptInstance)
            this.onTransitScript.run();
        }
      });

      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_EXIT;

      this.openScript = 'k_sup_guiopen';
      this.transitScript = 'k_sup_gohawk';

      this.onOpenScript = NWScript.Load('k_sup_guiopen');
      this.onTransitScript = NWScript.Load('k_sup_gohawk');
      NWScript.SetGlobalScript('k_sup_guiopen', true);
      NWScript.SetGlobalScript('k_sup_gohawk', true);

      this.miniMap = new LBL_MapView(this.LBL_Map);
      this.miniMap.setControl(this.LBL_Map);
      this.miniMap.setSize(this.LBL_Map.extent.width, this.LBL_Map.extent.height);
      this.miniMap.setMode(MapMode.FULLMAP);

      resolve();
    });
  }

  Update(delta = 0) {
    super.Update(delta);
    if (!this.bVisible)
      return;

    if (!GameState.module.area.miniGame) {
      const oPC = GameState.getCurrentPlayer();

      //update minimap
      this.miniMap.setPosition(oPC.position.x, oPC.position.y);
      this.miniMap.setRotation(GameState.controls.camera.rotation.z);
      this.miniMap.render(delta);
    }
  }

  SetMapTexture(sTexture = '') {
    try {
      TextureLoader.Load(sTexture, (texture: OdysseyTexture) => {
        this.miniMap.setTexture(texture);
      });
    } catch (e: any) {
      console.error(e);
    }
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_MAP.onHoverIn();
    if (this.onOpenScript instanceof NWScriptInstance)
      this.onOpenScript.run();
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_JOU.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_OPT.click();
  }
  
}
