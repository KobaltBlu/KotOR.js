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

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;

    /*Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    //Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/

  }

}

module.exports = MenuMessages;