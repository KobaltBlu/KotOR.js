/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuJournal menu class.
 */

class MenuJournal extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'journal',
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
    Game.MenuTop.LBLH_JOU.onHoverIn();
    Game.MenuActive = true;
  }

  triggerControllerBumperLPress(){
    Game.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress(){
    Game.MenuTop.BTN_MAP.click();
  }

}

module.exports = MenuJournal;