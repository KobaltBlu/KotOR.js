import React from "react";

import { TabDiffTool } from "@/apps/forge/components/tabs/tab-diff-tool/TabDiffTool";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

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
    log.trace('TabDiffToolState constructor entry');
    super(options);

    this.singleInstance = true;
    this.setContentView(<TabDiffTool tab={this}></TabDiffTool>);
    log.trace('TabDiffToolState constructor exit');
  }

  setLeftResource(path: string, buffer: Uint8Array, resref: string, ext: string) {
    log.trace('TabDiffToolState setLeftResource', resref, ext);
    this.leftPath = path;
    this.leftBuffer = buffer;
    this.leftResRef = resref;
    this.leftExt = ext;
    this.processEventListener('onLeftResourceChange', [path, buffer, resref, ext]);
  }

  setRightResource(path: string, buffer: Uint8Array, resref: string, ext: string) {
    log.trace('TabDiffToolState setRightResource', resref, ext);
    this.rightPath = path;
    this.rightBuffer = buffer;
    this.rightResRef = resref;
    this.rightExt = ext;
    this.processEventListener('onRightResourceChange', [path, buffer, resref, ext]);
  }

  clearLeft() {
    log.trace('TabDiffToolState clearLeft');
    this.leftPath = '';
    this.leftBuffer = undefined;
    this.leftResRef = '';
    this.leftExt = '';
    this.processEventListener('onLeftResourceChange', ['', undefined, '', '']);
  }

  clearRight() {
    log.trace('TabDiffToolState clearRight');
    this.rightPath = '';
    this.rightBuffer = undefined;
    this.rightResRef = '';
    this.rightExt = '';
    this.processEventListener('onRightResourceChange', ['', undefined, '', '']);
  }
}
