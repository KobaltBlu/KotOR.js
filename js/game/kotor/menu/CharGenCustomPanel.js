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
          Game.CharGenQuickOrCustom.Show();

        });

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

    let panelCustom = Game.CharGenCustomPanel.tGuiPanel.getControl();
    Game.scene_gui.add(panelCustom);

  }

  Hide(){
    
  }

}

module.exports = CharGenCustomPanel;