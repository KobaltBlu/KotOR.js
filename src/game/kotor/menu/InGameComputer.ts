import { AudioLoader } from "../../../audio/AudioLoader";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";
import { ModuleObject } from "../../../module";
import type { ModuleCreature } from "../../../module/ModuleCreature";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGNode } from "../../../resource/DLGNode";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";
import { DLGCameraAngle } from "../../../enums/dialog/DLGCameraAngle";
import { AudioEngine } from "../../../audio/AudioEngine";
import { ConversationState } from "../../../enums/dialog/ConversationState";
import { SkillType } from "../../../enums/nwscript/SkillType";
import { BaseItemType } from "../../../enums/combat/BaseItemType";

/**
 * InGameComputer class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameComputer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameComputer extends GameMenu {

  LBL_STATIC1: GUILabel;
  LBL_STATIC3: GUILabel;
  LBL_STATIC4: GUILabel;
  LBL_STATIC2: GUILabel;
  LBL_REP_UNITS_ICON: GUILabel;
  LBL_COMP_SPIKES_ICON: GUILabel;
  LBL_REP_SKILL_ICON: GUILabel;
  LBL_COMP_SKILL_ICON: GUILabel;
  LBL_REP_UNITS: GUILabel;
  LBL_REP_SKILL: GUILabel;
  LBL_COMP_SPIKES: GUILabel;
  LB_REPLIES: GUIListBox;
  LBL_COMP_SKILL: GUILabel;
  LBL_COMP_SKILL_VAL: GUILabel;
  LBL_COMP_SPIKES_VAL: GUILabel;
  LBL_REP_SKILL_VAL: GUILabel;
  LBL_REP_UNITS_VAL: GUILabel;
  LB_MESSAGE: GUIListBox;
  LBL_OBSCURE: GUILabel;

  owner: ModuleObject;
  listener: ModuleObject;
  
  ended: boolean = false;

  dialog: DLGObject;
  currentEntry: DLGNode;
  startingEntry: DLGNode;

  isListening: boolean;
  state: number = 0;

  conversation_name: string = '';

  constructor(){
    super();
    this.gui_resref = 'computer';
    this.background = '1600x1200comp0';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MESSAGE.setTextColor(this.LB_MESSAGE.defaultColor.r, this.LB_MESSAGE.defaultColor.g, this.LB_MESSAGE.defaultColor.b);
      this.LB_REPLIES.setTextColor(this.LB_MESSAGE.defaultColor.r, this.LB_MESSAGE.defaultColor.g, this.LB_MESSAGE.defaultColor.b);
      this.LB_REPLIES.onSelected = (entry: DLGNode, control: any, index: number) => {
        GameState.CutsceneManager.selectReplyAtIndex(index);
      }
      resolve();
    });
  }

  show(){
    super.show();
    GameState.SetEngineMode(EngineMode.DIALOG);
    this.updateSkillDisplay();
  }

  /**
   * Update the skill / spike count labels shown in the computer UI.
   * Uses the party leader's Computer Use and Repair skill values, and
   * counts the Programming Spikes in the shared party inventory.
   */
  updateSkillDisplay(){
    const player = GameState.PartyManager.party[0] as ModuleCreature | undefined;

    // Computer Use skill (rank + INT modifier)
    const compSkill = player ? player.getSkillModifier(SkillType.COMPUTER_USE) : 0;
    this.LBL_COMP_SKILL_VAL?.setText(String(compSkill));

    // Repair skill (rank + INT modifier)
    const repSkill = player ? player.getSkillModifier(SkillType.REPAIR) : 0;
    this.LBL_REP_SKILL_VAL?.setText(String(repSkill));

    // Programming spikes in party inventory
    let spikeCount = 0;
    for(const item of GameState.InventoryManager.inventory){
      if(
        item.getBaseItemId() === BaseItemType.PROGRAMMING_SPIKES ||
        item.getBaseItemId() === BaseItemType.SECURITY_SPIKES
      ){
        spikeCount += item.getStackSize();
      }
    }
    this.LBL_COMP_SPIKES_VAL?.setText(String(spikeCount));

    // Repair units: scan for droid repair items
    let repairUnits = 0;
    for(const item of GameState.InventoryManager.inventory){
      if(item.getBaseItemId() === BaseItemType.DROID_REPAIR_EQUIPMENT){
        repairUnits += item.getStackSize();
      }
    }
    this.LBL_REP_UNITS_VAL?.setText(String(repairUnits));
  }

  setReplies(replies: DLGNode[]) {
    this.LB_REPLIES.clearItems();
    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i];
      if(reply.isContinueDialog()){ continue; }
      this.LB_REPLIES.addItem(this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString());
    }
    this.LB_REPLIES.updateList();
    this.LB_REPLIES.show();
  }

  setEntry(entry: DLGNode) {
    this.currentEntry = entry;
    this.LB_MESSAGE.clearItems();
    if (!!entry.getCompiledString()) {
      this.LB_MESSAGE.addItem(entry.getCompiledString());
    }
    this.LB_MESSAGE.updateList();
    this.LB_MESSAGE.show();
  }

  setDialogMode(state: ConversationState) {
    // if(state == ConversationState.LISTENING_TO_SPEAKER){
    //   this.LB_MESSAGE.show();
    //   this.LB_MESSAGE.clearItems();
    //   if (!!GameState.CutsceneManager.lastSpokenString) {
    //     this.LB_MESSAGE.addItem(GameState.CutsceneManager.lastSpokenString);
    //   }
    //   this.LB_MESSAGE.updateList();
    // }else{
    //   this.LB_MESSAGE.show();
    //   this.LB_MESSAGE.clearItems();
    //   this.LB_MESSAGE.updateList();
    // }
  }
  
}
