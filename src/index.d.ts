import * as fs from "fs";
import {electron} from "electron";

// Add data types to window.navigator ambiently for implicit use in the entire project. See https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types- for more info.
/// <reference types="user-agent-data-types" />

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
