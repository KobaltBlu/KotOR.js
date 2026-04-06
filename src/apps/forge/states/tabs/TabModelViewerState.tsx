import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from 'three';
import * as fs from "fs";
import React from "react";
import { TabModelViewer } from "@/apps/forge/components/tabs/tab-model-viewer/TabModelViewer";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { EditorFile } from "@/apps/forge/EditorFile";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TXI } from "@/resource/TXI";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalExtractionResultsState, ExtractionResults } from "@/apps/forge/states/modal/ModalExtractionResultsState";

declare const dialog: any;

interface CollectedAssets {
  models: Set<string>;
  textures: Set<string>;
}

export type TabModelViewerStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onModelLoaded'|'onPlay'|'onPause'|'onStop'|'onAudioLoad'|'onHeadChange'|
  'onHeadLoad'|'onKeyFrameSelect'|'onKeyFrameTrackZoomIn'|'onKeyFrameTrackZoomOut'|
  'onAnimate'|'onKeyFramesChange'|'onDurationChange'|'onAnimationChange'|'onLoopChange';

export interface TabModelViewerStateEventListeners extends TabStateEventListeners {
  onModelLoaded: Function[],
  onPlay: Function[],
  onPause: Function[],
  onStop: Function[],
  onAudioLoad: Function[],
  onHeadChange: Function[],
  onHeadLoad: Function[],
  onKeyFrameSelect: Function[],
  onKeyFrameTrackZoomIn: Function[],
  onKeyFrameTrackZoomOut: Function[],
  onAnimate: Function[],
  onKeyFramesChange: Function[],
  onDurationChange: Function[],
  onAnimationChange: Function[],
  onLoopChange: Function[],
}

export class TabModelViewerState extends TabState {

  tabName: string = `Model Viewer`;

  model: KotOR.OdysseyModel3D;
  odysseyModel: KotOR.OdysseyModel;
  
  mdl: Uint8Array;
  mdx: Uint8Array;

  ui3DRenderer: UI3DRenderer;

  selectedAnimationIndex: number = -1;
  animations: KotOR.OdysseyModelAnimation[] = [];
  currentAnimation: KotOR.OdysseyModelAnimation;

  timelineOffset: number = 200;
  timelineZoom: number = 250;
  seeking: boolean = false;
  playing: boolean = false;
  looping: boolean = false;
  min_timeline_zoom: any = 50;
  max_timeline_zoom: any = 1000;

  dragging_frame: any;
  selected_frame: any;
  groundColor: THREE.Color;
  groundGeometry: THREE.WireframeGeometry<THREE.PlaneGeometry>;
  groundMaterial: THREE.LineBasicMaterial;
  groundMesh: THREE.LineSegments<THREE.WireframeGeometry<THREE.PlaneGeometry>, THREE.LineBasicMaterial>;

  //layout
  layout_group: THREE.Group = new THREE.Group();
  selectedLayoutIndex: number = -1;
  layoutSceneGraphNode: SceneGraphNode;
  layout: KotOR.LYTObject;
  currentAnimationState: any = {
    elapsed: 0
  };
  scrubbing: boolean = false;
  scrubbingTimeout: NodeJS.Timeout;
  paused: boolean = false;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    // Geometry
    this.groundColor = new THREE.Color(0.5, 0.5, 0.5);
    this.groundGeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 2500, 2500, 100, 100 ));
    this.groundMaterial = new THREE.LineBasicMaterial( { color: this.groundColor, linewidth: 2 } );
    this.groundMesh = new THREE.LineSegments( this.groundGeometry, this.groundMaterial );
    // this.unselectable.add( this.groundMesh );
    
    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(this.groundMesh);
    this.ui3DRenderer.scene.add(this.layout_group);

    this.layoutSceneGraphNode = new SceneGraphNode({
      name: 'Layout'
    });

    this.ui3DRenderer.sceneGraphManager.sceneNode.addChildNode(this.layoutSceneGraphNode);

    this.setContentView(<TabModelViewer tab={this}></TabModelViewer>);
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
  
        file.readFile().then( (response) => {
          this.mdl = response.buffer;
          this.mdx = response.buffer2 as Buffer;
          this.odysseyModel = new KotOR.OdysseyModel(new BinaryReader(response.buffer), new BinaryReader(response.buffer2 as Buffer));
          KotOR.OdysseyModel3D.FromMDL(this.odysseyModel, {
            // manageLighting: false,
            context: this.ui3DRenderer,
            editorMode: true, 
            onComplete: (model: KotOR.OdysseyModel3D) => {
              this.model = model;
              this.ui3DRenderer.attachObject(this.model, true);

              this.animations = this.model.odysseyAnimations.slice(0).sort( (a, b) => {
                return a.name.localeCompare(b.name);
              });

              this.selectedAnimationIndex = 0;
              this.currentAnimation = this.animations[this.selectedAnimationIndex];
              this.paused = true;

              model.emitters.map( (emitter) => {
                emitter.referenceNode = this.ui3DRenderer.referenceNode as any;
              })

              if(model.camerahook){
                const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
                camera.name = model.name;
                model.camerahook.add(camera);
                this.ui3DRenderer.attachCamera(camera);
              }
              this.ui3DRenderer.sceneGraphManager.rebuild();

              // this.updateCameraFocus();
              this.processEventListener('onEditorFileLoad', [this]);
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
    if(this.model){
      if(this.currentAnimation != this.model.animationManager.currentAnimation){
        this.model.animationManager.currentAnimation = this.currentAnimation;
        this.model.animationManager.currentAnimationState = this.currentAnimationState;
      }
      const cachedAnimationState = this.model.animationManager.currentAnimationState;
      if(!this.paused){
        const elapsed = this.currentAnimationState.elapsed;
        this.model.update(delta);
        let cElapsed = this.model.animationManager.currentAnimationState.elapsed;
        if(isNaN(cElapsed)) cElapsed = elapsed;
        if(cElapsed < elapsed && !this.looping) cElapsed = elapsed;
      }else{
        const elapsed = this.model.animationManager.currentAnimationState.elapsed;
        this.model.update(delta);
        if(!isNaN(elapsed)){
          this.model.animationManager.currentAnimationState.elapsed = elapsed;
        }
      }
      if(!this.model.animationManager.currentAnimationState){
        this.model.animationManager.currentAnimationState = cachedAnimationState;
      }
      this.currentAnimationState = this.model.animationManager.currentAnimationState;
    }
    this.processEventListener('onAnimate', [delta]);
  }

  

  keyframeTrackZoomIn(){
    this.timelineZoom += 25;

    if(this.timelineZoom > this.max_timeline_zoom){
      this.timelineZoom = this.max_timeline_zoom;
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomIn', [this]);
  }

  keyframeTrackZoomOut(){
    this.timelineZoom -= 25;

    if(this.timelineZoom < this.min_timeline_zoom){
      this.timelineZoom = this.min_timeline_zoom;
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onKeyFrameTrackZoomOut', [this]);
  }

  setAnimationByIndex(index: number = 0){
    this.selectedAnimationIndex = index;
    const animation = this.animations[index];
    if(animation){
      this.model.playAnimation(animation, this.looping);
      this.currentAnimation = animation;
    }else{
      this.selectedAnimationIndex = 0;
      this.currentAnimation = this.animations[0];
    }
    this.processEventListener<TabModelViewerStateEventListenerTypes>('onAnimationChange', [this]);
  }

  getCurrentAnimationLength(){
    if(!this.currentAnimation) return 0;
    return this.currentAnimation.length;
  }

  getCurrentAnimationElapsed(){
    if(!this.currentAnimationState) return 0;
    return this.currentAnimationState.elapsed;
  }

  playAnimation(){
    // if(!this.currentAnimation){
    //   this.pause();
    //   return;
    // }
    // if(this.currentAnimation != this.model.animationManager.currentAnimation){
    //   this.model.playAnimation(this.currentAnimation, this.looping);
    // }else{
    //   this.stopAnimation();
    // }
    // this.play();
  }

  stopAnimation(){
    this.model.stopAnimation();
    this.pause();
  }

  play(){
    if(!this.currentAnimation) return;

    this.paused = false;
    if(this.currentAnimation != this.model.animationManager.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
    this.processEventListener('onPlay');
  }

  pause(){
    this.paused = true;
    this.processEventListener('onPause');
  }

  stop(){
    this.paused = true;
    this.stopAnimation();
  }

  seek(time: number = 0){
    if(this.currentAnimation && this.currentAnimationState){
      if(time < 0) time = 0;
      if(time > this.currentAnimation.length) time = this.currentAnimation.length;
      this.currentAnimationState.elapsed = time;
    }
  }

  setLooping(loop: boolean = false){
    this.looping = loop;
    if(this.currentAnimation){
      this.model.playAnimation(this.currentAnimation, this.looping);
    }
    this.processEventListener('onLoopChange', [this.looping]);
  }

  destroy(): void {
    this.ui3DRenderer.destroy();
    this.disposeLayout();
    super.destroy();
  }

  loadLayout(key?: KotOR.IKEYEntry){
    this.disposeLayout();
    if(key) {
      // this.layoutSceneGraphNode
      return new Promise<void>( async (resolve, reject) => {
        const data = await KotOR.KEYManager.Key.getFileBuffer(key);
        // this.tab.tabLoader.SetMessage(`Loading: Layout...`);
        // this.tab.tabLoader.Show();
        const lyt = new KotOR.LYTObject(data);
        this.layout = lyt;
        for(let i = 0, len = this.layout.rooms.length; i < len; i++){
          let room = this.layout.rooms[i];
          // this.tabLoader.SetMessage(`Loading: ${room.name}`);
          let mdl = await KotOR.MDLLoader.loader.load(room.name);
          if(mdl){
            let model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
              // manageLighting: false,
              context: this.ui3DRenderer, 
              mergeStatic: false,
            });
            if(model){
              model.position.copy( room.position )
              this.layout_group.add(model);
            }
          }
          this.layoutSceneGraphNode.addChildNode(
            new SceneGraphNode({
              name: room.name,
            })
          )
        }
        this.ui3DRenderer.sceneGraphManager.rebuild();
        KotOR.TextureLoader.LoadQueue().then(() => {
          if(this.ui3DRenderer.renderer)
            this.ui3DRenderer.renderer.compile(this.ui3DRenderer.scene, this.ui3DRenderer.currentCamera);
          // this.tab.tabLoader.Hide();
          resolve();
        }, (texObj: KotOR.ITextureLoaderQueuedRef) => {
          if(texObj.material){
            if(texObj.material instanceof THREE.ShaderMaterial){
              if(texObj.material.uniforms.map.value){
                // this.tabLoader.SetMessage(`Initializing Texture: ${texObj.name}`);
                console.log('iniTexture', texObj.name);

                if(this.ui3DRenderer.renderer)
                  this.ui3DRenderer.renderer.initTexture(texObj.material.uniforms.map.value);
              }
            }
          }
        });
      });
    }
  }

  

  disposeLayout(){
    this.layoutSceneGraphNode.setNodes([]);
    this.ui3DRenderer.sceneGraphManager.rebuild();
    try{
      if(this.layout_group.children.length){
        let modelIndex = this.layout_group.children.length - 1;
        while(modelIndex >= 0){
          let model = this.layout_group.children[modelIndex] as KotOR.OdysseyModel3D;
          if(model){
            model.dispose();
            this.layout_group.remove(model);
          }
          modelIndex--;
        }
      }
      // this.modelViewSideBarComponent.buildNodeTree();
    }catch(e){
      console.error(e);
    }
    // this.layout = undefined;
  }

  setRandomReferencePosition(spread: number = 1){
    this.ui3DRenderer.referenceNode.position.set(
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread,
      (Math.random()-0.5*2) * spread
    );
  }

  /**
   * Recursively collect all texture resrefs and child/supermodel names
   * from a parsed OdysseyModel's node tree.
   */
  private collectNodeAssets(node: KotOR.OdysseyModelNode, assets: CollectedAssets): void {
    if (node instanceof KotOR.OdysseyModelNodeMesh) {
      const maps = [node.textureMap1, node.textureMap2, node.textureMap3, node.textureMap4];
      for (const map of maps) {
        if (map && map.length) {
          assets.textures.add(map.toLowerCase());
        }
      }
    }

    if (node instanceof KotOR.OdysseyModelNodeEmitter) {
      if (node.textureResRef && node.textureResRef.length) {
        assets.textures.add(node.textureResRef.toLowerCase());
      }
    }

    if (node instanceof KotOR.OdysseyModelNodeLight) {
      if (node.flare?.textures) {
        for (const tex of node.flare.textures) {
          if (tex && tex.length) {
            assets.textures.add(tex.toLowerCase());
          }
        }
      }
    }

    if (node instanceof KotOR.OdysseyModelNodeReference) {
      if (node.modelName && node.modelName.length) {
        assets.models.add(node.modelName.toLowerCase().trim());
      }
    }

    if (node.children) {
      for (const child of node.children) {
        this.collectNodeAssets(child, assets);
      }
    }
  }

  /**
   * For every texture in the set, load its TXI data and add any referenced
   * textures (bumpMapTexture, envMapTexture) to the set. Repeats until no
   * new textures are discovered.
   */
  private async collectTxiReferencedTextures(allTextures: Set<string>): Promise<void> {
    const processed = new Set<string>();
    let queue = [...allTextures];

    while (queue.length > 0) {
      const next: string[] = [];
      for (const resref of queue) {
        if (processed.has(resref)) continue;
        processed.add(resref);

        const txi = await this.loadTxiForTexture(resref);
        if (!txi) continue;

        if (txi.bumpMapTexture) {
          const name = String(txi.bumpMapTexture).toLowerCase().trim();
          if (name && name !== 'null' && !allTextures.has(name)) {
            allTextures.add(name);
            next.push(name);
          }
        }
        if (txi.envMapTexture) {
          const name = String(txi.envMapTexture).toLowerCase().trim();
          if (name && name !== 'null' && !allTextures.has(name)) {
            allTextures.add(name);
            next.push(name);
          }
        }
      }
      queue = next;
    }
  }

  /**
   * Load TXI data for a texture resref. For TPC the TXI is embedded; for TGA
   * it's a separate resource.
   */
  private async loadTxiForTexture(resref: string): Promise<TXI | undefined> {
    try {
      const result = await KotOR.TextureLoader.tpcLoader.findTPC(resref);
      if (result?.buffer?.length) {
        const tpc = new KotOR.TPCObject({ filename: resref, file: result.buffer, pack: result.pack || 0 });
        return tpc.txi;
      }
    } catch (e) { /* not a TPC */ }

    try {
      const txiBuffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['txi'], resref);
      if (txiBuffer?.length) {
        return new TXI(txiBuffer);
      }
    } catch (e) { /* no TXI */ }

    return undefined;
  }

  /**
   * Recursively collect all assets for a model: its own MDL/MDX, all textures,
   * child/reference models, and the supermodel chain.
   */
  private async collectModelAssets(
    resref: string,
    visited: Set<string>,
    allModels: Set<string>,
    allTextures: Set<string>,
    primaryMdl?: Uint8Array,
    primaryMdx?: Uint8Array,
  ): Promise<void> {
    resref = resref.toLowerCase().trim();
    if (!resref || visited.has(resref)) return;
    visited.add(resref);
    allModels.add(resref);

    let odysseyModel: KotOR.OdysseyModel | undefined;
    try {
      if (primaryMdl && primaryMdx) {
        odysseyModel = new KotOR.OdysseyModel(new BinaryReader(primaryMdl), new BinaryReader(primaryMdx));
      } else {
        odysseyModel = await KotOR.MDLLoader.loader.load(resref);
      }
    } catch (e) {
      console.warn(`extractModelAssets: failed to load model '${resref}'`, e);
      return;
    }
    if (!odysseyModel) return;

    const assets: CollectedAssets = { models: new Set(), textures: new Set() };
    if (odysseyModel.rootNode) {
      this.collectNodeAssets(odysseyModel.rootNode, assets);
    }

    for (const tex of assets.textures) {
      allTextures.add(tex);
    }

    const superName = odysseyModel.modelHeader?.superModelName?.toLowerCase().trim();
    if (superName && superName.length && superName !== 'null') {
      assets.models.add(superName);
    }

    for (const childModel of assets.models) {
      await this.collectModelAssets(childModel, visited, allModels, allTextures);
    }
  }

  /**
   * Fetch the raw TPC or TGA buffer for a texture resref.
   * For TGA textures, also returns the companion TXI buffer if one exists.
   */
  private async fetchTextureBuffer(resref: string): Promise<{ filename: string; buffer: Uint8Array; txi?: Uint8Array } | undefined> {
    try {
      const result = await KotOR.TextureLoader.tpcLoader.findTPC(resref);
      if (result?.buffer?.length) {
        return { filename: `${resref}.tpc`, buffer: result.buffer };
      }
    } catch (e) { /* TPC not found, try TGA */ }

    try {
      const buffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['tga'], resref);
      if (buffer?.length) {
        let txi: Uint8Array | undefined;
        try {
          txi = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['txi'], resref);
        } catch (e) { /* no TXI companion */ }
        return { filename: `${resref}.tga`, buffer, txi };
      }
    } catch (e) { /* TGA not found either */ }

    return undefined;
  }

  /**
   * Fetch MDL and MDX buffers for a model resref.
   * For the primary model, uses the already-loaded buffers.
   */
  private async fetchModelBuffers(
    resref: string,
  ): Promise<{ mdl: Uint8Array; mdx: Uint8Array } | undefined> {
    const primaryName = this.odysseyModel?.geometryHeader?.modelName?.toLowerCase().trim();
    if (resref === primaryName && this.mdl && this.mdx) {
      return { mdl: this.mdl, mdx: this.mdx };
    }

    try {
      const [mdl, mdx] = await Promise.all([
        KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['mdl'], resref),
        KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['mdx'], resref),
      ]);
      if (mdl?.length && mdx?.length) {
        return { mdl, mdx };
      }
    } catch (e) {
      console.warn(`extractModelAssets: failed to fetch MDL/MDX for '${resref}'`, e);
    }

    return undefined;
  }

  private async fileExists(
    filename: string,
    target: { type: 'electron'; path: string } | { type: 'browser'; handle: FileSystemDirectoryHandle },
  ): Promise<boolean> {
    if (target.type === 'electron') {
      return new Promise<boolean>((resolve) => {
        fs.access(`${target.path}/${filename}`, (err) => resolve(!err));
      });
    } else {
      try {
        await target.handle.getFileHandle(filename);
        return true;
      } catch {
        return false;
      }
    }
  }

  private async writeFile(
    filename: string,
    buffer: Uint8Array,
    target: { type: 'electron'; path: string } | { type: 'browser'; handle: FileSystemDirectoryHandle },
  ): Promise<void> {
    if (target.type === 'electron') {
      await new Promise<void>((resolve, reject) => {
        fs.writeFile(`${target.path}/${filename}`, buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      const fileHandle = await target.handle.getFileHandle(filename, { create: true });
      const ws: FileSystemWritableFileStream = await fileHandle.createWritable();
      await ws.write(buffer as any);
      await ws.close();
    }
  }

  /**
   * Extract the current model and all its dependencies (textures, child models,
   * supermodels) into a user-chosen directory.
   */
  async extractModelAssets(): Promise<void> {
    if (!this.odysseyModel) {
      return;
    }

    const modelName = this.odysseyModel.geometryHeader.modelName?.toLowerCase().trim();
    if (!modelName) {
      return;
    }

    let target: { type: 'electron'; path: string } | { type: 'browser'; handle: FileSystemDirectoryHandle };
    try {
      if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
        const savePath = await dialog.showSaveDialog({
          title: 'Choose export directory',
          defaultPath: modelName,
          properties: ['openDirectory', 'createDirectory'],
        });
        if (!savePath || savePath.cancelled || !savePath.filePath) {
          return;
        }
        target = { type: 'electron', path: savePath.filePath };
      } else {
        const directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        if (!directoryHandle) {
          return;
        }
        target = { type: 'browser', handle: directoryHandle };
      }
    } catch (e) {
      return;
    }

    const visited = new Set<string>();
    const allModels = new Set<string>();
    const allTextures = new Set<string>();

    await this.collectModelAssets(modelName, visited, allModels, allTextures, this.mdl, this.mdx);
    await this.collectTxiReferencedTextures(allTextures);

    const exportedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const resref of allModels) {
      try {
        const mdlName = `${resref}.mdl`;
        const mdxName = `${resref}.mdx`;
        const mdlExists = await this.fileExists(mdlName, target);
        const mdxExists = await this.fileExists(mdxName, target);
        if (mdlExists && mdxExists) {
          skippedFiles.push(mdlName, mdxName);
          continue;
        }
        const buffers = await this.fetchModelBuffers(resref);
        if (buffers) {
          if (!mdlExists) {
            await this.writeFile(mdlName, buffers.mdl, target);
            exportedFiles.push(mdlName);
          } else {
            skippedFiles.push(mdlName);
          }
          if (!mdxExists) {
            await this.writeFile(mdxName, buffers.mdx, target);
            exportedFiles.push(mdxName);
          } else {
            skippedFiles.push(mdxName);
          }
        } else {
          failedFiles.push(`${resref}.mdl/.mdx`);
        }
      } catch (e) {
        failedFiles.push(`${resref}.mdl/.mdx`);
        console.error(`extractModelAssets: error exporting model '${resref}'`, e);
      }
    }

    for (const resref of allTextures) {
      try {
        const result = await this.fetchTextureBuffer(resref);
        if (result) {
          if (await this.fileExists(result.filename, target)) {
            skippedFiles.push(result.filename);
          } else {
            await this.writeFile(result.filename, result.buffer, target);
            exportedFiles.push(result.filename);
          }
          if (result.txi?.length) {
            const txiName = `${resref}.txi`;
            if (await this.fileExists(txiName, target)) {
              skippedFiles.push(txiName);
            } else {
              await this.writeFile(txiName, result.txi, target);
              exportedFiles.push(txiName);
            }
          }
        } else {
          failedFiles.push(resref);
        }
      } catch (e) {
        failedFiles.push(resref);
        console.error(`extractModelAssets: error exporting texture '${resref}'`, e);
      }
    }

    const results: ExtractionResults = {
      modelName,
      modelCount: allModels.size,
      textureCount: allTextures.size,
      exportedFiles,
      skippedFiles,
      failedFiles,
    };

    const modal = new ModalExtractionResultsState(results);
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  }

}