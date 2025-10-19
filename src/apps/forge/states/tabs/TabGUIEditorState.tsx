import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabGUIEditor } from "../../components/tabs/tab-gui-editor/TabGUIEditor";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";


export type TabGUIEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onEditorFileLoad'|'onNodeSelected'|'onNodeAdded'|'onNodeRemoved'|'onAnimate';

export interface TabGUIEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: Function[],
  onNodeSelected: Function[],
  onNodeAdded: Function[],
  onNodeRemoved: Function[],
  onAnimate: Function[],
}

export class TabGUIEditorState extends TabState {

  tabName: string = `GUI`;
  gff: KotOR.GFFObject;
  menu: KotOR.GameMenu;

  background: string = '';
  backgrounds: string[] = [];

  ui3DRenderer: UI3DRenderer;

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabGUIEditor tab={this}></TabGUIEditor>);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.guiMode = true;
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    // this.ui3DRenderer.controlsEnabled = true;

    this.openFile();
    this.saveTypes = [
      {
        description: 'GUI File Format (GUI)',
        accept: {
          'application/octet-stream': ['.gui']
        }
      }
    ];
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  animate(delta: number = 0){
    //todo
    this.menu?.update(delta);
    this.processEventListener('onAnimate', [delta]);
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( async (response) => {
          this.gff = new KotOR.GFFObject(response.buffer);
          this.menu = new KotOR.GameMenu();
          this.menu.voidFill = true;
          // this.menu.background = '1600x1200back';
          this.menu.bVisible = true;
          this.menu.context = this.ui3DRenderer;
          await this.menu.loadBackground();
          await this.menu.buildMenu(this.gff);
          this.ui3DRenderer.scene.add(this.menu.tGuiPanel.widget);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.gff);
        });
      }
    });
  }

  async getExportBuffer(ext?: string): Promise<Uint8Array> {
    return this.gff.getExportBuffer();
  }
}