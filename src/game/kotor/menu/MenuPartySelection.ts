/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUICheckBox, GUIButton, GUIControl } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { PartyManager } from "../../../managers/PartyManager";
import { TLKManager } from "../../../managers/TLKManager";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyTexture } from "../../../resource/OdysseyTexture";

/* @file
* The MenuPartySelection menu class.
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

  selectedNPC: number = 0;
  scriptName: string;
  onCloseScript: NWScriptInstance;

  constructor(){
    super();
    this.gui_resref = 'partyselection';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_NPC0.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(0)){
          this.selectNPC(0)
        }
      });

      this.BTN_NPC1.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(1)){
          this.selectNPC(1);
        }
      });

      this.BTN_NPC2.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(2)){
          this.selectNPC(2);
        }
      });

      this.BTN_NPC3.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(3)){
          this.selectNPC(3);
        }
      });

      this.BTN_NPC4.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(4)){
          this.selectNPC(4);
        }
      });

      this.BTN_NPC5.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(5)){
          this.selectNPC(5);
        }
      });

      this.BTN_NPC6.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(6)){
          this.selectNPC(6);
        }
      });

      this.BTN_NPC7.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(7)){
          this.selectNPC(7);
        }
      });

      this.BTN_NPC8.addEventListener('click', (e: any) => {
        e.stopPropagation();
        if(PartyManager.IsAvailable(8)){
          this.selectNPC(8);
        }
      });

      this.BTN_DONE.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(!this.canClose())
          return;

        if(this.onCloseScript instanceof NWScriptInstance){
          this.Close();
          this.onCloseScript.run(undefined, 0, () => {
            this.onCloseScript = undefined;
          });
        }else{
          this.Close();
        }
        
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();

        if(this.canRemove(this.selectedNPC)){
          console.warn(`MenuPartySelection:RemoveNPC`, `Cannot remove a required party member ${this.selectedNPC}`);
          return false;
        }

        //Area Unescapable disables party selection as well as transit
        if(!GameState.module.area.Unescapable || this.ignoreUnescapable){
          if(this.npcInParty(this.selectedNPC)){
            PartyManager.RemoveNPCById(this.selectedNPC);
            this.UpdateSelection();
          }else if(this.isSelectable(this.selectedNPC) && PartyManager.CurrentMembers.length < PartyManager.MaxSize){
            this.addToParty(this.selectedNPC);
          }
          this.UpdateCount();
        }

      });
      resolve();
    });
  }

  selectNPC(npc: number = -1){
    if(npc < 0 || npc >= PartyManager.MaxSize) return;
    // if(PartyManager.CurrentMembers.length >= 2) return;
    this.selectedNPC = npc;
    this.UpdateSelection();
  }

  isNPCRequired(npc: number = -1){
    if(npc < 0) return;
    return (this.forceNPC1 == npc || this.forceNPC2 == npc);
  }

  addToParty(selected: number) {
    let idx = PartyManager.CurrentMembers.push({
      isLeader: false,
      memberID: selected
    }) - 1;
    PartyManager.LoadPartyMember(idx, () => {
      this.UpdateSelection();
      if (!this.npcInParty(selected)) {
        PartyManager.RemoveNPCById(selected);
      }
      this.UpdateCount();
    });
    this.UpdateSelection();
  }

  npcInParty(nID: number) {
    for (let i = 0; i < PartyManager.CurrentMembers.length; i++) {
      let cpm = PartyManager.CurrentMembers[i];
      if (cpm.memberID == nID) {
        return true;
      }
    }
    return false;
  }

  indexOfSelectedNPC(nID: number) {
    for (let i = 0; i < PartyManager.CurrentMembers.length; i++) {
      let cpm = PartyManager.CurrentMembers[i];
      if (cpm.memberID == nID) {
        return i;
      }
    }
    return -1;
  }

  UpdateSelection() {
    for (let i = 0; i < 9; i++) {
      let btn = this.getControlByName('BTN_NPC' + i);
      if (this.npcInParty(i)) {
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
    if (this.npcInParty(this.selectedNPC)) {
      this.BTN_ACCEPT.setText(TLKManager.GetStringById(38456).Value);
    } else {
      this.BTN_ACCEPT.setText(TLKManager.GetStringById(38455).Value);
    }
  }

  GetCurrentMemberCount() {
    return PartyManager.CurrentMembers.length;
  }

  UpdateCount() {
    this.LBL_COUNT.setText((PartyManager.MaxSize - PartyManager.CurrentMembers.length).toString());
  }

  Hide() {
    super.Hide();
    this.ignoreUnescapable = false;
  }

  Open(scriptName = '', forceNPC1 = -1, forceNPC2 = -1) {
    this.scriptName = scriptName;
    this.forceNPC1 = forceNPC1;
    this.forceNPC2 = forceNPC2;
    super.Open();
  }

  async Show() {
    super.Show();
    GameState.MenuActive = true;
    if (this.forceNPC1 > -1)
      this.addToParty(this.forceNPC1);
    if (this.forceNPC2 > -1)
      this.addToParty(this.forceNPC2);

    let LBL_CHAR: GUIControl;
    let LBL_NA: GUIControl;
    for (let i = 0; i < 9; i++) {
      LBL_CHAR = this.getControlByName('LBL_CHAR' + i);
      LBL_NA = this.getControlByName('LBL_NA' + i);
      LBL_CHAR.hide();
      LBL_NA.show();
      if (PartyManager.IsAvailable(i)) {
        LBL_NA.hide();
        let portrait = PartyManager.GetPortraitByIndex(i);
        if (LBL_NA.getFillTextureName() != portrait) {
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
      this.onCloseScript = await NWScript.Load(this.scriptName);
    }
  }

  canRemove(npc: number = -1): boolean {
    return this.npcInParty(npc) && this.isNPCRequired(npc);
  }

  canClose() {
    if (this.forceNPC1 > -1 || this.forceNPC2 > -1) {
      const force1 = this.forceNPC1 == -1 || ( !!PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC1 ) );
      const force2 = this.forceNPC2 == -1 || ( !!PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC2 ) );
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

  isSelectable(index: number = 0) {
    return PartyManager.IsSelectable(index);
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
