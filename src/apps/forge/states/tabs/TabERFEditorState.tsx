import React from "react";

import { TabERFEditor } from "@/apps/forge/components/tabs/tab-erf-editor/TabERFEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);
const arfArchiveTypes = [KotOR.ResourceTypes['erf'], KotOR.ResourceTypes['mod'], KotOR.ResourceTypes['sav']];

export class TabERFEditorState extends TabState {
  tabName: string = `ERF`;
  erf: KotOR.ERFObject;

  files: FileBrowserNode[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabERFEditor tab={this}></TabERFEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Encapsulated Resource File (ERF)',
        accept: {
          'application/octet-stream': ['.erf']
        }
      }
    ];
  }

  public async openFile(file?: EditorFile){
    if(!file && this.file instanceof EditorFile){
      file = this.file;
    }

    if(!(file instanceof EditorFile)){ return undefined; }
    if(this.file != file){
      this.file = file; 
    }

    this.tabName = this.file.getFilename();

    const response = await file.readFile();
    this.erf = new KotOR.ERFObject(response.buffer);
    await this.erf.load();
    const root = await this.buildFileBrowser(this.erf);
    this.files = root.nodes;
    this.processEventListener('onEditorFileLoad', [this]);
    return this.erf;
  }

  async buildFileBrowser(archive: KotOR.ERFObject, parent?: FileBrowserNode){
    const isRoot = !parent;
    if(!parent){
      parent = new FileBrowserNode({
        name: 'ERF',
        type: 'group',
        data: {
          archive: archive,
        }
      });
      this.files.push(parent);
    }

    const moduleNode = new FileBrowserNode({
      name: 'Modules',
      type: 'group'
    });

    for(const key of archive.keyList){
      const isERF = arfArchiveTypes.includes(key.resType);
      const node = new FileBrowserNode({
        name: `${key.resRef}.${KotOR.ResourceTypes.getKeyByValue(key.resType)}`,
        type: isERF ? 'group' : 'resource',
        data: {
          archive: archive,
          resource: key,
        }
      });
      if(isERF){
        const erf = new KotOR.ERFObject(await archive.getResourceBufferByResRef(key.resRef, key.resType));
        await erf.load();
        this.buildFileBrowser(erf, node);
        moduleNode.addChildNode(node);
      }else{
        parent.addChildNode(node);
      }
    }
    if(isRoot){
      parent.addChildNode(moduleNode);
    }
    return parent;
  }
}
