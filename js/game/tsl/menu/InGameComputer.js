/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameComputer menu class.
 */

class InGameComputer extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      compscreen: '1600x1200comp0',
    }, this.args);

    this.background = '';

    this.LoadMenu({
      name: 'computer_p',
      onLoad: () => {

        this.LB_MESSAGE = this.getControlByName('LB_MESSAGE');
        this.LB_REPLIES = this.getControlByName('LB_REPLIES');
        this.LBL_OBSCURE = this.getControlByName('LBL_OBSCURE');

        this.LBL_REP_UNITS_ICON = this.getControlByName('LBL_REP_UNITS_ICON');;
        this.LBL_COMP_SPIKES_ICON = this.getControlByName('LBL_COMP_SPIKES_ICON');;
        this.LBL_REP_SKILL_ICON = this.getControlByName('LBL_REP_SKILL_ICON');;
        this.LBL_COMP_SKILL_ICON = this.getControlByName('LBL_COMP_SKILL_ICON');;
        this.LBL_REP_UNITS = this.getControlByName('LBL_REP_UNITS');;
        this.LBL_REP_SKILL = this.getControlByName('LBL_REP_SKILL');;
        this.LBL_COMP_SPIKES = this.getControlByName('LBL_COMP_SPIKES');;
        this.LBL_COMP_SKILL = this.getControlByName('LBL_COMP_SKILL');;
        this.LBL_COMP_SKILL_VAL = this.getControlByName('LBL_COMP_SKILL_VAL');;
        this.LBL_COMP_SPIKES_VAL = this.getControlByName('LBL_COMP_SPIKES_VAL');;
        this.LBL_REP_SKILL_VAL = this.getControlByName('LBL_REP_SKILL_VAL');;
        this.LBL_REP_UNITS_VAL = this.getControlByName('LBL_REP_UNITS_VAL');;

        this.LB_MESSAGE.clearItems();

        /*this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
        this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
        this.LB_REPLIES.calculatePosition();
        this.LB_REPLIES.calculateBox();*/

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    //Game.InGameAreaTransition.Hide();
  }

}

module.exports = InGameComputer;