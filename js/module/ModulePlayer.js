/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePlayer class.
 */

class ModulePlayer extends ModuleCreature {

  constructor ( gff = new GFFObject() ) {
    super(gff);
  }

  update(delta){
    super.update(delta);
  }

}

module.exports = ModulePlayer;