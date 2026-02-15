import * as fs from "fs";

// Add data types to window.navigator ambiently for implicit use in the entire project. See https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types- for more info.
/// <reference types="user-agent-data-types" />

export {};

declare module '*.html' {
  const content: string;
  export default content;
}

/** Minimal profile shape used by the Electron context bridge (external API). */
interface ElectronProfile {
  key?: string;
  name?: string;
}

interface ElectronContextBridge {
  isMac: () => boolean;
  minimize: (profile?: ElectronProfile) => Promise<void>;
  maximize: (profile?: ElectronProfile) => Promise<void>;
  locate_game_directory: (profile: ElectronProfile) => Promise<string>;
  launchProfile: (profile: ElectronProfile) => Promise<void>;
}

interface DialogContextBridge {
  locateDirectoryDialog: (profile?: ElectronProfile) => Promise<string>;
  showOpenDialog?: (opts?: unknown) => Promise<{ filePaths?: string[]; canceled?: boolean }>;
  showSaveDialog?: (opts?: unknown) => Promise<{ filePath?: string; cancelled?: boolean }>;
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
    /** Launcher app (set by launcher index for dev/debug). */
    Launcher?: unknown;
    /** ConfigClient (set by launcher index for dev/debug). */
    ConfigClient?: unknown;
    /** Root render result (set by launcher index). */
    launcherView?: unknown;
    /** Node require (Electron renderer); only present in Electron context. */
    require?: NodeRequire;
  }
}
