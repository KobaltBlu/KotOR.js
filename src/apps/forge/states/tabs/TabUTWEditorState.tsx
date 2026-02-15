import React from "react";
import * as THREE from 'three';

import { TabUTWEditor } from "@/apps/forge/components/tabs/tab-utw-editor/TabUTWEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabUTWEditorState extends TabState {
  tabName: string = `UTW`;
  waypoint: ForgeWaypoint = new ForgeWaypoint();

  get blueprint(): KotOR.GFFObject {
    return this.waypoint.blueprint;
  }

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabUTWEditorState constructor entry');
    super(options);

    this.setContentView(<TabUTWEditor tab={this}></TabUTWEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Waypoint Blueprint',
        accept: {
          'application/octet-stream': ['.utw']
        }
      }
    ];

    this.addEventListener('onTabRemoved', (_tab: TabState) => {});
    log.trace('TabUTWEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabUTWEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
        log.debug('TabUTWEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.waypoint = new ForgeWaypoint(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabUTWEditorState openFile loaded');
          resolve(this.blueprint);
        });
      } else {
        log.trace('TabUTWEditorState openFile no file');
      }
    });
  }

  show(): void {
    log.trace('TabUTWEditorState show');
    super.show();
  }

  hide(): void {
    log.trace('TabUTWEditorState hide');
    super.hide();
  }

  animate(delta: number = 0){
    // Waypoint editor has no continuous animation; override is for future 3D preview if needed.
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    log.trace('TabUTWEditorState getExportBuffer', resref, ext);
    if(!!resref && ext == 'utw'){
      this.waypoint.templateResRef = resref;
      this.updateFile();
      return this.waypoint.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    log.trace('TabUTWEditorState updateFile');
    this.waypoint.exportToBlueprint();
  }

}
