/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuMessages menu class.
 */

class MenuMessages extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'messages',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });
        this._button_b = this.BTN_EXIT;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    Game.MenuTop.LBLH_MSG.onHoverIn();
    Game.MenuActive = true;

  }

  triggerControllerBumperLPress(){
    Game.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress(){
    Game.MenuTop.BTN_JOU.click();
  }

}

module.exports = MenuMessages;