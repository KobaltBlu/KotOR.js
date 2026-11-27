import {
  IPCDataType,
  IPCMessageType,
  IPCMessageTypeDebug,
  IPCMessage,
  IPCMessageParam,
  EngineDebugType,
} from "@apps/debugger/KotOR";
import { DebugApp } from "@apps/debugger/DebugApp";
import { MenuTopItem } from "@apps/debugger/MenuTopItem";


export class MenuTopState {

  static title: string = `Dev Tools`;
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
