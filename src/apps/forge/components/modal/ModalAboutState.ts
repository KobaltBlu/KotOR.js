/**
 * Show/hide events for the About dialog (project, author, repository, game install).
 *
 * @file ModalAboutState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class ModalAboutState {

  static eventListeners: { onShow: Function[]; onHide: Function[] } = {
    onShow: [],
    onHide: [],
  };

  static AddEventListener(type: "onShow" | "onHide", cb: Function){
    const ev = ModalAboutState.eventListeners[type];
    if(ev.indexOf(cb) === -1){
      ev.push(cb);
    }
  }

  static RemoveEventListener(type: "onShow" | "onHide", cb: Function){
    const ev = ModalAboutState.eventListeners[type];
    const index = ev.indexOf(cb);
    if(index >= 0){
      ev.splice(index, 1);
    }
  }

  static Show() {
    ModalAboutState.eventListeners.onShow.forEach((cb) => cb());
  }

  static Hide() {
    ModalAboutState.eventListeners.onHide.forEach((cb) => cb());
  }
}
