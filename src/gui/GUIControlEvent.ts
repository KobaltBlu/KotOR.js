export class GUIControlEvent {
  propagate: boolean = true;
  
  constructor(){}

  stopPropagation(){
    this.propagate = false;
  }
}