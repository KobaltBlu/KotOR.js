import { GUIControlEvent } from "./GUIControlEvent";

export class GUIControlEventFactory {

  static generateEventObject(): GUIControlEvent{
    return new GUIControlEvent();
  }

}