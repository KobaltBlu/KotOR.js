/**
 * Forge GUI (.gui) editor tab state — preview, selection, and GFF mutations.
 *
 * @file TabGUIEditorState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabGUIEditor } from "@/apps/forge/components/tabs/tab-gui-editor/TabGUIEditor";
import { UI3DRenderer, UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { snapshotGff, gffFromSnapshot } from "@/apps/forge/helpers/gffUndoSnapshot";
import {
  GUI_ROOT_PATH,
  buildGuiOutline,
  canvasToGuiUiPoint,
  createDefaultGuiControlStruct,
  ensureGuiControlsList,
  ensureNestedStruct,
  findGuiOutlineNode,
  findGuiOutlinePathByStruct,
  getGuiControlsList,
  getNestedStruct,
  getScalarFieldValue,
  getVectorFieldRgb,
  guiControlTypeLabel,
  nextGuiControlId,
  nextUniqueGuiTag,
  readGuiParentTag,
  readGuiTag,
  setScalarField,
  setVectorFieldRgb,
  type GuiOutlineNode,
} from "@/apps/forge/gui/guiOutline";
import * as THREE from "three";

export type TabGUIEditorStateEventListenerTypes =
  TabStateEventListenerTypes &
  "" | "onEditorFileLoad" | "onEditorFileChange" | "onNodeSelected" | "onNodeAdded" | "onNodeRemoved" | "onAnimate" | "onUndoApplied" | "onRedoApplied" | "onHistoryChanged";

export interface TabGUIEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: Function[];
  onEditorFileChange: Function[];
  onNodeSelected: Function[];
  onNodeAdded: Function[];
  onNodeRemoved: Function[];
  onAnimate: Function[];
  onUndoApplied: Function[];
  onRedoApplied: Function[];
  onHistoryChanged: Function[];
}

export class TabGUIEditorState extends TabState {
  tabName: string = `GUI`;
  gff: KotOR.GFFObject;
  menu: KotOR.GameMenu;

  background: string = "";
  backgrounds: string[] = [];

  ui3DRenderer: UI3DRenderer;

  selectedPath: string = GUI_ROOT_PATH;
  selectedNode: KotOR.GFFStruct | undefined;
  canvasScale: number = 1;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabGUIEditor tab={this}></TabGUIEditor>);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.guiMode = true;
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>("onBeforeRender", this.animate.bind(this));
    this.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>("onCanvasAttached", () => {
      if (this.ui3DRenderer.orbitControls) {
        this.ui3DRenderer.orbitControls.enabled = false;
      }
    });

    this.openFile();
    this.saveTypes = [
      {
        description: "GUI File Format (GUI)",
        accept: {
          "application/octet-stream": [".gui"],
        },
      },
    ];
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    if (this.ui3DRenderer.orbitControls) {
      this.ui3DRenderer.orbitControls.enabled = false;
    }
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  destroy(): void {
    if (this.menu?.tGuiPanel?.widget) {
      this.menu.tGuiPanel.widget.removeFromParent();
    }
    this.ui3DRenderer?.destroy?.();
    super.destroy();
  }

  animate(delta: number = 0) {
    this.menu?.update(delta);
    this.processEventListener("onAnimate", [delta]);
  }

  getOutline(): GuiOutlineNode | undefined {
    return buildGuiOutline(this.gff);
  }

  getSelectedOutlineNode(): GuiOutlineNode | undefined {
    return findGuiOutlineNode(this.getOutline(), this.selectedPath);
  }

  selectPath(path: string | undefined): void {
    const outline = this.getOutline();
    const node = findGuiOutlineNode(outline, path || GUI_ROOT_PATH) ?? outline;
    this.selectedPath = node?.path ?? GUI_ROOT_PATH;
    this.selectedNode = node?.struct;
    this.applySelectionHighlight();
    this.processEventListener("onNodeSelected", [this.selectedNode]);
  }

  selectLiveControl(control: KotOR.GUIControl | undefined): void {
    if (!control) {
      this.selectPath(GUI_ROOT_PATH);
      return;
    }
    const path = findGuiOutlinePathByStruct(this.getOutline(), control.control);
    this.selectPath(path ?? GUI_ROOT_PATH);
  }

  /**
   * Convert canvas-buffer mouse coords to GUI UI space and pick the deepest control.
   * Uses the same axis-aligned boxes as retail `GUIControl.getActiveControls`.
   */
  pickControlAtCanvas(mouseX: number, mouseY: number): KotOR.GUIControl | undefined {
    const canvas = this.ui3DRenderer?.canvas;
    const root = this.menu?.tGuiPanel;
    if (!canvas || !root) {
      return undefined;
    }
    const ui = canvasToGuiUiPoint(mouseX, mouseY, canvas.width, canvas.height);
    const point = new THREE.Vector2(ui.x, ui.y);
    return this.pickControlAtUiPoint(point);
  }

  pickControlAtUiPoint(point: THREE.Vector2): KotOR.GUIControl | undefined {
    const root = this.menu?.tGuiPanel;
    if (!root) {
      return undefined;
    }

    let best: KotOR.GUIControl | undefined;
    const walk = (control: KotOR.GUIControl, isRoot: boolean) => {
      if (!control.widget?.visible) {
        return;
      }
      try {
        control.updateBounds();
      } catch {
        return;
      }
      if (!control.box || !control.box.containsPoint(point)) {
        return;
      }
      if (!isRoot) {
        best = control;
      } else if (!best) {
        best = control;
      }
      const children = control.children || [];
      for (let i = 0; i < children.length; i++) {
        walk(children[i], false);
      }
    };
    walk(root, true);
    return best;
  }

  /** Left-click pick in the preview canvas. Returns true if selection changed. */
  pickAtCanvas(mouseX: number, mouseY: number): boolean {
    const hit = this.pickControlAtCanvas(mouseX, mouseY);
    const path = hit
      ? findGuiOutlinePathByStruct(this.getOutline(), hit.control) ?? GUI_ROOT_PATH
      : GUI_ROOT_PATH;
    if (path === this.selectedPath) {
      this.applySelectionHighlight();
      return false;
    }
    this.selectPath(path);
    return true;
  }

  /** Hover feedback for the preview canvas (pointer cursor). */
  hoverAtCanvas(mouseX: number, mouseY: number): KotOR.GUIControl | undefined {
    const hit = this.pickControlAtCanvas(mouseX, mouseY);
    const canvas = this.ui3DRenderer?.canvas;
    if (canvas) {
      canvas.style.cursor = hit && hit !== this.menu?.tGuiPanel ? "pointer" : "default";
    }
    return hit;
  }

  findLiveControl(struct?: KotOR.GFFStruct): KotOR.GUIControl | undefined {
    if (!this.menu?.tGuiPanel || !struct) {
      return undefined;
    }
    const walk = (control: KotOR.GUIControl): KotOR.GUIControl | undefined => {
      if (control.control === struct) {
        return control;
      }
      for (const child of control.children || []) {
        const found = walk(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return walk(this.menu.tGuiPanel);
  }

  applySelectionHighlight(): void {
    if (!this.menu?.tGuiPanel) {
      return;
    }
    const selected = this.selectedNode;
    const walk = (control: KotOR.GUIControl) => {
      control.selected = control.control === selected;
      for (const child of control.children || []) {
        walk(child);
      }
    };
    walk(this.menu.tGuiPanel);
  }

  markDirty(): void {
    if (this.file) {
      this.file.unsaved_changes = true;
    }
    this.editorFileUpdated();
    this.processEventListener("onEditorFileChange", [this]);
  }

  mutateSelected(mutator: (struct: KotOR.GFFStruct) => void, options?: { rebuild?: boolean; coalesceKey?: string }): void {
    const struct = this.selectedNode;
    if (!struct || !this.gff) {
      return;
    }
    if (options?.coalesceKey) {
      this.captureCoalescedUndo(options.coalesceKey);
    } else {
      this.captureUndoSnapshot();
    }
    mutator(struct);
    if (options?.rebuild) {
      void this.rebuildMenu(this.selectedPath);
    } else {
      const live = this.findLiveControl(struct);
      live?.syncFromGFFPartial();
      this.applySelectionHighlight();
    }
    this.markDirty();
  }

  setSelectedScalar(
    label: string,
    type: GFFDataType,
    value: number | string,
    coalesceKey?: string,
  ): void {
    this.mutateSelected((struct) => {
      if (label === "TAG" && typeof value === "string") {
        const oldTag = readGuiTag(struct);
        setScalarField(struct, label, type, value);
        if (oldTag && oldTag !== value && this.gff?.RootNode) {
          for (const child of getGuiControlsList(this.gff.RootNode)) {
            if (readGuiParentTag(child) === oldTag) {
              setScalarField(child, "Obj_Parent", GFFDataType.CEXOSTRING, value);
            }
          }
        }
        return;
      }
      setScalarField(struct, label, type, value);
    }, {
      coalesceKey,
      rebuild: label === "CONTROLTYPE" || label === "TAG" || label === "Obj_Parent",
    });
  }

  setSelectedNestedScalar(
    group: string,
    label: string,
    type: GFFDataType,
    value: number | string,
    coalesceKey?: string,
  ): void {
    this.mutateSelected((struct) => {
      const nested = ensureNestedStruct(struct, group);
      setScalarField(nested, label, type, value);
    }, { coalesceKey });
  }

  setSelectedNestedColor(
    group: string,
    label: string,
    rgb: { r: number; g: number; b: number },
    coalesceKey?: string,
  ): void {
    this.mutateSelected((struct) => {
      const nested = ensureNestedStruct(struct, group);
      setVectorFieldRgb(nested, label, rgb);
    }, { coalesceKey });
  }

  readSelectedScalar(label: string, fallback: number | string = 0): number | string {
    return getScalarFieldValue(this.selectedNode, label, fallback);
  }

  readSelectedNestedScalar(group: string, label: string, fallback: number | string = 0): number | string {
    return getScalarFieldValue(getNestedStruct(this.selectedNode, group), label, fallback);
  }

  readSelectedNestedColor(group: string, label: string): { r: number; g: number; b: number } {
    return getVectorFieldRgb(getNestedStruct(this.selectedNode, group), label);
  }

  addControl(type: number = GUIControlType.Button): void {
    if (!this.gff?.RootNode) {
      return;
    }
    this.captureUndoSnapshot();
    const parentNode = this.getSelectedOutlineNode() ?? this.getOutline();
    const parentTag = parentNode?.tag || readGuiTag(this.gff.RootNode) || "ROOT";
    let parentId = -1;
    if (parentNode?.struct?.hasField("ID")) {
      const raw = parentNode.struct.getFieldByLabel("ID")?.getValue();
      if (typeof raw === "number") {
        parentId = raw;
      }
    }
    const typeLabel = guiControlTypeLabel(type).toUpperCase().replace(/\s+/g, "");
    const tag = nextUniqueGuiTag(this.gff, typeLabel.slice(0, 8));
    const control = createDefaultGuiControlStruct({
      type,
      tag,
      parentTag,
      parentId,
      id: nextGuiControlId(this.gff),
      width: type === GUIControlType.Panel ? 200 : 100,
      height: type === GUIControlType.Panel ? 120 : 25,
    });
    ensureGuiControlsList(this.gff.RootNode).addChildStruct(control);
    const controls = getGuiControlsList(this.gff.RootNode);
    const path = `controls/${controls.length - 1}`;
    void this.rebuildMenu(path).then(() => {
      this.processEventListener("onNodeAdded", [control]);
      this.markDirty();
    });
  }

  removeSelectedControl(): void {
    if (!this.gff?.RootNode || !this.selectedNode || this.selectedPath === GUI_ROOT_PATH) {
      return;
    }
    const selectedTag = readGuiTag(this.selectedNode);
    const list = ensureGuiControlsList(this.gff.RootNode);
    const controls = list.getChildStructs();
    const index = controls.indexOf(this.selectedNode);
    if (index < 0) {
      return;
    }

    this.captureUndoSnapshot();

    const removeTags = new Set<string>();
    if (selectedTag) {
      removeTags.add(selectedTag.toLowerCase());
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const struct of controls) {
        const tag = readGuiTag(struct);
        const parent = readGuiParentTag(struct).toLowerCase();
        if (tag && removeTags.has(parent) && !removeTags.has(tag.toLowerCase())) {
          removeTags.add(tag.toLowerCase());
          grew = true;
        }
      }
    }

    const keep: KotOR.GFFStruct[] = [];
    for (const struct of controls) {
      const tag = readGuiTag(struct).toLowerCase();
      if (tag && removeTags.has(tag)) {
        continue;
      }
      if (struct === this.selectedNode) {
        continue;
      }
      keep.push(struct);
    }
    list.childStructs = keep;

    void this.rebuildMenu(GUI_ROOT_PATH).then(() => {
      this.processEventListener("onNodeRemoved", [selectedTag]);
      this.markDirty();
    });
  }

  resetZoom(): void {
    this.setCanvasScale(1);
  }

  setCanvasScale(scale: number): void {
    this.canvasScale = scale;
    if (this.menu) {
      // Keep menu.scale + widget scale in sync so hit boxes match the preview zoom.
      this.menu.setScale(scale);
    }
  }

  public openFile(file?: EditorFile) {
    return new Promise<KotOR.GFFObject>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file != file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then(async (response) => {
          this.clearUndoHistory();
          this.gff = new KotOR.GFFObject(response.buffer);
          await this.rebuildMenu(GUI_ROOT_PATH);
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.gff);
        }).catch(reject);
      }
    });
  }

  async rebuildMenu(selectPath: string = this.selectedPath): Promise<void> {
    if (!this.gff) {
      return;
    }

    if (this.menu?.tGuiPanel?.widget) {
      this.menu.tGuiPanel.widget.removeFromParent();
    }

    this.menu = new KotOR.GameMenu();
    this.menu.voidFill = true;
    this.menu.bVisible = true;
    this.menu.context = this.ui3DRenderer;
    await this.menu.loadBackground();
    await this.menu.buildMenu(this.gff);
    this.ui3DRenderer.scene.add(this.menu.tGuiPanel.widget);
    if (this.canvasScale !== 1) {
      this.setCanvasScale(this.canvasScale);
    }
    this.selectPath(selectPath);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.gff) {
      return this.gff.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  protected captureUndoState(): Uint8Array | undefined {
    return snapshotGff(this.gff);
  }

  protected applyUndoState(state: Uint8Array): void {
    const selected = this.selectedPath;
    this.gff = gffFromSnapshot(state);
    void this.rebuildMenu(selected).then(() => {
      this.markDirty();
      this.processEventListener("onEditorFileChange", [this]);
    });
  }
}
