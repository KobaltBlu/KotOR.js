/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGamePause menu class.
 */

class InGamePause extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.LoadMenu({
      name: 'pause',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.LBL_PAUSEREASON = this.getControlByName('LBL_PAUSEREASON');
        this.LBL_PRESS = this.getControlByName('LBL_PRESS');
        this.BTN_UNPAUSE = this.getControlByName('BTN_UNPAUSE');

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    
    super.Show();

    this.tGuiPanel.pulsing = true;
    this.tGuiPanel.pulse = 1;
    this.tGuiPanel.resetPulse();

    this.LBL_PAUSEREASON.pulsing = true;
    this.LBL_PAUSEREASON.pulse = 1;
    this.LBL_PAUSEREASON.resetPulse();

    this.LBL_PRESS.pulsing = true;
    this.LBL_PRESS.pulse = 1;
    this.LBL_PRESS.resetPulse();

  }

  Update(delta){

    super.Update(delta);

    this.tGuiPanel.widget.position.x = (window.innerWidth/2) - (Game.InGamePause.width/2) - 20;
    this.tGuiPanel.widget.position.y = (window.innerHeight/2) - (Game.InGamePause.height/2) - 55;

  }

}

module.exports = InGamePause;