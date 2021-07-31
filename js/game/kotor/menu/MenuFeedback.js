/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuFeedback menu class.
 */

class MenuFeedback extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = 'blackfill';
    this.voidFill = true;

    this.LoadMenu({
      name: 'optfeedback',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        /*this.BTN_MESSAGES = this.getControlByName('BTN_MESSAGES');

        this.BTN_MESSAGES.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuMessages.Show();
        });*/
        
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

  }

}

module.exports = MenuFeedback;