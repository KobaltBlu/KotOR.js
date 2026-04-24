import * as fs from 'fs';

import { electron } from 'electron';

// Add data types to window.navigator ambiently for implicit use in the entire project. See https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types- for more info.
/// <reference types="user-agent-data-types" />

export {};

declare module '*.html' {
  const content: string;
  export default content;
}

interface ApplicationProfile {
  key?: string;
  name?: string;
  [key: string]: unknown;
}

interface ElectronContextBridge {
  isMac: () => boolean;
  minimize: (profile?: ApplicationProfile) => Promise<void>;
  maximize: (profile?: ApplicationProfile) => Promise<void>;
  locate_game_directory: (profile: ApplicationProfile) => Promise<string>;
  launchProfile: (profile: ApplicationProfile) => Promise<void>;
}

interface DialogContextBridge extends Electron.Dialog {
  locateDirectoryDialog: (profile?: ApplicationProfile) => Promise<string>;
}

declare global {
  interface String {
    titleCase(): string;
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

// three@0.149 exports mergeBufferGeometries; @types/three still declares mergeGeometries.
// Augment the module so TypeScript accepts the actual export name.
declare module 'three/examples/jsm/utils/BufferGeometryUtils' {
  import type { BufferGeometry } from 'three';
  export function mergeBufferGeometries(geometries: BufferGeometry[], useGroups?: boolean): BufferGeometry;
}
declare module 'three/examples/jsm/utils/BufferGeometryUtils.js' {
  import type { BufferGeometry } from 'three';
  export function mergeBufferGeometries(geometries: BufferGeometry[], useGroups?: boolean): BufferGeometry;
}
