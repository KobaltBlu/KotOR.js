/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MainMovies menu class.
 */

class MainMovies extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'titlemovie',
      onLoad: () => {

        this.LBL_TITLE = this.getControlByName('LBL_TITLE');
        this.LB_MOVIES = this.getControlByName('LB_MOVIES');

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_BACK.onClick = (e) => {
          e.stopPropagation();
          Game.MainMenu.Show();
        }

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = MainMovies;