import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";
import React from "react";
import { TabModelViewer } from "../../components/tabs/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { EditorFile } from "../../EditorFile";
import { BinaryReader } from "../../../../BinaryReader";
import { ModelViewerControls } from "../../ModelViewerControls";

export class TabModelViewerState extends TabState {

  tabName: string = `Image Viewer`;
  model: KotOR.OdysseyModel3D;
  odysseyModel: KotOR.OdysseyModel;
  
  mdl: Buffer;
  mdx: Buffer;

  ui3DRenderer: UI3DRenderer;
  ui3DRendererView: JSX.Element;

  controls: ModelViewerControls;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }
    
    this.ui3DRenderer = new UI3DRenderer();
    this.controls = new ModelViewerControls(this.ui3DRenderer, this);
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', (canvas: HTMLCanvasElement) => {
      console.log('canvas', 'attached');
      this.controls.attachCanvasElement(canvas);
    });
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRendererView = (
      <UI3DRendererView context={this.ui3DRenderer}></UI3DRendererView>
    );

    this.tabContentView = <TabModelViewer tab={this}></TabModelViewer>
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.OdysseyModel3D>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile( (buffer: Buffer, buffer2: Buffer) => {
          this.mdl = buffer;
          this.mdx = buffer2;
          this.odysseyModel = new KotOR.OdysseyModel(new BinaryReader(buffer), new BinaryReader(buffer2));
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            manageLighting: false,
            context: this.ui3DRenderer, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
              this.processEventListener('onEditorFileLoad', [this]);
              this.ui3DRenderer.scene.add(this.model);
              // this.updateCameraFocus();
              resolve(this.model);
            }
          });
        });
      }
    });
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
    this.controls.update(delta);
  }

}