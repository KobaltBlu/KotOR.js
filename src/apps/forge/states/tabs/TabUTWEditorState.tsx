import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTWEditor } from "../../components/tabs/tab-utw-editor/TabUTWEditor";
import { ForgeWaypoint } from "../../module-editor/ForgeWaypoint";

export class TabUTWEditorState extends TabState {
  tabName: string = `UTW`;
  waypoint: ForgeWaypoint = new ForgeWaypoint();

  get blueprint(): KotOR.GFFObject {
    return this.waypoint.blueprint;
  }

  constructor(options: BaseTabStateOptions = {}){
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

    this.addEventListener('onTabRemoved', (tab: TabState) => {

    });
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();

        file.readFile().then( (response) => {
          this.waypoint = new ForgeWaypoint(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  animate(delta: number = 0){
    // Waypoint editor has no continuous animation; override is for future 3D preview if needed.
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utw'){
      this.waypoint.templateResRef = resref;
      this.updateFile();
      return this.waypoint.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    this.waypoint.exportToBlueprint();
  }

}
