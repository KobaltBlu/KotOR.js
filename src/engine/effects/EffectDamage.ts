import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";
import {
  damageFlagsFromChannels,
  mitigateDamageAmount,
  sumDamageChannels,
} from "@engine/combat/damage-mitigation";
import { applyPartyDifficultyDamage } from "@engine/combat/diff-settings";
import { GameState } from "@engine/runtime/GameState";
import { BitWise } from "@core/utility/BitWise";

/**
 * EffectDamage class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * onApply
 *
 * @file EffectDamage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamage extends GameEffect {
  /** Resolved HP loss after mitigation (set in onApply). */
  resolvedDamage = 0;

  constructor(){
    super();
    this.type = GameEffectType.EffectDamage;

    this.setNumIntegers(21);
    this.intList.fill(-1, 0, 15);

    // intList[0..14] : typed damage channels (DamageType index; -1 = unused)
    // intList[15] : unused / reserved
    // intList[16] : pause / anim timing (ms)
    // intList[17] : Damage Type flags (DAMAGE_TYPE_*)
    // intList[18] : Damage Power (DAMAGE_POWER_*)
    // intList[19] : 1 = combat-packaged (already mitigated); 0 = run Immunity→Resist→DR
    // intList[20] : 1 = damage-shield sourced (skip ResolveDamageShields)
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleObject)){
      return;
    }

    const channels = this.getChannelArray();

    // Plot / immortal: zero damage (zeroes non-negative channels)
    if(this.object.plot){
      for(let i = 0; i < 15; i++){
        if(channels[i] >= 0) channels[i] = 0;
      }
      this.writeChannels(channels);
      this.resolvedDamage = 0;
      this.object.combatData.lastDamager = this.creator;
      this.object.combatData.lastAttacker = this.creator;
      this.object.assignHostileActor(this.creator);
      return;
    }

    // invulnerability cheat — party members only
    if(GameState.cheatInvulnerable && this.object.isPartyMember?.()){
      for(let i = 0; i < 15; i++){
        if(channels[i] >= 0) channels[i] = 0;
      }
      this.writeChannels(channels);
      this.resolvedDamage = 0;
      this.object.combatData.lastDamager = this.creator;
      this.object.combatData.lastAttacker = this.creator;
      this.object.assignHostileActor(this.creator);
      return;
    }

    const alreadyMitigated = this.getInt(19) === 1;
    // Combat-packaged: sum typed channels (already mitigated).
    // Script EffectDamage: mitigates using int[14] (also written beside the typed channel).
    let amount = alreadyMitigated
      ? sumDamageChannels(channels)
      : (this.getInt(14) >= 0 ? this.getInt(14) : sumDamageChannels(channels));

    if(!alreadyMitigated && amount > 0){
      let flags = this.getInt(17);
      if(!flags || flags < 0){
        flags = damageFlagsFromChannels(channels);
      }
      const power = Math.max(0, this.getInt(18) || 0);
      amount = mitigateDamageAmount(this.object, amount, flags, power);
      // Mirror : write resolved total into every positive channel for last-damage state
      for(let i = 0; i < 15; i++){
        if(channels[i] >= 0) channels[i] = amount;
      }
      this.writeChannels(channels);
    }

    amount = Math.min(Math.max(amount, 0), 10000);

    // Test knob: scale outgoing damage from the PC / party members.
    const scale = GameState.DEBUG_PC_DAMAGE_SCALE;
    if(scale !== 1 && scale >= 0 && this.creator && GameState.PartyManager?.party?.indexOf(this.creator as any) >= 0){
      amount = Math.floor(amount * scale);
    }

    // DoDamage — difficultyopt MULTIPLIER + DiffSettings MinHP1
    if(typeof (this.object as any)?.isPartyMember === 'function'){
      amount = applyPartyDifficultyDamage(this.object as any, amount);
    }

    this.resolvedDamage = amount;
    if(amount > 0){
      this.object.subtractHP(amount);
    }
    this.object.combatData.lastDamager = this.creator;
    this.object.combatData.lastAttacker = this.creator;
    this.object.assignHostileActor(this.creator);
    // GetLastDamageAmountByFlags / GetTotalDamageDealt state
    const lastDmg = this.object.combatData.lastDamageAmounts;
    if(lastDmg){
      for(let i = 0; i < 15; i++){
        lastDmg[i] = channels[i] >= 0 ? channels[i] : 0;
      }
    }

    // onApply schedules OnDamaged / door-placeable combat broadcast.
    // Door/placeable onDamaged handlers BroadcastCombatStateToParty(attacker, INVALID).
    if(amount > 0 && typeof this.object.onDamaged === 'function'){
      this.object.onDamaged();
    }
  }

  getChannelArray(): number[] {
    const channels: number[] = new Array(15);
    for(let i = 0; i < 15; i++){
      const v = this.getInt(i);
      channels[i] = (v === undefined || v === null) ? -1 : v;
    }
    return channels;
  }

  writeChannels(channels: number[]){
    for(let i = 0; i < 15; i++){
      this.setInt(i, channels[i]);
    }
  }

  getTypedDamageTotal(): number {
    return sumDamageChannels(this.getChannelArray());
  }

  getDamageAmount(){
    if(this.resolvedDamage > 0 || this.applied){
      return this.resolvedDamage;
    }
    const total = this.getTypedDamageTotal();
    if(total <= 0) return 0;
    return Math.min(Math.max(total, 1), 10000);
  }

  getDamageType(){
    return this.getInt(17);
  }

  getDamagePower(){
    return this.getInt(18);
  }

}
