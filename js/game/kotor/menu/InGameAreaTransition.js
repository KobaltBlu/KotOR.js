/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameAreaTransition menu class.
 */

class InGameAreaTransition extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.LoadMenu({
      name: 'areatransition',
      onLoad: () => {

        this.LBL_DESCRIPTION = this.getControlByName('LBL_DESCRIPTION');

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  SetDescription(text=""){
    this.LBL_DESCRIPTION.setText(text);
  }

  Update(delta){

    super.Update(delta);

    for(let i = 0; i < Game.module.area.triggers.length; i++){
      let trig = Game.module.area.triggers[i];
      if(trig.getLinkedToModule() && trig.getTransitionDestin().length){
        let vec3 = new THREE.Vector3(trig.getXPosition(), trig.getYPosition(), trig.getZPosition());
        let distance = Game.getCurrentPlayer().position.distanceTo(vec3);
        if(distance < 5){
          this.Show(); //TransitionDestin
          //console.log(trig.getTransitionDestin())
          this.SetDescription(trig.getTransitionDestin());
          return;
        }
      }
    }

    for(let i = 0; i < Game.module.area.doors.length; i++){
      let door = Game.module.area.doors[i];
      if(!door.isOpen() && door.getLinkedToModule() && door.getTransitionDestin().length){
        let vec3 = new THREE.Vector3(door.getX(), door.getY(), door.getZ());
        let distance = Game.getCurrentPlayer().position.distanceTo(vec3);
        if(distance < 2){
          this.Show(); //TransitionDestin
          this.SetDescription(door.getTransitionDestin());
          return;
        }
      }
    }

    this.Hide();

  }

}

module.exports = InGameAreaTransition;