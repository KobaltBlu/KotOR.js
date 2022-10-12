/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePlayer class.
 */

export class ModulePlayer extends ModuleCreature {

  constructor ( gff = new GFFObject() ) {
    super(gff);
  }

  update(delta: number = 0){
    super.update(delta);
  }

  save(){
    let gff = super.save();


    PartyManager.Player = gff;
    this.template = gff;
    return gff;
  }

}
