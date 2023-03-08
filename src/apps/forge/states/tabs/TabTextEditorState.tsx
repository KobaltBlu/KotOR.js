import React from "react";
import { TabTextEditor } from "../../components/tabs/TabTextEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import { StringDecoder } from "string_decoder";
import { EditorTabManager } from "../../managers/EditorTabManager";
import { ForgeState } from "../ForgeState";
import { NWScriptCompiler } from "../../../../nwscript/NWScriptCompiler";
import { NWScriptParser } from "../../../../nwscript/NWScriptParser";
import { TabScriptCompileLogState, TabScriptErrorLogState, TabScriptInspectorState } from ".";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

import * as KotOR from "../../KotOR";
import isBuffer from "is-buffer";

export class TabTextEditorState extends TabState {

  tabName: string = `TEXT`;
  code: string = ``;

  nwScriptParser: NWScriptParser;
  ncs: Buffer = Buffer.alloc(0);

  #southTabManager = new EditorTabManager();
  #tabErrorLogState: TabScriptErrorLogState;
  #tabCompileLogState: TabScriptCompileLogState;
  #tabScriptInspectorState: TabScriptInspectorState;
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: typeof monacoEditor;

  resolvedIncludes: Map<string, string> = new Map();

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
    this.nwScriptParser = new NWScriptParser(ForgeState.nwscript_nss.toString());
    this.openFile();
  }

  openFile(file?: EditorFile){
    return new Promise<void>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( (response) => {
          let decoder = new StringDecoder('utf8');
          this.code = decoder.write(response.buffer);
          this.triggerLinterTimeout();
          
          this.processEventListener('onEditorFileLoad');
          resolve();
        });
      }
    });

  }

  getSouthTabManager(){
    return this.#southTabManager;
  }

  setCode(code: string = ``){
    this.code = code;
    this.triggerLinterTimeout();
  }

  setEditor(editor: monacoEditor.editor.IStandaloneCodeEditor){
    this.editor = editor;
  }

  setMonaco(monaco: typeof monacoEditor){
    this.monaco = monaco;
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
    this.resolveIncludes(this.code, this.resolvedIncludes).then( (resolvedIncludes) => {
      this.resolvedIncludes = resolvedIncludes;
      try{
        this.nwScriptParser.parseScript( [ [...this.resolvedIncludes.values()].join("\n"), this.code ].join("\n") );
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
  }

  resolveIncludes( code: string = ``, includeMap: Map<string, string> = new Map(), includeOrder: string[] = [] ){
    return new Promise<Map<string, string>>( async (resolve, reject) => {
      const includes = [...code.matchAll(/#include\s?"(\w+)"/g)];
      for(let i = 0; i < includes.length; i++){
        const match = includes[i];
        const resref = match[1];
        if(!includeMap.has(resref)){
          if(resref){
            const key = KotOR.KEYManager.Key.GetFileKey(resref, KotOR.ResourceTypes.nss);
            if(key){
              const buffer = await KotOR.KEYManager.Key.GetFileDataAsync(key);
              if(isBuffer(buffer)){
                const source = buffer.toString();
                includeMap.set(resref, source);
                includeOrder.push(resref);
                await this.resolveIncludes(source, includeMap, includeOrder);
              }
            }
          }
        }else{
          // let index = includeOrder.indexOf(resref);
          // if(index >= 0){
          //   includeOrder.splice(index, 1);
          //   includeOrder.unshift(resref);
          // }
        }
      }
      resolve(includeMap);
    });
  }

  getExportBuffer(): Buffer {
    return Buffer.from(this.code);
  }

  async compile(): Promise<void> {
    console.log('compile', 'parsing...');
    ForgeState.nwScriptParser.parseScript(this.code);
    if(!ForgeState.nwScriptParser.errors.length){
      const nwScriptCompiler = new NWScriptCompiler(ForgeState.nwScriptParser.ast);
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
