import React from "react";

import { TabGUIEditor } from "@/apps/forge/components/tabs/tab-gui-editor/TabGUIEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import type { GameState } from "@/GameState";
import { createScopedLogger, LogScope, type IScopedLogger } from "@/utility/Logger";

const log: IScopedLogger = createScopedLogger(LogScope.Forge);



export type TabGUIEditorStateEventListenerTypes =
TabStateEventListenerTypes &
  ''|'onEditorFileLoad'|'onNodeSelected'|'onNodeAdded'|'onNodeRemoved'|'onAnimate';

export interface TabGUIEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: (() => void)[];
  onNodeSelected: (() => void)[];
  onNodeAdded: (() => void)[];
  onNodeRemoved: (() => void)[];
  onAnimate: (() => void)[];
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
    log.trace('TabGUIEditorState constructor entry');
    super(options);
    this.setContentView(<TabGUIEditor tab={this}></TabGUIEditor>);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.guiMode = true;
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));

    this.openFile();
    this.saveTypes = [
      {
        description: 'GUI File Format (GUI)',
        accept: {
          'application/octet-stream': ['.gui']
        }
      }
    ];
    log.trace('TabGUIEditorState constructor exit');
  }

  show(): void {
    log.trace('TabGUIEditorState show');
    super.show();
    this.ui3DRenderer.enabled = true;
    this.ui3DRenderer.render();
  }

  hide(): void {
    log.trace('TabGUIEditorState hide');
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  animate(delta: number = 0){
    this.menu?.update(delta);
    this.processEventListener('onAnimate', [delta]);
  }

  public openFile(file?: EditorFile){
    log.trace('TabGUIEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug('TabGUIEditorState openFile tabName', this.tabName);

        file.readFile().then( async (response) => {
          this.gff = new KotOR.GFFObject(response.buffer);
          this.menu = new KotOR.GameMenu();
          this.menu.voidFill = true;
          this.menu.bVisible = true;
          this.menu.context = this.ui3DRenderer as unknown as typeof GameState;
          await this.menu.loadBackground();
          await this.menu.buildMenu(this.gff);
          this.ui3DRenderer.scene.add(this.menu.tGuiPanel.widget);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabGUIEditorState openFile loaded');
          resolve(this.gff);
        });
      } else {
        log.trace('TabGUIEditorState openFile no file');
      }
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabGUIEditorState getExportBuffer');
    return this.gff.getExportBuffer();
  }
}
