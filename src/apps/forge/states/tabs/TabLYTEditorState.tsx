import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import { CameraFocusMode, UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from 'three';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { TabLYTEditor } from "@/apps/forge/components/tabs/tab-lyt-editor/TabLYTEditor";
import { ILayoutRoom } from "@/interface/resource/ILayoutRoom";
import {
  promptForDirectory,
  collectModelAssets,
  collectTxiReferencedTextures,
  exportCollectedAssets,
  fileExists,
  writeFile,
  showExtractionResults,
  createProgressModal,
} from "@/apps/forge/helpers/AssetExtraction";

export interface LYTRoomEntry {
  lytRoom: ILayoutRoom;
  model?: KotOR.OdysseyModel3D;
}

export class TabLYTEditorState extends TabState {
  tabName: string = `LYT`;

  ui3DRenderer: UI3DRenderer;
  lyt: KotOR.LYTObject;
  code: string = '';
  roomEntries: LYTRoomEntry[] = [];
  selectedRoomIndex: number = -1;

  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: typeof monacoEditor;

  private _syncTimeout: any;
  private _suppressTextSync: boolean = false;
  private _isDragging: boolean = false;
  private _sidebarUndoStopPushed: boolean = false;
  private _sidebarUndoTimeout: any;
  private _textChangeOccurred: boolean = false;
  private _textUndoTimeout: any;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    const grid1 = new THREE.GridHelper(250, 26, 0x00FF00);
    grid1.rotation.x = -Math.PI / 2;

    const grid2 = new THREE.GridHelper(250, 2, 0xFF0000);
    grid2.rotation.x = -Math.PI / 2;

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.setCameraFocusMode(CameraFocusMode.SELECTABLE);
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
    this.ui3DRenderer.scene.add(grid1);
    this.ui3DRenderer.scene.add(grid2);
    this.ui3DRenderer.group.light_helpers.visible = false;

    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onSelect', this.onSelect.bind(this));

    if (this.ui3DRenderer.transformControls) {
      this.attachTransformControlListeners(this.ui3DRenderer.transformControls);
    } else {
      this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onCanvasAttached', () => {
        if (this.ui3DRenderer.transformControls) {
          this.attachTransformControlListeners(this.ui3DRenderer.transformControls);
        }
      });
    }

    this.addEventListener('onKeyUp', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.selectRoom(-1);
        this.ui3DRenderer.selectObject(undefined);
      }
    });

    this.setContentView(<TabLYTEditor tab={this} />);
    this.openFile();

    this.saveTypes = [
      {
        description: 'Odyssey Layout File',
        accept: { 'text/plain': ['.lyt'] },
      },
    ];
  }

  private attachTransformControlListeners(tc: any): void {
    tc.addEventListener('change', this.onTransformControlsChange.bind(this));
    tc.addEventListener('dragging-changed', this.onDraggingChanged.bind(this));
  }

  private onDraggingChanged(event: any): void {
    const dragging = event.value === true;
    if (dragging && !this._isDragging) {
      this._isDragging = true;
      this.captureUndoSnapshot();
    } else if (!dragging && this._isDragging) {
      this._isDragging = false;
    }
  }

  protected override captureUndoState(): string {
    return this.code;
  }

  protected override applyUndoState(code: string): void {
    this._suppressTextSync = true;
    this.code = code;

    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        model.setValue(code);
      }
    }
    this.processEventListener('onCodeChanged', [this.code]);
    this._suppressTextSync = false;

    this.syncLYTFromText();

    if (this.file) {
      this.file.unsaved_changes = true;
      this.editorFileUpdated();
    }
  }

  protected override shouldHandleUndoKeyboard(_e: KeyboardEvent): boolean {
    return !this.editor?.hasTextFocus();
  }

  public openFile(file?: EditorFile) {
    return new Promise<void>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file !== file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then(async (response) => {
          const decoder = new TextDecoder('utf8');
          this.code = decoder.decode(response.buffer);
          this.lyt = new KotOR.LYTObject(response.buffer);
          this.clearUndoHistory();

          await this.loadRoomModels();

          this.processEventListener('onEditorFileLoad', [this]);
          resolve();
        });
      }
    });
  }

  private async loadRoomModels(): Promise<void> {
    this.disposeRooms();

    if (!this.lyt || !this.lyt.rooms.length) return;

    for (let i = 0; i < this.lyt.rooms.length; i++) {
      const room = this.lyt.rooms[i];
      const entry: LYTRoomEntry = { lytRoom: room };

      try {
        const mdl = await KotOR.MDLLoader.loader.load(room.name);
        if (mdl) {
          const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
            context: this.ui3DRenderer,
            manageLighting: true,
            mergeStatic: false,
          });
          if (model) {
            model.position.copy(room.position);
            model.userData.roomIndex = i;
            this.ui3DRenderer.selectable.add(model);
            entry.model = model;
          }
        }
      } catch (e) {
        console.warn(`TabLYTEditorState: could not load room model '${room.name}'`, e);
      }

      this.roomEntries.push(entry);
    }

    await KotOR.TextureLoader.LoadQueue();

    if (this.ui3DRenderer.renderer) {
      this.ui3DRenderer.renderer.compile(this.ui3DRenderer.scene, this.ui3DRenderer.currentCamera);
    }

    this.processEventListener('onRoomsLoaded', [this.roomEntries]);
  }

  private disposeRooms(): void {
    for (const entry of this.roomEntries) {
      if (entry.model) {
        entry.model.dispose();
        this.ui3DRenderer.selectable.remove(entry.model);
      }
    }
    this.roomEntries = [];
    this.selectRoom(-1);
  }

  private findRoomIndexFromObject(object: THREE.Object3D): number {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData.roomIndex !== undefined) {
        return current.userData.roomIndex as number;
      }
      current = current.parent;
    }
    return -1;
  }

  private onSelect(object: THREE.Object3D | undefined): void {
    this.ui3DRenderer.selectionBox.visible = false;
    if (object) {
      const roomIndex = this.findRoomIndexFromObject(object);
      this.selectRoom(roomIndex);
    } else {
      this.selectRoom(-1);
    }
  }

  selectRoom(index: number): void {
    this.ui3DRenderer.transformControls.detach();
    this.selectedRoomIndex = index;

    const entry = this.roomEntries[index];
    if (entry?.model) {
      this.ui3DRenderer.transformControls.attach(entry.model);
      this.ui3DRenderer.transformControls.size = 1;
    }

    this.processEventListener('onRoomSelected', [index]);
  }

  private onTransformControlsChange(): void {
    if (this.selectedRoomIndex < 0 || this.selectedRoomIndex >= this.roomEntries.length) return;

    const entry = this.roomEntries[this.selectedRoomIndex];
    if (!entry?.model) return;

    entry.lytRoom.position.copy(entry.model.position);

    this.rebuildCodeFromLYT();

    if (this.file) {
      this.file.unsaved_changes = true;
      this.editorFileUpdated();
    }

    this.processEventListener('onRoomPositionChanged', [this.selectedRoomIndex]);
  }

  private rebuildCodeFromLYT(): void {
    if (!this.lyt) return;
    const buffer = this.lyt.export();
    const decoder = new TextDecoder('utf8');
    this.code = decoder.decode(buffer);
    this._suppressTextSync = true;
    this.processEventListener('onCodeChanged', [this.code]);
    this._suppressTextSync = false;
  }

  setCode(code: string): void {
    this.code = code;

    if (this._suppressTextSync) return;

    if (!this._textChangeOccurred && !this.suppressUndoCapture) {
      this.captureUndoSnapshot();
      this._textChangeOccurred = true;
    }

    clearTimeout(this._textUndoTimeout);
    this._textUndoTimeout = setTimeout(() => {
      this._textChangeOccurred = false;
    }, 1000);

    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      this.syncLYTFromText();
    }, 300);
  }

  private syncLYTFromText(): void {
    try {
      const encoder = new TextEncoder();
      const newLyt = new KotOR.LYTObject(encoder.encode(this.code));

      for (let i = 0; i < newLyt.rooms.length && i < this.roomEntries.length; i++) {
        const entry = this.roomEntries[i];
        const newRoom = newLyt.rooms[i];
        entry.lytRoom.position.copy(newRoom.position);
        if (entry.model) {
          entry.model.position.copy(newRoom.position);
        }
      }

      const roomCountChanged =
        newLyt.rooms.length !== this.roomEntries.length ||
        newLyt.rooms.some((r, i) => i >= this.lyt.rooms.length || r.name !== this.lyt.rooms[i].name);

      if (roomCountChanged) {
        this.lyt = newLyt;
        this.loadRoomModels();
      } else {
        this.lyt = newLyt;
      }

      this.processEventListener('onRoomPositionChanged', [-1]);
    } catch (e) {
      // Invalid LYT text - ignore until the user fixes it
    }
  }

  setEditor(editor: monacoEditor.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
  }

  setMonaco(monaco: typeof monacoEditor): void {
    this.monaco = monaco;
    this.setupEditorKeybindings();
  }

  private setupEditorKeybindings(): void {
    if (!this.editor || !this.monaco) return;
    const km = this.monaco.KeyMod;
    const kc = this.monaco.KeyCode;
    this.editor.addCommand(km.CtrlCmd | kc.KeyZ, () => this.undo());
    this.editor.addCommand(km.CtrlCmd | kc.KeyY, () => this.redo());
    this.editor.addCommand(km.CtrlCmd | km.Shift | kc.KeyZ, () => this.redo());
  }

  updateRoomPosition(index: number, x: number, y: number, z: number): void {
    const entry = this.roomEntries[index];
    if (!entry) return;

    if (!this._sidebarUndoStopPushed) {
      this.captureUndoSnapshot();
      this._sidebarUndoStopPushed = true;
    }

    entry.lytRoom.position.set(x, y, z);
    if (entry.model) {
      entry.model.position.set(x, y, z);
    }

    this.rebuildCodeFromLYT();

    clearTimeout(this._sidebarUndoTimeout);
    this._sidebarUndoTimeout = setTimeout(() => {
      this._sidebarUndoStopPushed = false;
    }, 500);

    if (this.file) {
      this.file.unsaved_changes = true;
      this.editorFileUpdated();
    }

    this.processEventListener('onRoomPositionChanged', [index]);
  }

  animate(delta: number = 0): void {
    if (this.selectedRoomIndex >= 0) {
      const entry = this.roomEntries[this.selectedRoomIndex];
      if (entry?.model && this.ui3DRenderer.transformControls.object === entry.model) {
        if (!entry.model.position.equals(entry.lytRoom.position)) {
          entry.lytRoom.position.copy(entry.model.position);
        }
      }
    }
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

  destroy(): void {
    this.disposeRooms();
    this.ui3DRenderer.destroy();
    super.destroy();
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.lyt) {
      return this.lyt.export();
    }
    return new TextEncoder().encode(this.code);
  }

  async extractLayoutAssets(): Promise<void> {
    if (!this.lyt || !this.lyt.rooms.length) return;

    const lytName = (this.file?.getFilename() || 'layout.lyt').toLowerCase();
    const target = await promptForDirectory(lytName.replace(/\.lyt$/i, ''));
    if (!target) return;

    const progress = createProgressModal();

    const visited = new Set<string>();
    const allModels = new Set<string>();
    const allTextures = new Set<string>();

    for (let i = 0; i < this.lyt.rooms.length; i++) {
      const room = this.lyt.rooms[i];
      const roomName = room.name?.toLowerCase().trim();
      if (roomName) {
        progress.setProgress(i + 1, this.lyt.rooms.length, `Collecting room assets: ${roomName}`);
        await collectModelAssets(roomName, visited, allModels, allTextures);
      }
    }

    progress.setProgress(0, 0, 'Resolving TXI texture references...');
    await collectTxiReferencedTextures(allTextures);

    const { exportedFiles, skippedFiles, failedFiles } = await exportCollectedAssets(
      allModels, allTextures, target, undefined,
      (cur, tot, msg) => progress.setProgress(cur, tot, msg),
    );

    progress.setProgress(0, 0, 'Writing LYT file...');
    const lytBuffer = this.lyt.export();
    if (await fileExists(lytName, target)) {
      skippedFiles.push(lytName);
    } else {
      try {
        await writeFile(lytName, lytBuffer, target);
        exportedFiles.unshift(lytName);
      } catch (e) {
        failedFiles.push(lytName);
        console.error('extractLayoutAssets: error exporting LYT', e);
      }
    }

    showExtractionResults({
      modelName: lytName,
      modelCount: allModels.size,
      textureCount: allTextures.size,
      exportedFiles,
      skippedFiles,
      failedFiles,
    }, progress);
  }
}
