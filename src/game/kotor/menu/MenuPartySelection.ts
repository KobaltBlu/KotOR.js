import { GameState } from "@/GameState";
import { GameMenu, GUIControl } from "@/gui";
import type { GUILabel, GUIButton, GUICheckBox } from "@/gui";
import { TextureLoader } from "@/loaders";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";

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
      for (let i = 0; i < GameState.PartyManager.MaxPartyCount; i++) {
        const button = this.getControlByName(`BTN_NPC${i}`) as GUICheckBox;
        if (!button) {
          continue;
        }

        button.addEventListener('click', (e) => {
          e.stopPropagation();
          if(GameState.PartyManager.IsAvailable(i)){
            this.selectNPC(i);
          }
        });
      }

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

        if(this.selectedNPC < 0 || !this.isAvailable(this.selectedNPC)){
          this.updateSelection();
          return false;
        }

        if(GameState.PartyManager.IsNPCInParty(this.selectedNPC) && !this.canRemove(this.selectedNPC)){
          console.warn(`MenuPartySelection:RemoveNPC`, `Cannot remove a required party member ${this.selectedNPC}`);
          this.updateSelection();
          return false;
        }

        //Area Unescapable disables party selection as well as transit
        if(!GameState.module.area.unescapable || this.ignoreUnescapable){
          if(GameState.PartyManager.IsNPCInParty(this.selectedNPC)){
            GameState.PartyManager.RemoveNPCById(this.selectedNPC);
            this.updateSelection();
            this.updateCount();
          }else if(this.canAdd(this.selectedNPC)){
            void this.addToParty(this.selectedNPC);
          }else{
            this.updateSelection();
          }
        }

      });
      resolve();
    });
  }

  /**
   * Hides the menu.
   */
  hide() {
    super.hide();
    this.ignoreUnescapable = false;
    this.userCanClose = true;
  }

  /**
   * Opens the menu.
   * @param scriptName - The name of the script to run on close.
   * @param forceNPC1 - The ID of the first NPC to force.
   * @param forceNPC2 - The ID of the second NPC to force.
   */
  open(scriptName = '', forceNPC1 = -1, forceNPC2 = -1) {
    this.scriptName = scriptName;
    this.forceNPC1 = forceNPC1;
    this.forceNPC2 = forceNPC2;
    super.open();
  }

  /**
   * Shows the menu.
   */
  async show() {
    super.show();
    if (this.forceNPC1 > -1)
      await this.addToParty(this.forceNPC1);
    if (this.forceNPC2 > -1)
      await this.addToParty(this.forceNPC2);

    const selectionRequired = this.forceNPC1 > -1 || this.forceNPC2 > -1;

    this.selectedNPC = this.getDefaultSelectedNPC();
    this.updateCount();

    await this.initPortraits();
    this.updateSelection();

    this.userCanClose = !selectionRequired;
    if(this.userCanClose){
      this.BTN_BACK.show();
    }else{
      this.BTN_BACK.hide();
    }
    TextureLoader.LoadQueue();
    this.onCloseScript = this.scriptName ? NWScript.Load(this.scriptName) : undefined;
  }

  /**
   * Selects the NPC.
   * @param npcId - The ID of the NPC.
   */
  selectNPC(npcId: number = -1){
    if(npcId < 0 || npcId >= GameState.PartyManager.MaxPartyCount) return;
    if(!GameState.PartyManager.IsAvailable(npcId)) return;

    this.selectedNPC = npcId;
    this.updateSelection();
  }

  /**
   * Checks if the NPC is required.
   * @param npcId - The ID of the NPC.
   * @returns boolean
   */
  isNPCRequired(npcId: number = -1){
    if(npcId < 0 || npcId >= GameState.PartyManager.MaxPartyCount) return false;
    return (this.forceNPC1 == npcId || this.forceNPC2 == npcId);
  }

  /**
   * Adds the NPC to the party.
   * @param npcId - The ID of the NPC.
   */
  async addToParty(npcId: number) {
    await GameState.PartyManager.AddNPCById(npcId);
    this.updateCount();
    this.updateSelection();
  }

  getDefaultSelectedNPC() {
    if (this.selectedNPC > -1 && this.isAvailable(this.selectedNPC)) {
      return this.selectedNPC;
    }

    if (this.forceNPC1 > -1 && this.isAvailable(this.forceNPC1)) {
      return this.forceNPC1;
    }

    if (this.forceNPC2 > -1 && this.isAvailable(this.forceNPC2)) {
      return this.forceNPC2;
    }

    for (let i = 0; i < GameState.PartyManager.CurrentMembers.length; i++) {
      const memberID = GameState.PartyManager.CurrentMembers[i]?.memberID ?? -1;
      if (this.isAvailable(memberID)) {
        return memberID;
      }
    }

    for (let i = 0; i < GameState.PartyManager.MaxPartyCount; i++) {
      if (this.isAvailable(i)) {
        return i;
      }
    }

    return -1;
  }

  getNPCTemplate(npcId: number = -1) {
    if (npcId < 0 || npcId >= GameState.PartyManager.MaxPartyCount) {
      return undefined;
    }

    return GameState.PartyManager.NPCS[npcId]?.moduleObject?.template || GameState.PartyManager.NPCS[npcId]?.template;
  }

  getNPCName(npcId: number = -1) {
    const template = this.getNPCTemplate(npcId);
    if (!template?.RootNode?.hasField('FirstName')) {
      return '';
    }

    try {
      return template.RootNode.getFieldByLabel('FirstName')?.getValue() || '';
    } catch (e: any) {
      return '';
    }
  }

  getNPCLevel(npcId: number = -1) {
    const template = this.getNPCTemplate(npcId);
    if (!template?.RootNode?.hasField('ClassList')) {
      return 0;
    }

    const classList = template.RootNode.getFieldByLabel('ClassList')?.getChildStructs() || [];
    let totalLevel = 0;
    for (let i = 0; i < classList.length; i++) {
      totalLevel += classList[i]?.getFieldByLabel('ClassLevel')?.getValue() || 0;
    }
    return totalLevel;
  }

  /**
   * Gets the index of the selected NPC.
   * @param npcId - The ID of the NPC.
   * @returns numberumber
   */
  indexOfSelectedNPC(npcId: number) {
    for (let i = 0; i < GameState.PartyManager.CurrentMembers.length; i++) {
      let cpm = GameState.PartyManager.CurrentMembers[i];
      if (cpm.memberID == npcId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Updates the selection of the NPC.
   */
  updateSelection() {
    for (let i = 0; i < GameState.PartyManager.MaxPartyCount; i++) {
      const btn = this.getControlByName('BTN_NPC' + i) as GUICheckBox;
      if (!btn) {
        continue;
      }

      const isAvailable = GameState.PartyManager.IsAvailable(i);
      const isInParty = GameState.PartyManager.IsNPCInParty(i);
      const isSelected = i == this.selectedNPC;

      if (isInParty) {
        btn.setHighlightColor(0, 1, 0);
      } else {
        btn.setHighlightColor(1, 1, 0);
      }

      btn.disableSelection = !isAvailable;
      btn.disableBorder();
      btn.disableHighlight();
      btn.selected = isSelected;
      btn.pulsing = isSelected;

      if (btn.value != (isInParty ? 1 : 0)) {
        btn.setValue(isInParty);
      } else {
        btn.updateCBVisualState();
      }

      if (isSelected) {
        btn.enableHighlight();
      }
    }

    this.updateSelectedNPCInfo();

    if (this.selectedNPC < 0 || !this.isAvailable(this.selectedNPC)) {
      this.BTN_ACCEPT.hide();
      return;
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
    if(this.selectedNPC == this.forceNPC1 || this.selectedNPC == this.forceNPC2){  
      this.BTN_ACCEPT.hide();
    }
  }

  /**
   * Gets the count of the current members.
   * @returns number
   */
  getCurrentMemberCount() {
    return GameState.PartyManager.CurrentMembers.length;
  }

  /**
   * Updates the count of the current members.
   */
  updateCount() {
    this.LBL_COUNT.setText((GameState.PartyManager.MaxNPCCount - GameState.PartyManager.CurrentMembers.length).toString());
  }

  async initPortraits() {
    let LBL_CHAR: GUIControl;
    let LBL_NA: GUIControl;
    for (let i = 0; i < GameState.PartyManager.MaxPartyCount; i++) {
      LBL_CHAR = this.getControlByName('LBL_CHAR' + i);
      LBL_NA = this.getControlByName('LBL_NA' + i);
      LBL_CHAR.hide();
      LBL_NA.show();
      if (!GameState.PartyManager.IsAvailable(i)) {
        continue;
      }
      LBL_NA.hide();
      let portrait = GameState.PartyManager.GetPortraitByIndex(i);
      if (LBL_CHAR.getFillTextureName() != portrait && !!portrait) {
        LBL_CHAR.setFillTextureName(portrait);
        const texture = await TextureLoader.Load(portrait);
        if(texture)LBL_CHAR.setFillTexture(texture);
      }
      (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = this.isSelectable(i) ? 1 : 0.5;
      LBL_CHAR.show();
    }
  }

  /**
   * Checks if the menu can remove the selected NPC.
   * @returns boolean
   */
  canRemove(npcId: number = -1): boolean {
    if (npcId < 0 || npcId >= GameState.PartyManager.MaxPartyCount) {
      return false;
    }

    return GameState.PartyManager.IsNPCInParty(npcId) && !this.isNPCRequired(npcId);
  }

  /**
   * Checks if the menu can add the selected NPC.
   * @returns boolean
   */
  canAdd(npcId: number = -1): boolean {
    if (npcId < 0 || npcId >= GameState.PartyManager.MaxPartyCount) {
      return false;
    }

    return !GameState.PartyManager.IsNPCInParty(npcId) &&
      !this.isNPCRequired(npcId) &&
      this.isSelectable(npcId) &&
      GameState.PartyManager.CurrentMembers.length < GameState.PartyManager.MaxNPCCount;
  }

  updateSelectedNPCInfo() {
    if (this.selectedNPC < 0 || !this.isAvailable(this.selectedNPC)) {
      this.LBL_NPC_NAME.setText('');
      this.LBL_NPC_LEVEL.setText('');
      return;
    }

    this.LBL_NPC_NAME.setText(this.getNPCName(this.selectedNPC));

    const level = this.getNPCLevel(this.selectedNPC);
    this.LBL_NPC_LEVEL.setText(level > 0 ? level.toString() : '');
  }

  /**
   * Checks if the menu can be closed.
   * @returns boolean
   */
  canClose() {
    if (this.forceNPC1 > -1 || this.forceNPC2 > -1) {
      const force1 = this.forceNPC1 == -1 || ( !!GameState.PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC1 ) );
      const force2 = this.forceNPC2 == -1 || ( !!GameState.PartyManager.CurrentMembers.find( (cm) => cm.memberID == this.forceNPC2 ) );
      return (force1 && force2);
    }
    return true;
  }

  /**
   * Checks if the menu can accept the selected NPC.
   * @returns boolean
   */
  canAccept() {
    if (this.forceNPC1 > -1 && this.forceNPC2 > -1 && this.getCurrentMemberCount() < 2) {
      return false;
    } else if ((this.forceNPC1 > -1 || this.forceNPC2 > -1) && this.getCurrentMemberCount() < 1) {
      return false;
    }
    return true;
  }

  /**
   * Checks if the menu can add the selected NPC.
   * @returns boolean
   */
  isAvailable(npcId: number = -1): boolean {
    return GameState.PartyManager.IsAvailable(npcId);
  }

  /**
   * Checks if the menu can select the selected NPC.
   * @returns boolean
   */
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
