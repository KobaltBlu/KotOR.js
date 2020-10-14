/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenAbilities menu class.
 */

class CharGenAbilities extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'abchrgen',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = CharGenAbilities;