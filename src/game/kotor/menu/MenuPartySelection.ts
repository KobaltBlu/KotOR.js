import { GameState } from "../../../GameState";
import { GameMenu, GUIControl } from "../../../gui";
import type { GUILabel, GUIButton, GUICheckBox } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";

const TLK_REMOVE = 38456;
const TLK_ADD = 38455;

/**
 * MenuPartySelection class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPartySelection.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPartySelection extends GameMenu {

  LBL_CHAR8: GUILabel;
  LBL_CHAR7: GUILabel;
  LBL_CHAR6: GUILabel;
  LBL_CHAR3: GUILabel;
  LBL_CHAR4: GUILabel;
  LBL_CHAR5: GUILabel;
  LBL_CHAR2: GUILabel;
  LBL_CHAR1: GUILabel;
  LBL_CHAR0: GUILabel;
  BTN_NPC0: GUICheckBox;
  BTN_NPC1: GUICheckBox;
  BTN_NPC2: GUICheckBox;
  BTN_NPC3: GUICheckBox;
  BTN_NPC4: GUICheckBox;
  BTN_NPC5: GUICheckBox;
  BTN_NPC6: GUICheckBox;
  BTN_NPC7: GUICheckBox;
  BTN_NPC8: GUICheckBox;
  LBL_NA8: GUILabel;
  LBL_NA5: GUILabel;
  LBL_NA2: GUILabel;
  LBL_NA6: GUILabel;
  LBL_NA3: GUILabel;
  LBL_NA0: GUILabel;
  LBL_NA1: GUILabel;
  LBL_NA4: GUILabel;
  LBL_NA7: GUILabel;
  LBL_3D: GUILabel;
  LBL_TITLE: GUILabel;
  LBL_AVAILABLE: GUILabel;
  LBL_COUNT: GUILabel;
  LBL_BEVEL_M: GUILabel;
  LBL_NPC_NAME: GUILabel;
  LBL_NPC_LEVEL: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_BEVEL_L: GUILabel;
  BTN_DONE: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ACCEPT: GUIButton;

  ignoreUnescapable = false;
  forceNPC1 = -1;
  forceNPC2 = -1;

  party: any = {
    0: {selected: false, available: false},
    1: {selected: false, available: false},
    2: {selected: false, available: false},
    3: {selected: false, available: false},
    4: {selected: false, available: false},
    5: {selected: false, available: false},
    6: {selected: false, available: false},
    7: {selected: false, available: false},
    8: {selected: false, available: false}
  };

  selectedNPC: number = -1;
  scriptName: string;
  onCloseScript: NWScriptInstance;

  constructor(){
    super();
    this.gui_resref = 'partyselection';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_NPC0.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(0)){
          this.selectNPC(0)
        }
      });

      this.BTN_NPC1.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(1)){
          this.selectNPC(1);
        }
      });

      this.BTN_NPC2.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(2)){
          this.selectNPC(2);
        }
      });

      this.BTN_NPC3.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(3)){
          this.selectNPC(3);
        }
      });

      this.BTN_NPC4.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(4)){
          this.selectNPC(4);
        }
      });

      this.BTN_NPC5.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(5)){
          this.selectNPC(5);
        }
      });

      this.BTN_NPC6.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(6)){
          this.selectNPC(6);
        }
      });

      this.BTN_NPC7.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(7)){
          this.selectNPC(7);
        }
      });

      this.BTN_NPC8.addEventListener('click', (e) => {
        e.stopPropagation();
        if(GameState.PartyManager.IsAvailable(8)){
          this.selectNPC(8);
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

        if(this.canRemove(this.selectedNPC)){
          console.warn(`MenuPartySelection:RemoveNPC`, `Cannot remove a required party member ${this.selectedNPC}`);
          return false;
        }

        //Area Unescapable disables party selection as well as transit
        if(!GameState.module.area.unescapable || this.ignoreUnescapable){
          if(GameState.PartyManager.IsNPCInParty(this.selectedNPC)){
            GameState.PartyManager.RemoveNPCById(this.selectedNPC);
            this.UpdateSelection();
          }else if(this.isSelectable(this.selectedNPC) && GameState.PartyManager.CurrentMembers.length < GameState.PartyManager.MaxNPCCount){
            this.addToParty(this.selectedNPC);
          }
          this.UpdateCount();
        }

      });
      resolve();
    });
  }

  selectNPC(npcId: number = -1){
    if(npcId < 0 || npcId >= GameState.PartyManager.MaxNPCCount) return;
    // if(PartyManager.CurrentMembers.length >= 2) return;
    this.selectedNPC = npcId;
    this.UpdateSelection();
  }

  isNPCRequired(npcId: number = -1){
    if(npcId < 0) return;
    return (this.forceNPC1 == npcId || this.forceNPC2 == npcId);
  }

  async addToParty(npcId: number) {
    await GameState.PartyManager.AddNPCById(npcId);
    this.UpdateCount();
    this.UpdateSelection();
  }

  indexOfSelectedNPC(npcId: number) {
    for (let i = 0; i < GameState.PartyManager.CurrentMembers.length; i++) {
      let cpm = GameState.PartyManager.CurrentMembers[i];
      if (cpm.memberID == npcId) {
        return i;
      }
    }
    return -1;
  }

  UpdateSelection() {
    for (let i = 0; i < GameState.PartyManager.MaxNPCCount; i++) {
      let btn = this.getControlByName('BTN_NPC' + i);
      if (GameState.PartyManager.IsNPCInParty(i)) {
        btn.highlight.edge_material.uniforms.diffuse.value.setRGB(0, 1, 0);
        btn.highlight.corner_material.uniforms.diffuse.value.setRGB(0, 1, 0);
      } else {
        btn.highlight.edge_material.uniforms.diffuse.value.setRGB(1, 1, 0);
        btn.highlight.corner_material.uniforms.diffuse.value.setRGB(1, 1, 0);
      }
      btn.disableBorder();
      btn.disableHighlight();
      btn.pulsing = false;
    }
    let btn = this.getControlByName('BTN_NPC' + this.selectedNPC);
    if (btn instanceof GUIControl) {
      btn.enableHighlight();
      btn.pulsing = true;
    }
    if (GameState.PartyManager.IsNPCInParty(this.selectedNPC)) {
      this.BTN_ACCEPT.setText(GameState.TLKManager.GetStringById(TLK_REMOVE).Value);
      if(!this.canRemove(this.selectedNPC)){
        this.BTN_ACCEPT.hide();
      } else {
        this.BTN_ACCEPT.show();
      }
    } else {
      this.BTN_ACCEPT.setText(GameState.TLKManager.GetStringById(TLK_ADD).Value);
      if(!this.canAdd(this.selectedNPC)){
        this.BTN_ACCEPT.hide();
      } else {
        this.BTN_ACCEPT.show();
      }
    }
    if(this.selectedNPC == -1){  
      this.BTN_ACCEPT.hide();
    } else {
      this.BTN_ACCEPT.show();
    }
  }

  GetCurrentMemberCount() {
    return GameState.PartyManager.CurrentMembers.length;
  }

  UpdateCount() {
    this.LBL_COUNT.setText((GameState.PartyManager.MaxNPCCount - GameState.PartyManager.CurrentMembers.length).toString());
  }

  hide() {
    super.hide();
    this.ignoreUnescapable = false;
  }

  open(scriptName = '', forceNPC1 = -1, forceNPC2 = -1) {
    this.scriptName = scriptName;
    this.forceNPC1 = forceNPC1;
    this.forceNPC2 = forceNPC2;
    super.open();
  }

  async show() {
    super.show();
    if (this.forceNPC1 > -1)
      await this.addToParty(this.forceNPC1);
    if (this.forceNPC2 > -1)
      await this.addToParty(this.forceNPC2);

    this.selectedNPC = this.forceNPC1 > -1 ? this.forceNPC1 : this.forceNPC2 > -1 ? this.forceNPC2 : -1;
    this.UpdateSelection();

    let LBL_CHAR: GUIControl;
    let LBL_NA: GUIControl;
    for (let i = 0; i < GameState.PartyManager.MaxNPCCount; i++) {
      LBL_CHAR = this.getControlByName('LBL_CHAR' + i);
      LBL_NA = this.getControlByName('LBL_NA' + i);
      LBL_CHAR.hide();
      LBL_NA.show();
      if (GameState.PartyManager.IsAvailable(i)) {
        LBL_NA.hide();
        let portrait = GameState.PartyManager.GetPortraitByIndex(i);
        if (LBL_NA.getFillTextureName() != portrait && !!portrait) {
          LBL_CHAR.setFillTextureName(portrait).then( (texture: OdysseyTexture) => {
            LBL_CHAR.setFillTexture(texture);
            if (this.isSelectable(i)) {
              (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 1;
            } else {
              (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 0.5;
            }
          });
        } else {
          if (this.isSelectable(i)) {
            (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 1;
          } else {
            (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = 0.5;
          }
        }
        LBL_CHAR.show();
      }
      this.UpdateSelection();
    }
    TextureLoader.LoadQueue();
    this.onCloseScript = undefined;
    if (this.scriptName != '' || this.scriptName != null) {
      this.onCloseScript = NWScript.Load(this.scriptName);
    }
  }

  canRemove(npcId: number = -1): boolean {
    return GameState.PartyManager.IsNPCInParty(npcId) && !this.isNPCRequired(npcId);
  }

  canAdd(npcId: number = -1): boolean {
    return !GameState.PartyManager.IsNPCInParty(npcId) && !this.isNPCRequired(npcId) && this.isSelectable(npcId);
  }

  canClose() {
    if (this.forceNPC1 > -1 || this.forceNPC2 > -1) {
      const force1 = this.forceNPC1 == -1 || ( !!GameState.PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC1 ) );
      const force2 = this.forceNPC2 == -1 || ( !!GameState.PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC2 ) );
      return (force1 && force2);
    }
    return true;
  }

  canAccept() {
    if (this.forceNPC1 > -1 && this.forceNPC2 > -1 && this.GetCurrentMemberCount() < 2) {
      return false;
    } else if ((this.forceNPC1 > -1 || this.forceNPC2 > -1) && this.GetCurrentMemberCount() < 1) {
      return false;
    }
    return true;
  }

  isAvailable(npcId: number = -1): boolean {
    return GameState.PartyManager.IsAvailable(npcId);
  }

  isSelectable(npcId: number = 0) {
    return GameState.PartyManager.IsSelectable(npcId);
  }

  triggerControllerDUpPress() {

  }

  triggerControllerDDownPress() {

  }

  triggerControllerDLeftPress() {

  }

  triggerControllerDRightPress() {

  }
  
}
