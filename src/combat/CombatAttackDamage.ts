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