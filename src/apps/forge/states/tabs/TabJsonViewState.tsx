import React from "react";

import { TabJsonView } from "@/apps/forge/components/tabs/tab-json-view/TabJsonView";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

const GFF_EXTS = new Set([
  'gff', 'res', 'are', 'bic', 'git', 'ifo', 'jrl', 'fac', 'gui', 'pth', 'vis', 'ltr', 'dlg',
  'utc', 'utd', 'utp', 'uti', 'ute', 'uts', 'utt', 'utw', 'utm'
]);

export class TabJsonViewState extends TabState {
  tabName: string = 'JSON View';
  jsonContent: string = '';
  errorMessage: string = '';

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabJsonViewState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabJsonViewState constructor tabName', this.tabName);
    }

    this.setContentView(<TabJsonView tab={this} />);
    this.openFile();
    log.trace('TabJsonViewState constructor exit');
  }

  async openFile(file?: EditorFile): Promise<void> {
    log.trace('TabJsonViewState openFile entry', !!file);
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }
    if (!(file instanceof EditorFile)) {
      log.trace('TabJsonViewState openFile no file');
      return;
    }
    if (this.file !== file) this.file = file;
    this.tabName = this.file.getFilename();
    this.jsonContent = '';
    this.errorMessage = '';

    try {
      const response = await file.readFile();
      const buffer = response.buffer;
      const ext = (this.file.ext ?? '').toLowerCase() || (this.file.getFilename()?.split('.').pop() ?? '').toLowerCase();
      let data: unknown;

      if (GFF_EXTS.has(ext)) {
        const gff = new KotOR.GFFObject(buffer);
        data = gff.toJSON();
      } else if (ext === '2da') {
        const two = KotOR.TwoDAObject.fromBuffer(buffer);
        data = two.toJSON();
      } else if (ext === 'tlk') {
        data = await new Promise<unknown>((resolve, reject) => {
          const tlk = new KotOR.TLKObject(buffer, () => {
            try {
              resolve(tlk.toJSON());
            } catch (e) {
              reject(e);
            }
          }, undefined);
        });
      } else {
        this.errorMessage = `JSON view is not supported for .${ext} files. Supported: GFF-based (.gff, .utc, .are, …), .2da, .tlk`;
        this.processEventListener('onEditorFileLoad', [this]);
        return;
      }

      this.jsonContent = JSON.stringify(data, null, 2);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabJsonViewState openFile loaded', this.jsonContent.length);
    } catch (e) {
      log.error('TabJsonViewState openFile error', e);
      this.errorMessage = e instanceof Error ? e.message : String(e);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    return this.file?.buffer?.slice(0) ?? new Uint8Array(0);
  }

  updateFile(): void {
    log.trace('TabJsonViewState updateFile (read-only)');
  }
}
