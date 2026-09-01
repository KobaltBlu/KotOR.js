import { GameState } from "@/GameState";
import type { INIConfig } from "@/engine/INIConfig";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { EngineMode } from "@/enums/engine/EngineMode";
import { EngineState } from "@/enums/engine/EngineState";
import { AudioEngine } from "@/audio/AudioEngine";
import { SoundMode } from "@/enums/audio/SoundMode";

/**
 * AutoPauseManager class.
 *
 * Retail client auto-pause + manual combat-pause (SetPausedByCombat reason 4).
 * Pause banner text comes from InGamePause.setPauseReason (GUI).
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

  static AutoPaused: boolean = false;
  static CurrentReason: AutoPauseState = AutoPauseState.Generic;
  static partyKilledCooldownUntil: number = 0;
  static enemySightedLatchUntil: number = 0;

  static onPauseStateChange: Function;

  static Init(){
    this.AutoPauseEnabled.Generic = true;
    this.AutoPauseEnabled.CombatRoundEnd = this.INIConfig.getProperty('Autopause Options.End Of Combat Round') == 1
    this.AutoPauseEnabled.EnemySighted = this.INIConfig.getProperty('Autopause Options.Enemy Sighted') == 1
    this.AutoPauseEnabled.MineSighted = this.INIConfig.getProperty('Autopause Options.Mine Sighted') == 1
    this.AutoPauseEnabled.PartyMemberKilled = this.INIConfig.getProperty('Autopause Options.Party Killed') == 1
    this.AutoPauseEnabled.ActionMenuUsed = this.INIConfig.getProperty('Autopause Options.Action Menu') == 1
    this.AutoPauseEnabled.NewTargetSelected = this.INIConfig.getProperty('Autopause Options.New Target Selected') == 1

    this.AutoPaused = false;
    this.CurrentReason = AutoPauseState.Generic;
    this.partyKilledCooldownUntil = 0;
    this.enemySightedLatchUntil = 0;
  }

  /**
   * Retail reasons that open the pause / pause_p panel via SetPaused.
   * Generic (0) does not enter that switch in retail.
   */
  static ShowsPauseOverlay(reason: AutoPauseState | number): boolean {
    switch(reason as number){
      case AutoPauseState.EnemySighted:
      case AutoPauseState.Manual:
      case AutoPauseState.CombatRoundEnd:
      case AutoPauseState.ActionMenuUsed:
      case AutoPauseState.NewTargetSelected:
      case AutoPauseState.PartyMemberKilled:
      case AutoPauseState.UnusedReason10:
      case AutoPauseState.MineSighted:
        return true;
      default:
        return false;
    }
  }

  /**
   * Retail OnPauseButtonPressed / pause key: toggle SetPausedByCombat(..., 4),
   * then clear auto-pause if set.
   */
  static ToggleManualPause(){
    const wasPaused = GameState.State == EngineState.PAUSED;
    this.SetPausedByCombat(!wasPaused, AutoPauseState.Manual);
    if(this.AutoPaused){
      this.AutoPaused = false;
      if(GameState.State == EngineState.RUNNING){
        this.CurrentReason = AutoPauseState.Generic;
      }
    }
  }

  /**
   * Retail SetPausedByCombat — manual/combat pause with a reason byte (default 4).
   * Does not set the auto-pause bit.
   */
  static SetPausedByCombat(paused: boolean, reason: AutoPauseState = AutoPauseState.Manual){
    if(paused){
      if(GameState.State == EngineState.PAUSED) return;
      this.CurrentReason = reason;
      GameState.State = EngineState.PAUSED;
      // Retail SetPausedByCombat(1) → SetSoundMode(2) — SFX pause, music stays.
      AudioEngine.SetSoundMode(SoundMode.PAUSE, 0);
      GameState.MenuManager?.InGamePause?.setPauseReason(reason);
      if(typeof this.onPauseStateChange === 'function'){
        this.onPauseStateChange(reason);
      }
    }else{
      this.Unpause();
    }
  }

  static SignalAutoPauseEvent(type: AutoPauseState){
    if(!this.GetAutoPauseTypeEnabled(type)) return false;
    if(GameState.State == EngineState.PAUSED) return false;
    if(type != AutoPauseState.Generic && GameState.Mode != EngineMode.INGAME) return false;

    const player = GameState.getCurrentPlayer?.();
    const inCombat = !!player?.combatData?.combatState;
    if(
      (type == AutoPauseState.EnemySighted || type == AutoPauseState.MineSighted) &&
      inCombat
    ){
      return false;
    }
    if(type == AutoPauseState.NewTargetSelected && !inCombat) return false;

    if(
      type == AutoPauseState.EnemySighted &&
      Date.now() < this.enemySightedLatchUntil
    ){
      return false;
    }
    if(type == AutoPauseState.PartyMemberKilled){
      const now = Date.now();
      if(now < this.partyKilledCooldownUntil) return false;
      this.partyKilledCooldownUntil = now + 2000;
    }

    this.AutoPaused = true;
    this.CurrentReason = type;
    if(type == AutoPauseState.EnemySighted){
      this.enemySightedLatchUntil = Date.now() + 10000;
    }
    GameState.State = EngineState.PAUSED;
    // Retail SetPausedByCombat(1) → SetSoundMode(2) — SFX pause, music stays (GetPauseable).
    AudioEngine.SetSoundMode(SoundMode.PAUSE, 0);
    GameState.MenuManager?.InGamePause?.setPauseReason(type);

    if(typeof this.onPauseStateChange === 'function'){
      this.onPauseStateChange(type);
    }

    return true;
  }

  /** Retail enemy-sighted latch stays armed while the hostile remains visible. */
  static RefreshEnemySightedLatch(){
    if(this.enemySightedLatchUntil > 0){
      this.enemySightedLatchUntil = Date.now() + 10000;
    }
  }

  static Unpause(){
    this.AutoPaused = false;
    this.CurrentReason = AutoPauseState.Generic;
    GameState.State = EngineState.RUNNING;
    // Retail SetPausedByCombat(0) → SetSoundMode(0)
    if(AudioEngine.GetSoundMode() === SoundMode.PAUSE){
      AudioEngine.SetSoundMode(SoundMode.POP, 0);
    }
  }

  static GetAutoPauseTypeEnabled(type: AutoPauseState){
    if(type == AutoPauseState.Generic) return true;
    // Manual combat pause is always allowed (not an Autopause Options bit).
    if(type == AutoPauseState.Manual) return true;

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
