import { GameState } from "../GameState";
import { INIConfig } from "../INIConfig";
import { AutoPauseState } from "../enums/engine/AutoPauseState";
import { EngineState } from "../enums/engine/EngineState";

/**
 * AutoPauseManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AutoPauseManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AutoPauseManager {

  static INIConfig: INIConfig;

  static AutoPauseEnabled = {
    Generic: true,
    CombatRoundEnd: false,
    EnemySighted: false,
    MineSighted: false,
    PartyMemberKilled: false,
    ActionMenuUsed: false,
    NewTargetSelected: false,
  }

  static AutoPauseReason: Map<AutoPauseState, string> = new Map();
  static AutoPauseMessages: Map<AutoPauseState, string> = new Map();

  static onPauseStateChange: Function;

  static Init(){
    console.log('AutoPauseManager.Init', this.INIConfig.getProperty('Autopause Options.End Of Combat Round'))
    this.AutoPauseEnabled.Generic = true;
    this.AutoPauseEnabled.CombatRoundEnd = this.INIConfig.getProperty('Autopause Options.End Of Combat Round') == 1
    this.AutoPauseEnabled.EnemySighted = this.INIConfig.getProperty('Autopause Options.Enemy Sighted') == 1
    this.AutoPauseEnabled.MineSighted = this.INIConfig.getProperty('Autopause Options.Mine Sighted') == 1
    this.AutoPauseEnabled.PartyMemberKilled = this.INIConfig.getProperty('Autopause Options.Party Killed') == 1
    this.AutoPauseEnabled.ActionMenuUsed = this.INIConfig.getProperty('Autopause Options.Action Menu') == 1
    this.AutoPauseEnabled.NewTargetSelected = this.INIConfig.getProperty('Autopause Options.New Target Selected') == 1

    this.AutoPauseReason.set(AutoPauseState.Generic, GameState.TLKManager.GetStringById(1508)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.Generic, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.CombatRoundEnd, GameState.TLKManager.GetStringById(42432)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.CombatRoundEnd, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.EnemySighted, GameState.TLKManager.GetStringById(42396)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.EnemySighted, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.MineSighted, GameState.TLKManager.GetStringById(49116)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.MineSighted, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.PartyMemberKilled, GameState.TLKManager.GetStringById(42397)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.PartyMemberKilled, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.ActionMenuUsed, GameState.TLKManager.GetStringById(42482)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.ActionMenuUsed, GameState.TLKManager.GetStringById(48384)?.Value);
    
    this.AutoPauseReason.set(AutoPauseState.NewTargetSelected, GameState.TLKManager.GetStringById(42481)?.Value);
    this.AutoPauseMessages.set(AutoPauseState.NewTargetSelected, GameState.TLKManager.GetStringById(48384)?.Value);
  }

  static SignalAutoPauseEvent(type: AutoPauseState){
    if(!this.GetAutoPauseTypeEnabled(type)) return false;

    GameState.State = EngineState.PAUSED;
    GameState.MenuManager.InGamePause.LBL_PAUSEREASON.setText(this.AutoPauseReason.get(type));
    // MenuManager.InGamePause.LBL_PRESS.setText(this.AutoPauseMessages.get(type));

    if(typeof this.onPauseStateChange === 'function'){
      this.onPauseStateChange(type);
    }

    return true;
  }

  static Unpause(){
    GameState.State = EngineState.RUNNING;
  }

  static GetAutoPauseTypeEnabled(type: AutoPauseState){
    if(type == AutoPauseState.Generic) return true;

    switch(type){
      case AutoPauseState.CombatRoundEnd:
        return this.AutoPauseEnabled.CombatRoundEnd;
      case AutoPauseState.EnemySighted:
        return this.AutoPauseEnabled.EnemySighted;
      case AutoPauseState.MineSighted:
        return this.AutoPauseEnabled.MineSighted;
      case AutoPauseState.PartyMemberKilled:
        return this.AutoPauseEnabled.PartyMemberKilled;
      case AutoPauseState.ActionMenuUsed:
        return this.AutoPauseEnabled.ActionMenuUsed;
      case AutoPauseState.NewTargetSelected:
        return this.AutoPauseEnabled.NewTargetSelected;
    }
    return false;
  }

  static SetAutoPauseTypeEnabled(type: AutoPauseState, value: boolean){
    switch(type){
      case AutoPauseState.CombatRoundEnd:
        this.AutoPauseEnabled.CombatRoundEnd = value;
      break;
      case AutoPauseState.EnemySighted:
        this.AutoPauseEnabled.EnemySighted = value;
      break;
      case AutoPauseState.MineSighted:
        this.AutoPauseEnabled.MineSighted = value;
      break;
      case AutoPauseState.PartyMemberKilled:
        this.AutoPauseEnabled.PartyMemberKilled = value;
      break;
      case AutoPauseState.ActionMenuUsed:
        this.AutoPauseEnabled.ActionMenuUsed = value;
      break;
      case AutoPauseState.NewTargetSelected:
        this.AutoPauseEnabled.NewTargetSelected = value;
      break;
    }
  }

}