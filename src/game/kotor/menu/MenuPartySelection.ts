/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUICheckBox, GUIButton } from "../../../gui";

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

  constructor(){
    super();
    this.gui_resref = 'partyselection';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

addToParty(selected) {
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

npcInParty(nID) {
  for (let i = 0; i < PartyManager.CurrentMembers.length; i++) {
    let cpm = PartyManager.CurrentMembers[i];
    if (cpm.memberID == nID) {
      return true;
    }
  }
  return false;
}

indexOfSelectedNPC(nID) {
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
    let btn = this['BTN_NPC' + i];
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
  let btn = this['BTN_NPC' + this.selectedNPC];
  if (btn instanceof GUIControl) {
    btn.enableHighlight();
    btn.pulsing = true;
  }
  if (this.npcInParty(this.selectedNPC)) {
    this.btn_accept.setText(TLKManager.GetStringById(38456));
  } else {
    this.btn_accept.setText(TLKManager.GetStringById(38455));
  }
}

GetCurrentMemberCount() {
  return PartyManager.CurrentMembers.length;
}

UpdateCount() {
  this.lbl_count.setText((PartyManager.MaxSize - PartyManager.CurrentMembers.length).toString());
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
  for (let i = 0; i < 9; i++) {
    this['lbl_party' + i].hide();
    this['lbl_na' + i].show();
    if (PartyManager.IsAvailable(i)) {
      this['lbl_na' + i].hide();
      let portrait = PartyManager.GetPortraitByIndex(i);
      if (this['lbl_na' + i].getFillTextureName() != portrait) {
        this['lbl_party' + i].setFillTextureName(portrait);
        TextureLoader.Load(portrait, texture => {
          this['lbl_party' + i].setFillTexture(texture);
          if (this.isSelectable(i)) {
            this['lbl_party' + i].getFill().material.uniforms.opacity.value = 1;
          } else {
            this['lbl_party' + i].getFill().material.uniforms.opacity.value = 0.5;
          }
        });
      } else {
        if (this.isSelectable(i)) {
          this['lbl_party' + i].getFill().material.uniforms.opacity.value = 1;
        } else {
          this['lbl_party' + i].getFill().material.uniforms.opacity.value = 0.5;
        }
      }
      this['lbl_party' + i].show();
    }
    this.UpdateSelection();
  }
  TextureLoader.LoadQueue(() => {
  });
  this.onCloseScript = undefined;
  if (this.scriptName != '' || this.scriptName != null) {
    this.onCloseScript = await NWScript.Load(this.scriptName);
  }
}

canClose() {
  if (this.forceNPC1 > -1 || this.forceNPC2 > -1) {
    return false;
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

isSelectable(index) {
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
