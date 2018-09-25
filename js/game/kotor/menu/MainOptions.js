/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MainOptions menu class.
 */

class MainOptions extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'optionsmain',
      onLoad: () => {

        this.BTN_GAMEPLAY = this.getControlByName('BTN_GAMEPLAY');
        this.BTN_AUTOPAUSE = this.getControlByName('BTN_AUTOPAUSE');
        this.BTN_GRAPHICS = this.getControlByName('BTN_GRAPHICS');
        this.BTN_SOUND = this.getControlByName('BTN_SOUND');
        this.BTN_FEEDBACK = this.getControlByName('BTN_FEEDBACK');

        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_BACK.onClick = (e) => {
          e.stopPropagation();
          Game.MainMenu.Show();
        }

        this.BTN_GAMEPLAY.onClick = (e) => {
          e.stopPropagation();
        }

        this.BTN_AUTOPAUSE.onClick = (e) => {
          e.stopPropagation();
        }

        this.BTN_GRAPHICS.onClick = (e) => {
          e.stopPropagation();
          this.Hide();
          Game.MenuGraphics.Show();
        }

        this.BTN_SOUND.onClick = (e) => {
          e.stopPropagation();
          this.Hide();
          Game.MenuSound.Show();
        }

        this.BTN_FEEDBACK.onClick = (e) => {
          e.stopPropagation();
        }

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = MainOptions;