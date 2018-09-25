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

        this.BTN_STEPNAME1.onClick = (e) => {
          e.stopPropagation();
          Game.CharGenMain.Hide();
          Game.CharGenPortCust.Show();
        };

        this.BTN_STEPNAME2.onClick = (e) => {
          e.stopPropagation();
          Game.CharGenMain.Hide();
          Game.CharGenName.Show();
        };


        this.BTN_BACK.onClick = (e) => {

          e.stopPropagation();
          Game.CharGenQuickOrCustom.Show();

        };

        this.BTN_BACK.reattach(this.tGuiPanel);

        this.LBL_NUM1.reattach(this.LBL_1);
        this.LBL_NUM2.reattach(this.LBL_2);
        this.LBL_NUM3.reattach(this.LBL_3);

        //this.LBL_NUM1.widget.text.children[0].children[0].renderOrder = 5;
        //this.LBL_NUM2.widget.text.children[0].children[0].renderOrder = 5;
        //this.LBL_NUM3.widget.text.children[0].children[0].renderOrder = 5;

        this.tGuiPanel.offset.x = 138;
        this.tGuiPanel.offset.y = 13;
        this.RecalculatePosition();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){

    let panelQuickorCustom = Game.CharGenQuickOrCustom.tGuiPanel.getControl();
    Game.scene_gui.remove(panelQuickorCustom);
    //Game.scene_gui.add(panelQuickorCustom);

    let panelQuick = Game.CharGenQuickPanel.tGuiPanel.getControl();
    Game.scene_gui.add(panelQuick);

  }

  Hide(){
    
  }

}

module.exports = CharGenQuickPanel;