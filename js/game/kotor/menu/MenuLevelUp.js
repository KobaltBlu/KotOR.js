/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuLevelUp menu class.
 */

class MenuLevelUp extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'leveluppnl',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = MenuLevelUp;