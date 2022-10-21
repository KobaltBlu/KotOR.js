/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, MenuManager } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";

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

  constructor(){
    super();
    this.gui_resref = 'map';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
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

      this.onOpenScript = await NWScript.Load('k_sup_guiopen');
      this.onTransitScript = await NWScript.Load('k_sup_gohawk');
      NWScript.SetGlobalScript('k_sup_guiopen', true);
      NWScript.SetGlobalScript('k_sup_gohawk', true);
      resolve();
    });
  }

  SetMapTexture(sTexture = '') {
    this.LBL_Map.setFillTextureName(sTexture);
    TextureLoader.tpcLoader.fetch(sTexture, (texture: OdysseyTexture) => {
      this.LBL_Map.setFillTexture(texture);
    });
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_MAP.onHoverIn();
    GameState.MenuActive = true;
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
