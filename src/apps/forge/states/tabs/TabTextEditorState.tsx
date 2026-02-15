import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import React from "react";

import { TabScriptCompileLogState, TabScriptErrorLogState, TabScriptInspectorState, TabScriptFindReferencesState, TextReferenceMatch } from ".";

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
  #tabFindReferencesState: TabScriptFindReferencesState;
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

  bookmarks: { line: number; description: string }[] = [];
  snippets: { name: string; content: string }[] = [];
  bookmarkDecorations: string[] = [];

  getLanguageId(): string {
    // Use manual override if set
    if(this.manualLanguageId) {
      return this.manualLanguageId;
    }

    // Otherwise, detect from file extension
    if(!this.file) return 'plaintext';
    const ext = this.file.ext != null ? KotOR.ResourceTypes.getKeyByValue(this.file.ext).toLowerCase() : '';
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
    this.#tabFindReferencesState = new TabScriptFindReferencesState( { parentTab: this } );
    this.#southTabManager.addTab( this.#tabErrorLogState );
    this.#southTabManager.addTab( this.#tabCompileLogState );
    this.#southTabManager.addTab( this.#tabScriptInspectorState );
    this.#southTabManager.addTab( this.#tabFindReferencesState );

    this.setContentView(<TabTextEditor tab={this}></TabTextEditor>);
    const textDecoder = new TextDecoder();
    const nwScriptBuffer = ForgeState.nwscript_nss ?? new Uint8Array(0);
    this.nwScriptParser = new NWScriptParser(textDecoder.decode(nwScriptBuffer));
    this.openFile();

    this.loadSnippets();

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
      return new Promise<void>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;

        if(file.ext === KotOR.ResourceTypes.ncs){
          file.readFile().then( (buffer) => {
            this.ncs = buffer.buffer;
            this.nwScript = new KotOR.NWScript(this.ncs);
            this.nwScript.name = file?.getFilename().split('.')[0] || '';
            this.code = this.nwScript.toAssembly();
            log.debug('ncs assembly', this.code);
            this.triggerLinterTimeout();
            this.loadBookmarks();
            this.processEventListener('onEditorFileLoad');
            resolve();
          });
        }else{
          file.readFile().then( (response) => {
            const decoder = new TextDecoder('utf8');
            this.code = decoder.decode(response.buffer);
            this.triggerLinterTimeout();

            this.loadBookmarks();

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

  getWordAtCursor(): string {
    if (this.editor && this.monaco) {
      const position = this.editor.getPosition();
      const model = this.editor.getModel();
      if (position && model) {
        const word = model.getWordAtPosition(position);
        return word?.word || "";
      }
    }

    if (this.code) {
      return getWordAtIndex(this.code, Math.max(0, (this.code.length || 1) - 1));
    }

    return "";
  }

  findAllReferencesInFile(searchTerm?: string): TextReferenceMatch[] {
    const term = (searchTerm ?? this.getWordAtCursor() ?? "").trim();
    if (!term) {
      this.#tabFindReferencesState.setResults("", []);
      return [];
    }

    const matches = findAllReferencesInText(this.code || "", term);
    this.#tabFindReferencesState.setResults(term, matches);
    this.#tabFindReferencesState.show();
    return matches;
  }

  async findReferencesInInstallation(searchTerm?: string): Promise<void> {
    const term = (searchTerm ?? this.getWordAtCursor() ?? "").trim();
    if (!term) return;

    const modal = new ModalReferenceSearchOptionsState({
      onApply: async (options) => {
        const resources = createKeyResources();
        let results: ReferenceSearchResult[] = [];
        const extStr = this.file?.ext != null ? KotOR.ResourceTypes.getKeyByValue(this.file.ext).toLowerCase() : "";
        if (extStr === "dlg") {
          results = await findConversationReferences(resources, term, options);
        } else if (extStr === "tlk") {
          results = await findStrRefReferences(resources, term, options);
        } else {
          results = await findScriptReferences(resources, term, options);
        }

        const resultsModal = new ModalFileResultsState({
          results,
          title: `References for ${term}`,
        });
        resultsModal.attachToModalManager(ForgeState.modalManager);
        resultsModal.open();
      },
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  }

  setEditor(editor: monacoEditor.editor.IStandaloneCodeEditor){
    this.editor = editor;
    this.updateTabSize();
    this.updateBookmarkDecorations();
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
    this.updateBookmarkDecorations();
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

  getBookmarkStorageKey(): string {
    const fileKey = this.file?.getPath?.() || this.file?.getFilename?.() || 'untitled';
    return `forge.textEditor.bookmarks.${fileKey}`;
  }

  loadBookmarks(): void {
    if(typeof window === 'undefined' || !window.localStorage) return;
    const key = this.getBookmarkStorageKey();
    const raw = window.localStorage.getItem(key);
    if(raw){
      try{
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed)){
          this.bookmarks = parsed
            .filter((b) => typeof b?.line === 'number')
            .map((b) => ({ line: b.line, description: String(b.description || '') }));
        }
      }catch{
        this.bookmarks = [];
      }
    }else{
      this.bookmarks = [];
    }
    this.updateBookmarkDecorations();
    this.processEventListener('onBookmarksChanged');
  }

  saveBookmarks(): void {
    if(typeof window === 'undefined' || !window.localStorage) return;
    const key = this.getBookmarkStorageKey();
    window.localStorage.setItem(key, JSON.stringify(this.bookmarks));
  }

  addBookmarkAtCursor(description?: string): void {
    const line = this.editor?.getPosition()?.lineNumber || 1;
    const safeDescription = description?.trim() || `Bookmark at line ${line}`;
    const existing = this.bookmarks.findIndex((b) => b.line === line);
    if(existing >= 0){
      this.bookmarks[existing] = { line, description: safeDescription };
    }else{
      this.bookmarks = [...this.bookmarks, { line, description: safeDescription }]
        .sort((a, b) => a.line - b.line);
    }
    this.saveBookmarks();
    this.updateBookmarkDecorations();
    this.processEventListener('onBookmarksChanged');
  }

  removeBookmark(line: number): void {
    this.bookmarks = this.bookmarks.filter((b) => b.line !== line);
    this.saveBookmarks();
    this.updateBookmarkDecorations();
    this.processEventListener('onBookmarksChanged');
  }

  clearBookmarks(): void {
    this.bookmarks = [];
    this.saveBookmarks();
    this.updateBookmarkDecorations();
    this.processEventListener('onBookmarksChanged');
  }

  goToLine(line: number): void {
    if(!this.editor) return;
    this.editor.revealLineInCenter(line);
    this.editor.setPosition({ lineNumber: line, column: 1 });
    this.editor.focus();
  }

  updateBookmarkDecorations(): void {
    if(!this.editor || !this.monaco) return;
    const decorations = this.bookmarks.map((bookmark) => ({
      range: new this.monaco.Range(bookmark.line, 1, bookmark.line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'forge-text-editor__bookmark',
        glyphMarginHoverMessage: { value: bookmark.description || `Bookmark at line ${bookmark.line}` },
      }
    }));
    this.bookmarkDecorations = this.editor.deltaDecorations(this.bookmarkDecorations, decorations);
  }

  loadSnippets(): void {
    if(typeof window === 'undefined' || !window.localStorage) return;
    const raw = window.localStorage.getItem('forge.textEditor.snippets');
    if(raw){
      try{
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed)){
          this.snippets = parsed
            .filter((s) => typeof s?.name === 'string')
            .map((s) => ({ name: String(s.name || ''), content: String(s.content || '') }));
        }
      }catch{
        this.snippets = [];
      }
    }else{
      this.snippets = [];
    }
    this.processEventListener('onSnippetsChanged');
  }

  saveSnippets(): void {
    if(typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem('forge.textEditor.snippets', JSON.stringify(this.snippets));
  }

  addSnippet(name: string, content: string): void {
    const trimmedName = name.trim();
    if(!trimmedName) return;
    const existing = this.snippets.findIndex((s) => s.name.toLowerCase() === trimmedName.toLowerCase());
    if(existing >= 0){
      this.snippets[existing] = { name: trimmedName, content };
    }else{
      this.snippets = [...this.snippets, { name: trimmedName, content }]
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    this.saveSnippets();
    this.processEventListener('onSnippetsChanged');
  }

  removeSnippet(name: string): void {
    this.snippets = this.snippets.filter((s) => s.name !== name);
    this.saveSnippets();
    this.processEventListener('onSnippetsChanged');
  }

  insertSnippet(content: string): void {
    if(this.editor && this.monaco){
      const selection = this.editor.getSelection();
      const range = selection
        ? new this.monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn)
        : new this.monaco.Range(1, 1, 1, 1);
      this.editor.executeEdits('snippet', [{ range, text: content, forceMoveMarkers: true }]);
      this.editor.focus();
    }else{
      this.setCode(`${this.code}${content}`);
    }
  }

  _linter_timeout: ReturnType<typeof setTimeout> | undefined;

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
        log.error('LYT linting error:', e as Error);
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

          log.debug('nwScriptParser.errors', this.nwScriptParser.errors);
          const markers: monacoEditor.editor.IMarkerData[] = [ ];
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
        }catch(e: unknown){
          log.debug('triggerLinter error', e);
          const err = e as { hash?: { loc: { first_line: number; first_column: number; last_line: number; last_column: number } }; lineNumber?: number; columnNumber?: number; name?: string; message?: string };
          if(err?.hash){
            log.debug('err', err.lineNumber, err.columnNumber, err.name, err.message, err.hash);
            log.debug('err json', JSON.stringify(e));
            const markers = [{
              severity: this.monaco.MarkerSeverity.Error,
              startLineNumber: err.hash.loc.first_line,
              startColumn: err.hash.loc.first_column + 1,
              endLineNumber: err.hash.loc.last_line,
              endColumn: err.hash.loc.last_column + 1,
              message: err.message ?? 'Unknown error'
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
    return new Promise<Map<string, string>>( (resolve, _reject) => {
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
        const nestedIncludes = [...source.matchAll(/#include\s*"?([\w.]+)"?/g)];
        log.debug('nestedIncludes', nestedIncludes);
        for(const m of nestedIncludes){
          const nestedResref = m[1];
          if(nestedResref && !includeMap.has(nestedResref)){
            log.debug('loading include', nestedResref);
            await loadInclude(nestedResref);
          }
        }

        if(!includeMap.has(resref)){
          includeMap.set(resref, source);
          includeOrder.push(resref);
        }
      };

      void (async () => {
        // seed includes from the root code
        const rootIncludes = [...code.matchAll(/#include\s*"?([\w.]+)"?/g)];
        log.debug('rootIncludes', rootIncludes);
        for(const m of rootIncludes){
          const resref = m[1];
          if(resref && !includeMap.has(resref)){
            log.debug('loading include', resref);
            await loadInclude(resref);
          }
        }

        log.debug('includeMap.keys', [...includeMap.keys()]);
        resolve(includeMap);
      })();
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
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

  async compile(): Promise<boolean> {
    log.debug('compile', 'parsing...');

    // Resolve #include files and prepend them before parsing to mirror NWScript behavior
    this.resolvedIncludes = await this.resolveIncludes(this.code, this.resolvedIncludes);
    const mergedCode = [ [...this.resolvedIncludes.values()].join("\n"), this.code ].join("\n");
    log.debug('mergedCode', mergedCode);
    ForgeState.nwScriptParser.parseScript(mergedCode);
    if(!ForgeState.nwScriptParser.errors.length){
      log.debug('AST', ForgeState.nwScriptParser.toJSON());
      const nwScriptCompiler = new NWScriptCompiler(ForgeState.nwScriptParser.program as CompilerProgramNode);
      log.debug('compile', 'compiling...');
      const buffer = nwScriptCompiler.compile();
      if(buffer){
        this.ncs = buffer;
        log.debug('compile', 'success');
        log.debug('ncs', this.ncs);
        this.processEventListener('onCompile');
        return true;
      }
      log.warn('compile', 'failed: no buffer returned');
      return false;
    }
    log.error(`compile Failed with (${ForgeState.nwScriptParser.errors.length}) error!`);
    for(let i = 0; i < ForgeState.nwScriptParser.errors.length; i++){
      const error = ForgeState.nwScriptParser.errors[i];
      log.error(`Error ${i}:`, error.message, error.offender?.source?.first_line, error.offender?.source?.first_column);
    }
    return false;

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
