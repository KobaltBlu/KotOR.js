/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuAbilities menu class.
 */

class MenuAbilities extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'abilities',
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
    Game.MenuTop.LBLH_ABI.onHoverIn();
    Game.MenuActive = true;
  }

  triggerControllerBumperLPress(){
    Game.MenuTop.BTN_CHAR.click();
  }

  triggerControllerBumperRPress(){
    Game.MenuTop.BTN_MSG.click();
  }

}

module.exports = MenuAbilities;