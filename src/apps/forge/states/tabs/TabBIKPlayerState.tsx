import React from "react";
import { TabState } from "./TabState";
import { TabBIKPlayer } from "../../components/tabs/tab-bik-player/TabBIKPlayer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";

/**
 * Tab state for the BIK video player. Loads the opened EditorFile into a BIKObject
 * and plays from buffer via playFromBuffer(). The tab content view renders the
 * video to a canvas and provides play/stop controls.
 */
export class TabBIKPlayerState extends TabState {
  tabName: string = "BIK Video Player";
  bikObject: KotOR.BIKObject;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.isClosable = true;
    this.bikObject = new KotOR.BIKObject();
    this.setContentView(<TabBIKPlayer tab={this}></TabBIKPlayer>);
    this.openFile();
    if (this.file instanceof EditorFile) {
      this.tabName = this.file.getFilename();
    }
  }

  /**
   * Reads the current (or given) EditorFile and starts playback from its buffer via playFromBuffer().
   */
  openFile(file?: EditorFile) {
    return new Promise<void>((resolve, reject) => {
      const target = file ?? this.file;
      if (!(target instanceof EditorFile)) {
        resolve();
        return;
      }
      if (this.file !== target) this.file = target;
      target.readFile().then((response: { buffer: Uint8Array }) => {
        const buffer = response?.buffer;
        if (!buffer?.length) {
          reject(new Error("No buffer"));
          return;
        }
        const arrayBuffer = buffer.buffer instanceof ArrayBuffer ? buffer.buffer : buffer;
        this.bikObject.playFromBuffer(
          arrayBuffer as ArrayBuffer,
          () => {
            this.processEventListener("onEditorFileLoad");
          },
          () => {
            this.processEventListener("onEditorFileLoad");
          }
        );
        resolve();
      }).catch(reject);
    });
  }

  stop() {
    this.bikObject?.stop();
  }

  destroy() {
    this.bikObject?.dispose();
    super.destroy();
  }
}
