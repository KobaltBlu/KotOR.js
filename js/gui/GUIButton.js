/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIButton class.
 */

class GUIButton extends GUIControl {
  
  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);
    //this.widget.position.z = -2; 
  }

  onHoverIn(){
    super.onHoverIn();
    this.hideBorder();

    this.pulsing = true;
    this.text.color.set(this.defaultHighlightColor);
    this.text.material.color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

  onHoverOut(){
    super.onHoverOut();
    this.showBorder();

    this.pulsing = false;
    this.text.color.set(this.defaultColor);
    this.text.material.color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

}

module.exports = GUIButton;