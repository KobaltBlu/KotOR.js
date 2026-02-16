import React from "react";
import { TabDiffTool } from "../../components/tabs/tab-diff-tool/TabDiffTool";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";

export class TabDiffToolState extends TabState {
  tabName: string = 'Diff Tool';

  leftPath: string = '';
  rightPath: string = '';
  leftBuffer?: Uint8Array;
  rightBuffer?: Uint8Array;
  leftResRef: string = '';
  rightResRef: string = '';
  leftExt: string = '';
  rightExt: string = '';

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.singleInstance = true; // Only one diff tool tab at a time
    this.setContentView(<TabDiffTool tab={this}></TabDiffTool>);
  }

  setLeftResource(path: string, buffer: Uint8Array, resref: string, ext: string) {
    this.leftPath = path;
    this.leftBuffer = buffer;
    this.leftResRef = resref;
    this.leftExt = ext;
    this.processEventListener('onLeftResourceChange', [path, buffer, resref, ext]);
  }

  setRightResource(path: string, buffer: Uint8Array, resref: string, ext: string) {
    this.rightPath = path;
    this.rightBuffer = buffer;
    this.rightResRef = resref;
    this.rightExt = ext;
    this.processEventListener('onRightResourceChange', [path, buffer, resref, ext]);
  }

  clearLeft() {
    this.leftPath = '';
    this.leftBuffer = undefined;
    this.leftResRef = '';
    this.leftExt = '';
    this.processEventListener('onLeftResourceChange', ['', undefined, '', '']);
  }

  clearRight() {
    this.rightPath = '';
    this.rightBuffer = undefined;
    this.rightResRef = '';
    this.rightExt = '';
    this.processEventListener('onRightResourceChange', ['', undefined, '', '']);
  }
}
