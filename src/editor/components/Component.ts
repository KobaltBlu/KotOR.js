import { EditorTab } from "../tabs";

export class Component {
  $component: JQuery<HTMLElement>;
  tab: EditorTab;

  constructor(){
    this.$component = $('<div class="forge-component" />');
  }

  attachTo($element: JQuery<HTMLElement>){
    if($element instanceof jQuery){
      $element.append(this.$component);
    }
  }

}