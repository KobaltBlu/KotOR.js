/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIPanel class.
 */

class GUIPanel extends GUIControl {
  
  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);

  }


  createControl(){

    

    return this.widget;

  }

}