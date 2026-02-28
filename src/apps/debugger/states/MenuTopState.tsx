import { IPCDataType, IPCMessageType, IPCMessageTypeDebug } from "../../../enums/server";
import { IPCMessage, IPCMessageParam } from "../../../server";
import { DebugApp } from "../DebugApp";
import { EngineDebugType } from "../../../enums/engine/EngineDebugType";
import { MenuTopItem } from "../MenuTopItem";


export class MenuTopState {

  static title: string = `KotOR Forge`;
  static items: MenuTopItem[] = [];
  
  static optionsItemExample: MenuTopItem;
  static optionDebugPathFinding: MenuTopItem;
  static optionDebugObjectLabels: MenuTopItem;

  static buildMenuItems(){

    //Debug Menu Item
    this.optionsItemExample = new MenuTopItem({
      name: `Options`
    });

    this.optionDebugPathFinding = new MenuTopItem({
      name: `Debug: Path Finding`,
      onClick: () => {
        const msg = new IPCMessage(IPCMessageType.Debug, IPCMessageTypeDebug.ToggleDebugState);
        msg.addParam(new IPCMessageParam(IPCDataType.STRING, EngineDebugType.PATH_FINDING));
        DebugApp.appState.sendMessage(msg.toBuffer());
      }
    });

    this.optionDebugObjectLabels = new MenuTopItem({
      name: `Debug: Object Labels`,
      onClick: () => {
        const msg = new IPCMessage(IPCMessageType.Debug, IPCMessageTypeDebug.ToggleDebugState);
        msg.addParam(new IPCMessageParam(IPCDataType.STRING, EngineDebugType.OBJECT_LABELS));
        DebugApp.appState.sendMessage(msg.toBuffer());
      }
    });

    this.optionsItemExample.items.push(
      this.optionDebugPathFinding,
      this.optionDebugObjectLabels
    );

    this.items.push(
      this.optionsItemExample
    )
  }

}

MenuTopState.buildMenuItems();
