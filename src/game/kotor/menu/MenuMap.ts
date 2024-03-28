import { GameState } from "../../../GameState";
import { GameMenu, LBL_MapView } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import { MapMode } from "../../../enums/engine/MapMode";
import { Mouse } from "../../../controls";
import type { ModuleWaypoint } from "../../../module";
import { CExoLocString } from "../../../resource/CExoLocString";

/**
 * MenuMap class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuMap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>( async (resolve, reject) => {
      this.LBL_MapNote.setText('');
      this.LBL_Map.addEventListener('click', (e) => {
        e.stopPropagation();
        const mapNote: ModuleWaypoint = this.miniMap.onClick();
        if(mapNote && mapNote.mapNote instanceof CExoLocString){
          this.LBL_MapNote.setText(mapNote.mapNote.getValue())
        }
      });

      this.BTN_PRTYSLCT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuPartySelection.open();
      });

      this.BTN_RETURN.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        if(!GameState.module.area.unescapable){
          if(this.onTransitScript instanceof NWScriptInstance)
            this.onTransitScript.run();
        }
      });

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
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

  update(delta = 0) {
    super.update(delta);
    if (!this.bVisible)
      return;

    if (!GameState.module.area.miniGame) {
      const oPC = GameState.getCurrentPlayer();

      //update minimap
      this.miniMap.setPosition(oPC.position.x, oPC.position.y);
      this.miniMap.setRotation(GameState.controls.camera.rotation.z);
      this.miniMap.updateMousePosition(
        Mouse.positionUI.x + (this.LBL_Map.extent.width/2)  + (this.LBL_Map.widget.position.x * -1),
        Mouse.positionUI.y + (this.LBL_Map.extent.height/2) + (this.LBL_Map.widget.position.y * -1),
      )
      this.miniMap.render(delta);
    }
  }

  SetMapTexture(sTexture = '') {
    try {
      TextureLoader.Load(sTexture).then((texture: OdysseyTexture) => {
        this.miniMap.setTexture(texture);
      });
    } catch (e: any) {
      console.error(e);
    }
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MAP.onHoverIn();
    if (this.onOpenScript instanceof NWScriptInstance)
      this.onOpenScript.run();

    this.LBL_MapNote.setText('');
    this.miniMap.mapNoteSelected = this.miniMap.areaMap.getRevealedMapNotes()[0];
    if(this.miniMap.mapNoteSelected){
      this.LBL_MapNote.setText(this.miniMap.mapNoteSelected.mapNote.getValue());
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_JOU.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_OPT.click();
  }
  
}
