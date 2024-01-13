/**
 * CombatAttackDamage class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CombatAttackDamage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CombatAttackDamage {
  damageValue: number = -1;

  addDamage(amount: number = -1){
    if(amount <= 0) return;
    if(this.damageValue < 0) this.damageValue = 0;
    this.damageValue += amount;
  }

  setDamage(amount: number = -1){
    if(amount <= 0) return;
    if(this.damageValue < 0) this.damageValue = 0;
    this.damageValue = amount;
  }

  reset(){
    this.damageValue = -1;
  }
}