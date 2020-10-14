/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenQuickPanel menu class.
 */

class CharGenQuickPanel extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'quickpnl',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.step1 = false;
        this.step2 = false;

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.LBL_1 = this.getControlByName('LBL_1');
        this.LBL_2 = this.getControlByName('LBL_2');
        this.LBL_3 = this.getControlByName('LBL_3');

        this.LBL_NUM1 = this.getControlByName('LBL_NUM1');
        this.LBL_NUM2 = this.getControlByName('LBL_NUM2');
        this.LBL_NUM3 = this.getControlByName('LBL_NUM3');

        this.BTN_STEPNAME1 = this.getControlByName('BTN_STEPNAME1');
        this.BTN_STEPNAME2 = this.getControlByName('BTN_STEPNAME2');
        this.BTN_STEPNAME3 = this.getControlByName('BTN_STEPNAME3');

        this.BTN_STEPNAME1.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenPortCust.Open();
        });

        this.BTN_STEPNAME2.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenName.Open();
        });

        this.BTN_STEPNAME3.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.player.equipment.ARMOR = undefined;
          Game.player.template.GetFieldByLabel('Equip_ItemList').ChildStructs = [];
          Game.LoadModule('end_m01aa');
        });

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.CharGenMain.Close();
          Game.CharGenMain.childMenu = Game.CharGenQuickOrCustom;
          Game.CharGenMain.Open();
        });

        this.BTN_BACK.reattach(this.tGuiPanel);

        this.tGuiPanel.offset.x = -180;
        this.tGuiPanel.offset.y = 85;
        this.RecalculatePosition();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    this.BTN_STEPNAME2.hide();
    this.LBL_2.hide();
    this.LBL_NUM2.hide();

    this.BTN_STEPNAME3.hide();
    this.LBL_3.hide();
    this.LBL_NUM3.hide();

    if(this.step1){
      this.BTN_STEPNAME2.show();
      this.LBL_2.show();
      this.LBL_NUM2.show();
    }

    if(this.step2){
      this.BTN_STEPNAME3.show();
      this.LBL_3.show();
      this.LBL_NUM3.show();
    }

  }

}

module.exports = CharGenQuickPanel;