import * as fs from "fs";
import {electron} from "electron";

export {};

declare module '*.html' {
  const content: string;
  export default content;
}

interface ElectronContextBridge {
  isMac: () => boolean;
  minimize: (profile?: any) => Promise<any>;
  maximize: (profile?: any) => Promise<any>;
  locate_game_directory: (profile: any) => Promise<string>;
  launchProfile: (profile: any) => Promise<any>;
}

interface DialogContextBridge extends Electron.Dialog {
  locateDirectoryDialog: (profile?: any) => Promise<string>
}

declare global {
  interface String {
    titleCase() : string;
    equalsIgnoreCase(value: string): boolean;
  }
}
declare global {
  interface Window { 
    electron: ElectronContextBridge;
    dialog: DialogContextBridge;
    fs: typeof fs;
  }
}
