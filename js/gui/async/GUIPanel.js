class GUIPanel extends GUIControl {
  
    constructor(control = null, parent = null){
      
      super(control, parent);
  
    }


    createControl(){

      

      return this.widget;

    }
  
  }