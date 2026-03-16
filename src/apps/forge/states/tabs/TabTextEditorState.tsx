import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import React from "react";

import { TabScriptCompileLogState } from "./TabScriptCompileLogState";
import { TabScriptErrorLogState } from "./TabScriptErrorLogState";
import { TabScriptFindReferencesState, type TextReferenceMatch } from "./TabScriptFindReferencesState";
import { TabScriptInspectorState } from "./TabScriptInspectorState";

import { TabTextEditor } from "@/apps/forge/components/tabs/tab-text-editor/TabTextEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import { findAllReferencesInText, getWordAtIndex, createKeyResources, findScriptReferences, findStrRefReferences, findConversationReferences } from "@/apps/forge/helpers/ReferenceFinder";
import type { ReferenceSearchResult } from "@/apps/forge/helpers/ReferenceFinderCore";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";

// import { NWScriptCompiler } from "@/nwscript/NWScriptCompiler";

import * as KotOR from "@/apps/forge/KotOR";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { LYTLanguageService } from "@/apps/forge/states/LYTLanguageService";
import { ModalFileResultsState } from "@/apps/forge/states/modal/ModalFileResultsState";
import { ModalReferenceSearchOptionsState } from "@/apps/forge/states/modal/ModalReferenceSearchOptionsState";
import { NWScriptLanguageService } from "@/apps/forge/states/NWScriptLanguageService";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { SemanticFunctionNode } from "@/nwscript/compiler/ASTSemanticTypes";
import type { CompilerProgramNode } from "@/nwscript/compiler/CompilerNodeTypes";
import { NWScriptCompiler } from "@/nwscript/compiler/NWScriptCompiler";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Forge);

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

        if(file.ext == 'ncs'){
          file.readFile().then( (buffer) => {
            this.ncs = buffer.buffer;
            this.nwScript = new KotOR.NWScript(this.ncs);
            this.nwScript.name = file?.getFilename().split('.')[0] || '';
            this.code = this.nwScript.toAssembly();
            console.log(this.code);
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

  resolveIncludes( code: string = ``, includeMap: Map<string, string> = new Map(), includeOrder: string[] = [] ){
    return new Promise<Map<string, string>>( async (resolve, reject) => {
      const visited = new Set<string>();

      const loadInclude = async (resref: string) => {
        if(!resref || visited.has(resref)) return;
        visited.add(resref);

        const key = KotOR.KEYManager.Key.getFileKey(resref, KotOR.ResourceTypes.nss);
        if(!key) return;
        const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
        if(!buffer) return;

        const textDecoder = new TextDecoder();
        const source = textDecoder.decode(buffer);

        // Resolve nested includes first so they appear before this include
        const nestedIncludes = [...source.matchAll(/#include\s*"?([\w\.]+)"?/g)];
        console.log(nestedIncludes);
        for(const m of nestedIncludes){
          const nestedResref = m[1];
          if(nestedResref && !includeMap.has(nestedResref)){
            console.log('loading include', nestedResref);
            await loadInclude(nestedResref);
          }
        }

        if(!includeMap.has(resref)){
          includeMap.set(resref, source);
          includeOrder.push(resref);
        }
      };

      // seed includes from the root code
      const rootIncludes = [...code.matchAll(/#include\s*"?([\w\.]+)"?/g)];
      console.log(rootIncludes);
      for(const m of rootIncludes){
        const resref = m[1];
        if(resref && !includeMap.has(resref)){
          console.log('loading include', resref);
          await loadInclude(resref);
        }
      }

      console.log(includeMap.keys());
      resolve(includeMap);
    });
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

  async compile(): Promise<void> {
    console.log('compile', 'parsing...');

    // Resolve #include files and prepend them before parsing to mirror NWScript behavior
    this.resolvedIncludes = await this.resolveIncludes(this.code, this.resolvedIncludes);
    const mergedCode = [ [...this.resolvedIncludes.values()].join("\n"), this.code ].join("\n");
    console.log(mergedCode);
    ForgeState.nwScriptParser.parseScript(mergedCode);
    if(!ForgeState.nwScriptParser.errors.length){
      console.log('AST', ForgeState.nwScriptParser.toJSON());
      const nwScriptCompiler = new NWScriptCompiler(ForgeState.nwScriptParser.program as any);
      console.log('compile', 'compiling...');
      let buffer = nwScriptCompiler.compile();
      if(buffer){
        this.ncs = buffer;
        console.log('compile', 'success');
        console.log(this.ncs);
        this.processEventListener('onCompile');
      }else{
        console.warn('compile', 'failed: no buffer returned');
      }
    }else{
      console.error(`compile Failed with (${ForgeState.nwScriptParser.errors.length}) error!`);
      for(let i = 0; i < ForgeState.nwScriptParser.errors.length; i++){
        const error = ForgeState.nwScriptParser.errors[i];
        console.error(`Error ${i}:`, error.message, error.offender?.source?.first_line, error.offender?.source?.first_column);
      }
    }

      // const nss_path = path.parse(this.file.path);
      // if(!this.nwScriptParser.errors.length){
      //   NotificationManager.Notify(NotificationManager.Types.INFO, `Compiling... - ${nss_path.name}.nss`);
      //   const nwScriptCompiler = new NWScriptCompiler(this.nwScriptParser.ast);
      //   const compiledBuffer = nwScriptCompiler.compile();
      //   fs.writeFileSync(path.join(nss_path.dir, `${nss_path.name}.ncs`), compiledBuffer);
      //   this.ncsTab.setNCSData(compiledBuffer);
      //   NotificationManager.Notify(NotificationManager.Types.SUCCESS, `Compile: Success! - ${nss_path.name}.ncs`);
      // }else{
      //   NotificationManager.Notify(NotificationManager.Types.ALERT, `Parse: Failed! - with errors (${this.nwScriptParser.errors.length})`);
      // }
  }

}
