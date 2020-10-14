/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CharGenName menu class.
 */

class CharGenName extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';

    this.LoadMenu({
      name: 'name',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.BTN_BACK = this.getControlByName('BTN_BACK');
        this.END_BTN = this.getControlByName('END_BTN');

        this.NAME_BOX_EDIT = this.getControlByName('NAME_BOX_EDIT');

        this.NAME_BOX_EDIT.addEventListener('click', (e) => {
          e.stopPropagation();

        });

        this.NAME_BOX_EDIT.onKeyDown = (e) => {
          //e.stopPropagation();
          console.log(e);

          switch(e.which){
            case 8: //Backspace
              this.NAME_BOX_EDIT.setText(this.NAME_BOX_EDIT.text.text.slice(0, -1));
            break;
            case 32: //Spacebar
            this.NAME_BOX_EDIT.setText(
              this.NAME_BOX_EDIT.text.text + ' '
            );
            break;
            default:
              if(e.which >= 48 && e.which <= 90){
                if(e.shiftKey){
                  this.NAME_BOX_EDIT.setText(
                    this.NAME_BOX_EDIT.text.text + String.fromCharCode(e.which).toLocaleUpperCase()
                  );
                }else{
                  this.NAME_BOX_EDIT.setText(
                    this.NAME_BOX_EDIT.text.text + String.fromCharCode(e.which)
                  );
                }
              }
            break;
          }

        }

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.END_BTN.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.player.firstName = this.NAME_BOX_EDIT.text.text;
          Game.CharGenQuickPanel.step2 = true;
          this.Close();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    this.NAME_BOX_EDIT.setText(Game.player.firstName);
  }

}

module.exports = CharGenName;