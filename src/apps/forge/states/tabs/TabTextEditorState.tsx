import React from "react";
import { TabTextEditor } from "@/apps/forge/components/tabs/tab-text-editor/TabTextEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { ForgeState } from "@/apps/forge/states/ForgeState";
// import { NWScriptCompiler } from "@/nwscript/NWScriptCompiler";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { TabScriptCompileLogState, TabScriptErrorLogState, TabScriptInspectorState } from "@/apps/forge/states/tabs";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

import * as KotOR from "@/apps/forge/KotOR";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import * as path from "path";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { NWScriptLanguageService } from "@/apps/forge/states/NWScriptLanguageService";
import { LYTLanguageService } from "@/apps/forge/states/LYTLanguageService";
import { SemanticFunctionNode } from "@/nwscript/compiler/ASTSemanticTypes";
import { compileNssSource, resolveIncludesForNss } from "@/apps/forge/helpers/ForgeNWScriptCompile";

export class TabTextEditorState extends TabState {

  tabName: string = `TEXT`;
  code: string = ``;

  nwScriptParser: NWScriptParser;
  ncs: Uint8Array = new Uint8Array(0);
  nwScript: KotOR.NWScript;

  #southTabManager = new EditorTabManager();
  #tabErrorLogState: TabScriptErrorLogState;
  #tabCompileLogState: TabScriptCompileLogState;
  #tabScriptInspectorState: TabScriptInspectorState;
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  diffEditor: monacoEditor.editor.IStandaloneDiffEditor | null = null;
  monaco: typeof monacoEditor;

  isDiffMode: boolean = false;
  originalText: string = ``;
  originalModel: monacoEditor.editor.ITextModel | null = null;
  modifiedModel: monacoEditor.editor.ITextModel | null = null;

  resolvedIncludes: Map<string, string> = new Map();
  tabSize: number = 2;
  manualLanguageId: string | null = null; // Override for manual language selection

  getLanguageId(): string {
    // Use manual override if set
    if(this.manualLanguageId) {
      return this.manualLanguageId;
    }
    
    // Otherwise, detect from file extension
    if(!this.file) return 'plaintext';
    const ext = this.file.ext?.toLowerCase();
    switch(ext){
      case 'lyt':
        return 'lyt';
      case 'nss':
      case 'ncs':
        return 'nwscript';
      case 'json':
        // `json` is the only extra Monaco language registered via
        // MonacoWebpackPlugin in webpack/Forge.js; other extensions fall back
        // to plaintext until additional languages are added to the bundle.
        return 'json';
      default:
        return 'plaintext';
    }
  }

  setLanguageId(languageId: string | null): void {
    this.manualLanguageId = languageId;
    
    const finalLanguageId = this.getLanguageId();
    const finalTheme = this.getTheme();
    
    // Update editor model language if editor exists
    if(this.editor && this.monaco) {
      const model = this.editor.getModel();
      if(model) {
        this.monaco.editor.setModelLanguage(model, finalLanguageId);
      }
      // Update theme
      this.monaco.editor.setTheme(finalTheme);
    }
    
    // Update diff editor models if in diff mode
    if(this.isDiffMode && this.originalModel && this.modifiedModel && this.monaco) {
      this.monaco.editor.setModelLanguage(this.originalModel, finalLanguageId);
      this.monaco.editor.setModelLanguage(this.modifiedModel, finalLanguageId);
      this.monaco.editor.setTheme(finalTheme);
    }
    
    // Trigger linter with new language
    this.triggerLinterTimeout();
  }

  getTheme(): string {
    const langId = this.getLanguageId();
    switch(langId){
      case 'lyt':
        return 'lyt-dark';
      case 'nwscript':
        return 'nwscript-dark';
      default:
        return 'vs-dark';
    }
  }

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    
    this.#tabErrorLogState = new TabScriptErrorLogState( { parentTab: this } );
    this.#tabCompileLogState = new TabScriptCompileLogState( { parentTab: this } );
    this.#tabScriptInspectorState = new TabScriptInspectorState( { parentTab: this } );
    this.#southTabManager.addTab( this.#tabErrorLogState );
    this.#southTabManager.addTab( this.#tabCompileLogState );
    this.#southTabManager.addTab( this.#tabScriptInspectorState );

    this.setContentView(<TabTextEditor tab={this}></TabTextEditor>);
    const textDecoder = new TextDecoder();
    this.nwScriptParser = new NWScriptParser(textDecoder.decode(ForgeState.nwscript_nss));
    this.openFile();

    this.saveTypes = [
      {
        description: 'Plain Text File',
        accept: {
          'text/plain': ['.txt']
        }
      },
      {
        description: 'NWScript File',
        accept: {
          'text/plain': ['.nss']
        }
      }/*,
      {
        description: 'NWScript Compiled File',
        accept: {
          'application/octet-stream': ['.ncs']
        }
      }*/
    ];
  }

  openFile(file?: EditorFile){
    return new Promise<void>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;

        if((file.ext || '').toLowerCase() === 'ncs'){
          file.readFile().then( (response) => {
            const bytes = response.buffer;
            // Own copy so later edits / tooling do not mutate the file buffer backing store.
            this.ncs = new Uint8Array(bytes);
            this.nwScript = new KotOR.NWScript(this.ncs);
            this.nwScript.name = file?.getFilename().split('.')[0] || '';
            this.code = this.nwScript.decompile(this.ncs);
            this.triggerLinterTimeout();
            this.processEventListener('onEditorFileLoad');
            resolve();
          });
        }else{
          file.readFile().then( (response) => {
            let decoder = new TextDecoder('utf8');
            this.code = decoder.decode(response.buffer);
            this.triggerLinterTimeout();
            
            this.processEventListener('onEditorFileLoad');
            resolve();
          });
        }
      }
    });

  }

  getSouthTabManager(){
    return this.#southTabManager;
  }

  setCode(code: string = ``){
    this.code = code;
    // Update diff editor modified model if in diff mode
    if(this.isDiffMode && this.modifiedModel && this.modifiedModel.getValue() !== code) {
      this.modifiedModel.setValue(code);
    }
    this.triggerLinterTimeout();
  }

  setEditor(editor: monacoEditor.editor.IStandaloneCodeEditor){
    this.editor = editor;
    this.updateTabSize();
  }

  setTabSize(size: number): void {
    this.tabSize = size;
    this.updateTabSize();
  }

  updateTabSize(): void {
    // Update regular editor model (tabSize is a model option, not editor option)
    if(this.editor) {
      const model = this.editor.getModel();
      if(model) {
        model.updateOptions({ tabSize: this.tabSize, insertSpaces: true });
      }
    }
    
    // Update diff editor models
    if(this.diffEditor) {
      const originalEditor = this.diffEditor.getOriginalEditor();
      const modifiedEditor = this.diffEditor.getModifiedEditor();
      const originalModel = originalEditor.getModel();
      const modifiedModel = modifiedEditor.getModel();
      
      if(originalModel) {
        originalModel.updateOptions({ tabSize: this.tabSize, insertSpaces: true });
      }
      if(modifiedModel) {
        modifiedModel.updateOptions({ tabSize: this.tabSize, insertSpaces: true });
      }
    }
    
    // Update standalone models if they exist
    if(this.originalModel) {
      this.originalModel.updateOptions({ tabSize: this.tabSize, insertSpaces: true });
    }
    if(this.modifiedModel) {
      this.modifiedModel.updateOptions({ tabSize: this.tabSize, insertSpaces: true });
    }
  }

  setMonaco(monaco: typeof monacoEditor){
    this.monaco = monaco;
  }

  setDiffEditor(diffEditor: monacoEditor.editor.IStandaloneDiffEditor){
    this.diffEditor = diffEditor;
  }

  switchToDiffMode(): void {
    if(!this.monaco || !this.editor) return;
    
    // Capture current text as original (left side)
    this.originalText = this.code;
    
    // Create models for original and modified text
    const langId = this.getLanguageId();
    this.originalModel = this.monaco.editor.createModel(this.originalText, langId);
    this.modifiedModel = this.monaco.editor.createModel(this.code, langId);
    
    // Apply tab size to models
    this.originalModel.updateOptions({ tabSize: this.tabSize });
    this.modifiedModel.updateOptions({ tabSize: this.tabSize });
    
    this.isDiffMode = true;
    this.processEventListener('onDiffModeChanged');
  }

  switchToRegularMode(): void {
    if(!this.diffEditor) return;
    
    // Get the current modified text from the diff editor
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const modifiedText = modifiedEditor.getValue();
    this.code = modifiedText;
    
    // Dispose models
    if(this.originalModel) {
      this.originalModel.dispose();
      this.originalModel = null;
    }
    if(this.modifiedModel) {
      this.modifiedModel.dispose();
      this.modifiedModel = null;
    }
    
    // Dispose diff editor
    this.diffEditor.dispose();
    this.diffEditor = null;
    
    this.isDiffMode = false;
    this.originalText = ``;
    this.processEventListener('onDiffModeChanged');
  }

  updateDiffModifiedText(): void {
    if(this.isDiffMode && this.modifiedModel) {
      this.modifiedModel.setValue(this.code);
    }
  }

  _linter_timeout: any;

  triggerLinterTimeout(){
    clearTimeout(this._linter_timeout);
    this._linter_timeout = undefined;
    this._linter_timeout = setTimeout( () => {
      this.triggerLinter();
    }, 100);
  }

  triggerLinter(){
    if(!this.editor || !this.monaco) return;
    
    const langId = this.getLanguageId();
    
    // Handle LYT files
    if(langId === 'lyt'){
      try{
        const markers = LYTLanguageService.validateLYT(this.code);
        this.#tabErrorLogState.setErrors(markers);
        if(this.editor) {
          const model = this.editor.getModel() as monacoEditor.editor.ITextModel;
          if(model) {
            this.monaco.editor.setModelMarkers(model, 'lyt', markers);
          }
        }
      }catch(e){
        console.error('LYT linting error:', e);
        if(this.editor) {
          const model = this.editor.getModel() as monacoEditor.editor.ITextModel;
          if(model) {
            this.monaco.editor.setModelMarkers(model, 'lyt', []);
          }
        }
        this.#tabErrorLogState.setErrors([]);
      }
      return;
    }
    
    // Handle NWScript files
    if(langId === 'nwscript'){
      this.resolveIncludes(this.code, this.resolvedIncludes).then( (resolvedIncludes) => {
        this.resolvedIncludes = resolvedIncludes;
        try{
          this.nwScriptParser.parseScript( [ [...this.resolvedIncludes.values()].join("\n"), this.code ].join("\n") );
          
          // Update local functions in the tokenizer for syntax highlighting
          const localFunctions = (this.nwScriptParser.program?.functions || []).map((f: SemanticFunctionNode) => f.name);
          NWScriptLanguageService.updateLocalFunctions(localFunctions);
          
          console.log(this.nwScriptParser.errors);
          const markers: any[] = [ ];
          for(let i = 0; i < this.nwScriptParser.errors.length; i++){
            const error = this.nwScriptParser.errors[i];
            if(error && error.offender && error.offender.source){
              markers.push({
                severity: this.monaco.MarkerSeverity.Error,
                startLineNumber: error.offender.source.first_line,
                startColumn: error.offender.source.first_column + 1,
                endLineNumber: error.offender.source.last_line,
                endColumn: error.offender.source.last_column + 1,
                message: error.message
              });
            }else{
              markers.push({
                severity: this.monaco.MarkerSeverity.Warning,
                startLineNumber: 0,
                startColumn: 0,
                endLineNumber: 0,
                endColumn: 0,
                message: error.message
              });
            }
          }
          this.#tabErrorLogState.setErrors(markers);
          if(this.editor) this.monaco.editor.setModelMarkers(this.editor.getModel() as monacoEditor.editor.ITextModel, 'nwscript', markers);
        }catch(e){
          console.log(e);
          if(e.hash){
            console.log('err', e.lineNumber, e.columnNumber, e.name, e.message, e.hash);
            console.log(JSON.stringify(e));
            const markers = [{
              severity: this.monaco.MarkerSeverity.Error,
              startLineNumber: e.hash.loc.first_line,
              startColumn: e.hash.loc.first_column + 1,
              endLineNumber: e.hash.loc.last_line,
              endColumn: e.hash.loc.last_column + 1,
              message: e.message
            }];
            this.#tabErrorLogState.setErrors(markers);
    
            if(this.editor) this.monaco.editor.setModelMarkers(this.editor.getModel() as monacoEditor.editor.ITextModel, 'nwscript', markers);
          }else{
            if(this.editor) this.monaco.editor.setModelMarkers(this.editor.getModel() as monacoEditor.editor.ITextModel, 'nwscript', []);
            this.#tabErrorLogState.setErrors([]);
          }
        }
      });
      return;
    }
    
    // For other file types, clear markers
    if(this.editor) {
      const model = this.editor.getModel() as monacoEditor.editor.ITextModel;
      if(model) {
        this.monaco.editor.setModelMarkers(model, 'plaintext', []);
      }
    }
    this.#tabErrorLogState.setErrors([]);
  }

  resolveIncludes(
    code: string = ``,
    includeMap: Map<string, string> = new Map(),
    _includeOrder: string[] = []
  ) {
    return resolveIncludesForNss(code, includeMap);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    this.updateFile();
    return this.file.buffer ? this.file.buffer : new Uint8Array(0);
  }

  updateFile(): void {
    super.updateFile();
    if(this.file){
      this.file.buffer = new TextEncoder().encode(this.code);
      this.file.unsaved_changes = true;
    }
  }

  private nwscriptCompiledNcsFileName(): string {
    const ref = this.file?.resref;
    const base = typeof ref === 'string' && ref.length ? ref : 'untitled';
    return `${base}.ncs`;
  }

  private async writeCompiledNcsToDisk(ncsBytes: Uint8Array): Promise<void> {
    const ncsFileName = this.nwscriptCompiledNcsFileName();
    const f = this.file;
    if(!f?.path && !f?.handle){
      console.warn('Compile: save or open this NSS from disk or your project folder to emit a .ncs next to it');
      return;
    }

    if(f.archive_path){
      console.warn('Compile: NSS opened from an archive has no sibling folder — export the script or edit it under your game/project tree to save .ncs beside it.');
      return;
    }

    const rawPath = typeof f.path === 'string' ? f.path : '';
    const norm = rawPath.replace(/\\/g, '/');

    try {
      if(f.useGameFileSystem || f.useProjectFileSystem){
        if(!rawPath){
          console.warn('Compile: missing path for NSS on disk/virtual tree — .ncs not written');
          return;
        }
        const dir = path.posix.dirname(norm);
        const outRel = dir === '.' || dir === '' ? ncsFileName : path.posix.join(dir, ncsFileName);
        if(f.useProjectFileSystem){
          const ok = await ProjectFileSystem.writeFile(outRel, ncsBytes);
          if(ok) console.log('Compile: wrote', outRel, '(project)');
          else console.error('Compile: failed writing', outRel);
        }else{
          await KotOR.GameFileSystem.writeFile(outRel, ncsBytes);
          console.log('Compile: wrote', outRel, '(game data)');
        }
        return;
      }

      if(
        KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON &&
        f.protocol === EditorFileProtocol.FILE &&
        rawPath &&
        !f.useSystemFileSystem
      ){
        const outAbs = path.join(path.dirname(rawPath), ncsFileName);
        await ForgeFileSystem.writeUint8ArrayToPath(outAbs, ncsBytes);
        console.log('Compile: wrote', outAbs);
        return;
      }

      if(
        KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER &&
        f.handle &&
        f.useSystemFileSystem
      ){
        console.warn('Compile: browser cannot write next to the opened file — choose where to save the .ncs.');
        try{
          const h = await window.showSaveFilePicker({
            suggestedName: ncsFileName,
            types: [{
              description: 'Compiled NWScript (.ncs)',
              accept: { 'application/octet-stream': ['.ncs'] },
            }],
          });
          const w = await h.createWritable();
          await w.write(new Uint8Array(ncsBytes));
          await w.close();
          console.log('Compile: wrote', h.name);
        }catch(e: any){
          if(e?.name !== 'AbortError') console.error('Compile: save failed', e);
        }
        return;
      }

      console.warn('Compile: .ncs not written — open the NSS from a normal file path or project resource.');
    }catch(e){
      console.error('Compile: failed writing .ncs', e);
    }
  }

  async compile(): Promise<void> {
    console.log('compile', 'parsing...');
    const result = await compileNssSource(this.code, this.resolvedIncludes);
    this.resolvedIncludes = result.includeMap;
    console.log(result.mergedCode);
    if (result.ok && result.ncs) {
      console.log('AST', ForgeState.nwScriptParser.toJSON());
      console.log('compile', 'compiling...');
      this.ncs = result.ncs;
      console.log('compile', 'success');
      console.log(this.ncs);
      await this.writeCompiledNcsToDisk(result.ncs);
      this.processEventListener('onCompile');
    } else if (!result.ok) {
      if (ForgeState.nwScriptParser.errors.length) {
        console.error(`compile Failed with (${ForgeState.nwScriptParser.errors.length}) error!`);
        for(let i = 0; i < ForgeState.nwScriptParser.errors.length; i++){
          const error = ForgeState.nwScriptParser.errors[i];
          console.error(`Error ${i}:`, error.message, error.offender?.source?.first_line, error.offender?.source?.first_column);
        }
      } else {
        console.warn('compile', 'failed: no buffer returned');
      }
    }
  }

  
}
