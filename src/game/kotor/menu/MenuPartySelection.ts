import { GameState } from "@/GameState";
import { GameMenu, GUIControl } from "@/gui";
import type { GUILabel, GUIButton, GUICheckBox } from "@/gui";
import { TextureLoader } from "@/loaders";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);
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
          log.warn(`MenuPartySelection:RemoveNPC`, `Cannot remove a required party member ${this.selectedNPC}`);
          return false;
        }

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
      resolve();
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

    this.selectedNPC = this.forceNPC1 > -1 ? this.forceNPC1 : this.forceNPC2 > -1 ? this.forceNPC2 : -1;
    this.updateSelection();
    this.updateCount();

    await this.initPortraits();
    this.updateSelection();
    if(selectionRequired){
      this.BTN_BACK.hide();
    }else{
      this.BTN_BACK.show();
    }
    TextureLoader.LoadQueue();
    this.onCloseScript = (this.scriptName != '' || this.scriptName != null) ? 
      NWScript.Load(this.scriptName) : undefined;
  }

  /**
   * Selects the NPC.
   * @param npcId - The ID of the NPC.
   */
  selectNPC(npcId: number = -1){
    if(npcId < 0 || npcId >= GameState.PartyManager.MaxNPCCount) return;
    // if(PartyManager.CurrentMembers.length >= 2) return;
    this.selectedNPC = npcId;
    this.updateSelection();
  }

  /**
   * Checks if the NPC is required.
   * @param npcId - The ID of the NPC.
   * @returns boolean
   */
  isNPCRequired(npcId: number = -1){
    if(npcId < 0 || npcId >= GameState.PartyManager.MaxNPCCount) return false;
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

  /**
   * Gets the index of the selected NPC.
   * @param npcId - The ID of the NPC.
   * @returns number
   */
  indexOfSelectedNPC(npcId: number) {
    for (let i = 0; i < GameState.PartyManager.CurrentMembers.length; i++) {
      const cpm = GameState.PartyManager.CurrentMembers[i];
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
      const btn = this.getControlByName('BTN_NPC' + i);
      if (GameState.PartyManager.IsNPCInParty(i)) {
        btn.setHighlightColor(0, 1, 0);
      } else {
        btn.setHighlightColor(1, 1, 0);
      }
      btn.disableBorder();
      btn.disableHighlight();
      btn.pulsing = false;
    }
    const btn = this.getControlByName('BTN_NPC' + this.selectedNPC);
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
      const portrait = GameState.PartyManager.GetPortraitByIndex(i);
      if (LBL_NA.getFillTextureName() != portrait && !!portrait) {
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
    return GameState.PartyManager.IsNPCInParty(npcId) && !this.isNPCRequired(npcId);
  }

  /**
   * Checks if the menu can add the selected NPC.
   * @returns boolean
   */
  canAdd(npcId: number = -1): boolean {
    return !GameState.PartyManager.IsNPCInParty(npcId) && !this.isNPCRequired(npcId) && this.isSelectable(npcId);
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
