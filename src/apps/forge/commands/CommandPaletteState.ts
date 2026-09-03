/**
 * Show/hide events for the Command Palette.
 *
 * @file CommandPaletteState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type CommandPaletteEventListenerTypes = "onShow" | "onHide" | "onToggle";

export class CommandPaletteState {

  static visible: boolean = false;
  static eventListeners: Record<CommandPaletteEventListenerTypes, Function[]> = {
    onShow: [],
    onHide: [],
    onToggle: [],
  };

  static AddEventListener(type: CommandPaletteEventListenerTypes, cb: Function){
    if(!Array.isArray(CommandPaletteState.eventListeners[type])){
      return;
    }
    const ev = CommandPaletteState.eventListeners[type];
    if(ev.indexOf(cb) === -1){
      ev.push(cb);
    }
  }

  static RemoveEventListener(type: CommandPaletteEventListenerTypes, cb: Function){
    const ev = CommandPaletteState.eventListeners[type];
    if(!Array.isArray(ev)){
      return;
    }
    const index = ev.indexOf(cb);
    if(index >= 0){
      ev.splice(index, 1);
    }
  }

  static TriggerEventListener(type: CommandPaletteEventListenerTypes, args: any[] = []){
    const ev = CommandPaletteState.eventListeners[type];
    if(!Array.isArray(ev)){
      return;
    }
    for(let i = 0; i < ev.length; i++){
      if(typeof ev[i] === "function"){
        ev[i](...args);
      }
    }
  }

  static Show() {
    CommandPaletteState.visible = true;
    CommandPaletteState.TriggerEventListener("onShow");
  }

  static Hide() {
    CommandPaletteState.visible = false;
    CommandPaletteState.TriggerEventListener("onHide");
  }

  static Toggle() {
    if(CommandPaletteState.visible){
      CommandPaletteState.Hide();
    }else{
      CommandPaletteState.Show();
    }
  }
}
