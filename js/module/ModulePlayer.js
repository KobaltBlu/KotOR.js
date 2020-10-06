/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePlayer class.
 * My research indicates that some things like health are handled differently between Players and Creatures
 * PartyMembers seems to work like creatures.
 * This class should only be used for the player
 */

class ModulePlayer extends ModuleCreature {

  constructor ( gff = new GFFObject() ) {
    super(gff);
  }

  setHP(nAmount = 0){
    this.currentHitPoints = nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  addHP(nAmount = 0){
    this.currentHitPoints -= nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  subtractHP(nAmount = 0){
    this.currentHitPoints += nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  getHP(){
    return this.maxHitPoints - this.currentHitPoints;
  }

  getMaxHP(){
    return this.maxHitPoints;
  }

  setMaxHP(nAmount = 0){
    return this.maxHitPoints = nAmount;
  }

  setMinOneHP(bMinOneHP = false){
    this.min1HP = bMinOneHP ? true : false;
  }  

}

module.exports = ModulePlayer;