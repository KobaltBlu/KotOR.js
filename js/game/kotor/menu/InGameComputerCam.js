/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameComputerCam menu class.
 */

class InGameComputerCam extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      
    }, this.args);

    this.LoadMenu({
      name: 'computercamera',
      onLoad: () => {

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Open(cam_id = -1){
    super.Open();
    if(cam_id >= 0){
      Game.InGameDialog.SetPlaceableCamera(cam_id);
    }else{
      Game.currenCamera = Game.camera;
    }
  }

  Hide(){
    super.Hide();
    Game.currenCamera = Game.camera;
  }

}

module.exports = InGameComputerCam;