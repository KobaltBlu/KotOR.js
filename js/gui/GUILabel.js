/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUILabel class.
 */

class GUILabel extends GUIControl {
  
  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);
    this.isEditable = false;

    this.onKeyDown = (e) => {
      //e.stopPropagation();
      console.log(e);

      switch(e.which){
        case 8: //Backspace
          this.setText( (this.getText().slice(0, -1)).substr(0, 16) );
        break;
        case 32: //Spacebar
        this.setText(
          (this.getText() + ' ').substr(0, 16)
        );
        break;
        default:
          if(e.which >= 48 && e.which <= 90){
            if(e.shiftKey){
              this.setText(
                (this.getText() + String.fromCharCode(e.which).toLocaleUpperCase()).substr(0, 16)
              );
            }else{
              this.setText(
                (this.getText() + String.fromCharCode(e.which).toLocaleLowerCase()).substr(0, 16)
              );
            }
          }
        break;
      }

    }

  }

  setEditable( state = false ){
    if(state){
      this.editable = true;
      this.addEventListener('click', GUILabel._defaultClickHandler);
    }else{
      this.editable = false;
      this.removeEventListener('click', GUILabel._defaultClickHandler);
    }
  }

  setText(str='', renderOrder = 5){

    if(this.isEditable){
      super.setText(str+'_', renderOrder);
    }else{
      super.setText(str, renderOrder);
    }

  }

  getText(){
    if(this.isEditable){
      if(this.text.text[this.text.text.length-1] == '_'){
        return this.text.text.substr(0, this.text.text.length-1);
      }
    }
    return this.text.text;
  }

  getValue(){
    return this.getText();
  }

}

GUILabel._defaultClickHandler = (e) => { e.stopPropagation(); };

module.exports = GUILabel;