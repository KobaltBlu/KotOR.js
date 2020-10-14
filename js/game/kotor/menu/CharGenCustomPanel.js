/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenCustomPanel menu class.
 */

class CharGenCustomPanel extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'custpnl',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenMain.Close();
          Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
          Game.CharGenMain.Open();
        });

        this.BTN_STEPNAME1.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenPortCust.Open();
        });

        this.BTN_STEPNAME2.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenAbilities.Open();
        });

        this.BTN_STEPNAME3.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenSkills.Open();
        });

        this.BTN_STEPNAME4.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenFeats.Open();
        });

        this.BTN_STEPNAME5.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenName.Open();
        });

        this.tGuiPanel.offset.x = -180;
        this.tGuiPanel.offset.y = 85;
        this.RecalculatePosition();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = CharGenCustomPanel;