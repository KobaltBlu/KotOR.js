/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuJournal menu class.
 */

class MenuJournal extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'journal',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

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

module.exports = MenuJournal;