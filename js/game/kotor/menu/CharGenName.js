/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenName menu class.
 */

class CharGenName extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'name',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.BTN_BACK = this.getControlByName('BTN_BACK');
        this.END_BTN = this.getControlByName('END_BTN');

        this.NAME_BOX_EDIT = this.getControlByName('NAME_BOX_EDIT');
        this.NAME_BOX_EDIT.setEditable(true);

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.END_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.player.firstName = this.NAME_BOX_EDIT.getValue();
          Game.CharGenQuickPanel.step2 = true;
          this.Close();
        });

        Game.CharGenName.BTN_RANDOM.hide();

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    this.NAME_BOX_EDIT.setText(Game.player.firstName);
  }

}

module.exports = CharGenName;