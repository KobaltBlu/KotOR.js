import { GameState } from "@/GameState";
import { LBL_3DView } from "@/gui";
import type { GUILabel, GUICheckBox, GUIButton } from "@/gui";
import { MDLLoader, TextureLoader } from "@/loaders";
import { ModuleCreature } from "@/module";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);
import { MenuPartySelection as K1_MenuPartySelection } from "@/game/kotor/KOTOR";

/**
 * MenuPartySelection class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPartySelection.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPartySelection extends K1_MenuPartySelection {

  declare LBL_NAMEBACK: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_CHAR8: GUILabel;
  declare LBL_CHAR7: GUILabel;
  declare LBL_CHAR6: GUILabel;
  declare LBL_CHAR3: GUILabel;
  declare LBL_CHAR4: GUILabel;
  declare LBL_CHAR5: GUILabel;
  declare LBL_CHAR2: GUILabel;
  declare LBL_CHAR9: GUILabel;
  declare LBL_CHAR1: GUILabel;
  declare LBL_CHAR0: GUILabel;
  declare BTN_NPC0: GUICheckBox;
  declare BTN_NPC1: GUICheckBox;
  declare BTN_NPC2: GUICheckBox;
  declare BTN_NPC9: GUICheckBox;
  declare BTN_NPC3: GUICheckBox;
  declare BTN_NPC4: GUICheckBox;
  declare BTN_NPC5: GUICheckBox;
  declare BTN_NPC6: GUICheckBox;
  declare BTN_NPC7: GUICheckBox;
  declare BTN_NPC8: GUICheckBox;
  declare LBL_NA8: GUILabel;
  declare LBL_NA5: GUILabel;
  declare LBL_NA2: GUILabel;
  declare LBL_NA9: GUILabel;
  declare LBL_NA6: GUILabel;
  declare LBL_NA3: GUILabel;
  declare LBL_NA0: GUILabel;
  declare LBL_NA1: GUILabel;
  declare LBL_NA4: GUILabel;
  declare LBL_NA7: GUILabel;
  declare LBL_3D: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LBL_COUNT: GUILabel;
  declare LBL_BEVEL_M: GUILabel;
  declare LBL_NPC_NAME: GUILabel;
  declare LBL_NPC_LEVEL: GUILabel;
  declare LBL_BEVEL_L: GUILabel;
  declare BTN_ACCEPT: GUIButton;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_CHAR11: GUILabel;
  declare LBL_CHAR10: GUILabel;
  declare BTN_NPC11: GUICheckBox;
  declare BTN_NPC10: GUICheckBox;
  declare LBL_NA11: GUILabel;
  declare LBL_NA10: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DONE: GUIButton;

  default0: string;
  default1: string;
  default2: string;
  default3: string;
  default4: string;
  default5: string;
  default6: string;
  default7: string;
  default8: string;
  default9: string;
  default10: string;
  default11: string;
  char: any;
  LBL_3D_VIEW: any;
  cgmain_light: OdysseyModel;

  constructor(){
    super();
    this.gui_resref = 'partyselect_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.childMenu = this.manager.MenuTop;
      this.default0 = this.LBL_NA0.getFillTextureName();
      this.default1 = this.LBL_NA1.getFillTextureName();
      this.default2 = this.LBL_NA2.getFillTextureName();
      this.default3 = this.LBL_NA3.getFillTextureName();
      this.default4 = this.LBL_NA4.getFillTextureName();
      this.default5 = this.LBL_NA5.getFillTextureName();
      this.default6 = this.LBL_NA6.getFillTextureName();
      this.default7 = this.LBL_NA7.getFillTextureName();
      this.default8 = this.LBL_NA8.getFillTextureName();
      this.default9 = this.LBL_NA9.getFillTextureName();
      this.default10 = this.LBL_NA10.getFillTextureName();
      this.default11 = this.LBL_NA11.getFillTextureName();
      this.BTN_NPC0.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(0)){
          this.selectedNPC = 0;
          this.updateSelection();
        }
      });

      this.BTN_NPC1.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(1)){
          this.selectedNPC = 1;
          this.updateSelection();
        }
      });

      this.BTN_NPC2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(2)){
          this.selectedNPC = 2;
          this.updateSelection();
        }
      });

      this.BTN_NPC3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(3)){
          this.selectedNPC = 3;
          this.updateSelection();
        }
      });

      this.BTN_NPC4.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(4)){
          this.selectedNPC = 4;
          this.updateSelection();
        }
      });

      this.BTN_NPC5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(5)){
          this.selectedNPC = 5;
          this.updateSelection();
        }
      });

      this.BTN_NPC6.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(6)){
          this.selectedNPC = 6;
          this.updateSelection();
        }
      });

      this.BTN_NPC7.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(7)){
          this.selectedNPC = 7;
          this.updateSelection();
        }
      });

      this.BTN_NPC8.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(8)){
          this.selectedNPC = 8;
          this.updateSelection();
        }
      });

      this.BTN_NPC9.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(9)){
          this.selectedNPC = 9;
          this.updateSelection();
        }
      });

      this.BTN_NPC10.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(10)){
          this.selectedNPC = 10;
          this.updateSelection();
        }
      });

      this.BTN_NPC11.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(11)){
          this.selectedNPC = 11;
          this.updateSelection();
        }
      });

      this.BTN_DONE.addEventListener('click', (e) => {
        e.stopPropagation();

        if(!this.canClose())
          return;

        if(this.onCloseScript instanceof NWScriptInstance){
          this.close();
          this.onCloseScript.run(undefined, 0);
          this.onCloseScript = undefined;
        }else{
          this.close();
        }
        
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();

        //Area Unescapable disables party selection as well as transit
        if(!GameState.module.area.unescapable || this.ignoreUnescapable){
          if(GameState.PartyManager.IsNPCInParty(this.selectedNPC)){
            GameState.PartyManager.RemoveNPCById(this.selectedNPC);
            this.updateSelection();
          }else if(this.isSelectable(this.selectedNPC) && GameState.PartyManager.CurrentMembers.length < GameState.PartyManager.MaxNPCCount){
            this.addToParty(this.selectedNPC);
          }
          this.updateCount();
        }

      });

      this.LBL_3D_VIEW = new LBL_3DView(this.LBL_3D.extent.width, this.LBL_3D.extent.height);
      this.LBL_3D_VIEW.setControl(this.LBL_3D);

      MDLLoader.loader.load('cgmain_light')
      .then((mdl: OdysseyModel) => {
        this.cgmain_light = mdl;

        OdysseyModel3D.FromMDL(this.cgmain_light, {
          // manageLighting: false,
          context: this.LBL_3D_VIEW
        }).then((model: OdysseyModel3D) => {
          //log.info('Model Loaded', model);
          this.LBL_3D_VIEW.model = model;
          this.LBL_3D_VIEW.addModel(this.LBL_3D_VIEW.model);

          this.LBL_3D_VIEW.camerahook = this.LBL_3D_VIEW.model.getObjectByName('camerahook');
          
          this.LBL_3D_VIEW.camera.position.copy(
            this.LBL_3D_VIEW.camerahook.position
          );

          this.LBL_3D_VIEW.camera.quaternion.copy(
            this.LBL_3D_VIEW.camerahook.quaternion
          ); 
          this.LBL_3D_VIEW.camera.position.z = 1;

          this.LBL_3D_VIEW.camera.updateProjectionMatrix();
          this.LBL_3D_VIEW.visible = true;
          resolve();
        }).catch(() => {
          resolve();
        });
      }).catch(() => {
        resolve();
      });
    });
  }

  /**
   * Hides the menu.
   */
  hide() {
    super.hide();
    this.ignoreUnescapable = false;
  }

  /**
   * Shows the menu.
   * @param scriptName - The name of the script to run on close.
   * @param forceNPC1 - The ID of the first NPC to force.
   * @param forceNPC2 - The ID of the second NPC to force.
   */
  async show(scriptName = '', forceNPC1 = -1, forceNPC2 = -1) {
    super.show();
    this.forceNPC1 = forceNPC1;
    this.forceNPC2 = forceNPC2;
    if (this.forceNPC1 > -1)
      this.addToParty(this.forceNPC1);
    if (this.forceNPC2 > -1)
      this.addToParty(this.forceNPC2);
    if (this.ignoreUnescapable) {
      // this.manager.MenuTop.toggleNavUI(false);
    }

    this.selectedNPC = this.forceNPC1 > -1 ? this.forceNPC1 : this.forceNPC2 > -1 ? this.forceNPC2 : -1;
    this.updateSelection();
    this.updateCount();
    await this.initPortraits();
    this.updateSelection();
    TextureLoader.LoadQueue();
    if (scriptName != '' || scriptName != null) {
      this.onCloseScript = NWScript.Load(scriptName);
    }
  }

  /**
   * Updates the menu.
   * @param delta - The delta time.
   */
  update(delta: number) {
    super.update(delta);
    if (!this.bVisible)
      return;

    if (this.char instanceof ModuleCreature){
      this.char.update(delta);
      if(this.char.model instanceof OdysseyModel3D && this.char.model.bonesInitialized){
        this.char.model.update( delta );
      }
      try {
        this.LBL_3D_VIEW.render(delta);
      } catch (_e: unknown) { }
    }
  }

  /**
   * Updates the selection of the NPC.
   */
  updateSelection() {
    super.updateSelection();
    if (!(this.char instanceof ModuleCreature) || this.char instanceof ModuleCreature && this.char.selectedNPC != this.selectedNPC) {
      GameState.PartyManager.LoadPartyMemberCreature(this.selectedNPC, (creature: ModuleCreature) => {
        if (creature instanceof ModuleCreature) {
          if (this.char instanceof ModuleCreature) {
            this.char.destroy();
          }
          this.char = creature;
          creature.selectedNPC = this.selectedNPC;
          creature.position.set(0, 0, 0);
          creature.model.rotation.z = -Math.PI / 2;
          this.LBL_3D_VIEW.group.creatures.add(creature.model);
          this.char.LoadModel();
        }
      });
    }
  }
  
}
