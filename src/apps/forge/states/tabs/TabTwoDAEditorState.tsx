import React from "react";
import { TabTwoDAEditor } from "@/apps/forge/components/tabs/tab-twoda-editor/TabTwoDAEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";

interface TwoDASnapshot {
  columns: string[];
  rows: any;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
}

export class TabTwoDAEditorState extends TabState {
  tabName: string = `2DA`;
  twoDAObject: KotOR.TwoDAObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabTwoDAEditor tab={this}></TabTwoDAEditor>);
    this.openFile();

    this.saveTypes = [
      {
        description: '2-Dimensional Array',
        accept: {
          'application/octet-stream': ['.2da']
        }
      },
      {
        description: 'Comma-separated values',
        accept: {
          'text/csv': ['.csv']
        }
      }
    ];
  }

  // -------------------------------------------------------------------------
  // Undo / Redo
  // -------------------------------------------------------------------------

  protected captureUndoState(): TwoDASnapshot | undefined {
    if(!this.twoDAObject) return undefined;
    return {
      columns: [...this.twoDAObject.columns],
      rows: JSON.parse(JSON.stringify(this.twoDAObject.rows)),
      ColumnCount: this.twoDAObject.ColumnCount,
      RowCount: this.twoDAObject.RowCount,
      CellCount: this.twoDAObject.CellCount,
    };
  }

  protected applyUndoState(state: TwoDASnapshot): void {
    if(!this.twoDAObject || !state) return;
    this.twoDAObject.columns = state.columns;
    this.twoDAObject.rows = state.rows;
    this.twoDAObject.ColumnCount = state.ColumnCount;
    this.twoDAObject.RowCount = state.RowCount;
    this.twoDAObject.CellCount = state.CellCount;
    if(this.file instanceof EditorFile) this.file.unsaved_changes = true;
    this.processEventListener('onEditorFileLoad', [this]);
  }

  // -------------------------------------------------------------------------
  // File operations
  // -------------------------------------------------------------------------

  openFile(file?: EditorFile){
    return new Promise<KotOR.TwoDAObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then( (response) => {
          this.twoDAObject = new KotOR.TwoDAObject(response.buffer);
          this.clearUndoHistory();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.twoDAObject);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(ext == 'csv'){
      const textEncoder = new TextEncoder();
      return textEncoder.encode(this.twoDAObject.toCSV());
    }
    return this.twoDAObject.toExportBuffer();
  }

  importFromCSV(csvContent: string): void {
    this.captureUndoSnapshot();
    this.twoDAObject = KotOR.TwoDAObject.fromCSV(csvContent);
    if(this.file instanceof EditorFile){
      this.file.unsaved_changes = true;
      this.editorFileUpdated();
    }
    this.processEventListener('onEditorFileLoad', [this]);
  }

}
