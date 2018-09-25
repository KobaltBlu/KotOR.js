/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenQuickOrCustom menu class.
 */

class CharGenQuickOrCustom extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '';

    this.LoadMenu({
      name: 'qorcpnl',
      onLoad: () => {

        this.QUICK_CHAR_BTN = this.getControlByName('QUICK_CHAR_BTN');
        this.CUST_CHAR_BTN = this.getControlByName('CUST_CHAR_BTN');

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.QUICK_CHAR_BTN.onClick = (e) => {
          e.stopPropagation();
          Game.CharGenMain.state = CharGenMain.STATES.QUICK;
          Game.CharGenQuickPanel.Show();
        };

        this.CUST_CHAR_BTN.onClick = (e) => {
          e.stopPropagation();
          Game.CharGenMain.state = CharGenMain.STATES.CUSTOM;
          Game.CharGenCustomPanel.Show();
        };

        this.BTN_BACK.onClick = (e) => {
          e.stopPropagation();
          Game.CharGenMain.Hide();

          try{
            Game.player.model.parent.remove(Game.player.model);
          }catch(e){}

          Game.CharGenClass['_3D_MODEL'+(CharGenClass.SelectedClass+1)]._3dView.scene.add(Game.player.model);

          Game.CharGenClass.Show();
        };

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
    Game.scene_gui.add(panelQuickorCustom);

    let panelQuick = Game.CharGenQuickPanel.tGuiPanel.getControl();
    Game.scene_gui.remove(panelQuick);

    let panelCustom = Game.CharGenCustomPanel.tGuiPanel.getControl();
    Game.scene_gui.remove(panelCustom);
  }

  Hide(){

  }

}

module.exports = CharGenQuickOrCustom;