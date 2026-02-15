import {
  CompletionItem,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  DocumentHighlight,
  DocumentSymbol,
  FoldingRange,
  Hover,
  InitializeParams,
  InitializeResult,
  Location,
  MarkupKind,
  ParameterInformation,
  ProposedFeatures,
  SignatureHelp,
  SignatureInformation,
  SymbolKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  TextEdit,
  WorkspaceSymbol
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { CompletionProvider } from "./completion-provider";
import { DiagnosticProvider } from "./diagnostic-provider";
import { GameVersionDetector } from "./game-version-detector";
import { NWScriptInterpreter } from "./interpreter";
import {
  cleanFunctionDescription,
  findConstant,
  findFunction,
  KOTOR_CONSTANTS,
  KOTOR_FUNCTIONS,
  NWSCRIPT_KEYWORDS,
  NWSCRIPT_TYPES,
  NWScriptConstant,
  NWScriptFunction,
  NWScriptParameter,
  NWScriptType
} from "./kotor-definitions";
import { KOTOR_LIBRARY, TSL_LIBRARY } from "./kotor-scriptlib";
import { setServerConnection } from "./logger";
import { FunctionDeclaration, VariableDeclaration } from "./nwscript-ast";
import { NWScriptParser } from "./nwscript-parser";
import { SemanticAnalyzer } from "./semantic-analyzer";
import { ScopeType } from "./variable-tracker";

// Alias/synonym functions seen in community scripts
const FUNCTION_ALIASES: Record<string, string> = {
  // Map common NWN naming to KOTOR naming
  GetGlobalInt: 'GetGlobalNumber',
  SetGlobalInt: 'SetGlobalNumber',
  ClearGlobalInt: 'SetGlobalNumber' // clearing -> setting to 0, but we only use this to suppress diagnostics
};

/** Scriptlib constant value (int/float/string from parsing). */
type ScriptlibConstantValue = string | number;

// Include-aware scriptlib scanning (KOTOR + TSL)
type IncludeScanResult = {
  functions: (NWScriptFunction & { location?: { line: number; character: number } })[];
  constants: Record<string, ScriptlibConstantValue>;
  constantMeta: { [name: string]: { line: number; character: number } };
};

// Enhanced include tracking for C++-style functionality
interface IncludeInfo {
  name: string;
  line: number;
  character: number;
  exists: boolean;
  resolvedPath?: string;
}

interface IncludeDependencyGraph {
  includes: Map<string, IncludeInfo[]>; // file -> includes it contains
  dependents: Map<string, Set<string>>; // file -> files that depend on it
  circularDeps: string[][]; // detected circular dependency chains
}

const includeCache: Map<string, IncludeScanResult> = new Map();

// ---------------------- NEW GLOBAL SCRIPTLIB LOADING ----------------------
// Parse the *entire* bundled script libraries once at start-up so that
// commonly-used helper includes like k_inc_generic are always recognised,
// even when the current document hasn’t explicitly included them.
type NWScriptFunctionWithLocation = NWScriptFunction & { location?: { line: number; character: number } };
interface GlobalScriptlib {
  functions: NWScriptFunctionWithLocation[];
  constants: Record<string, ScriptlibConstantValue>;
}

const GLOBAL_SCRIPTLIB: GlobalScriptlib = (() => {
  const agg: GlobalScriptlib = { functions: [], constants: {} };
  const visited = new Set<string>();
  // meta stores for quick definition lookup
  const addFunc = (f: NWScriptFunction & { location?: { line: number; character: number } }) => {
    if (!agg.functions.find(x => x.name === f.name)) agg.functions.push(f);
  };
  const addConst = (name: string, value: ScriptlibConstantValue) => {
    if (!(name in agg.constants)) agg.constants[name] = value;
  };

  const loadFromLibrary = (lib: Record<string, Uint8Array>) => {
    Object.keys(lib).forEach(name => {
      if (visited.has(name)) return;
      visited.add(name);
      try {
        const decoded = new TextDecoder('utf-8').decode(lib[name]!);
        const parsed = parseScriptlib(decoded, name);
        parsed.functions.forEach(f => addFunc(f));
        Object.keys(parsed.constants).forEach(k => addConst(k, parsed.constants[k]));
      } catch {
        // ignore decoding errors – individual includes may be binary placeholders
      }
    });
  };

  loadFromLibrary(KOTOR_LIBRARY as Record<string, Uint8Array>);
  loadFromLibrary(TSL_LIBRARY as Record<string, Uint8Array>);
  return agg;
})();

// --------------------------------------------------------------------------

function decodeInclude(name: string): string | null {
  const libBuf: Uint8Array | undefined = (KOTOR_LIBRARY as Record<string, Uint8Array>)[name] ?? (TSL_LIBRARY as Record<string, Uint8Array>)[name];
  if (!libBuf) return null;
  try {
    return new TextDecoder('utf-8').decode(libBuf);
  } catch {
    try {
      // Fallback simple decoding
      let s = '';
      for (let i = 0; i < libBuf.length; i++) s += String.fromCharCode(libBuf[i]!);
      return s;
    } catch {
      return null;
    }
  }
}

function extractIncludes(source: string): string[] {
  const result: string[] = [];
  const includeRegex = /^\s*#include\s+"([A-Za-z0-9_]+)"/gm;
  let m: RegExpExecArray | null;
  while ((m = includeRegex.exec(source)) !== null) {
    if (m[1] && !result.includes(m[1])) result.push(m[1]);
  }
  return result;
}

// Enhanced include extraction with location tracking
function extractIncludesWithLocation(source: string): IncludeInfo[] {
  const result: IncludeInfo[] = [];
  const includeRegex = /^\s*#include\s+"([A-Za-z0-9_]+)"/gm;
  let m: RegExpExecArray | null;

  while ((m = includeRegex.exec(source)) !== null) {
    if (m[1]) {
      const includeName = m[1];

      // Calculate line and character position
      const beforeMatch = source.substring(0, m.index);
      const lineNumber = beforeMatch.split('\n').length - 1;
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const character = m.index - lineStart;

      // Check if include exists
      const exists = decodeInclude(includeName) !== null;

      // Avoid duplicates in the same file
      const existingInclude = result.find(inc => inc.name === includeName);
      if (!existingInclude) {
        result.push({
          name: includeName,
          line: lineNumber,
          character: character,
          exists: exists,
          resolvedPath: exists ? `kotor-forge:/kotor/${includeName}.nss` : undefined
        });
      }
    }
  }

  return result;
}

function sanitizeForParsing(source: string): string {
  // Remove strings and comments to avoid brace miscounts
  let out = "";
  let inBlock = false;
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';

    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false; i++; out += '  '; continue;
      }
      out += ' ';
      continue;
    }

    if (inString) {
      out += ' ';
      if (ch === stringChar && source[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '/' && next === '*') { inBlock = true; i++; out += '  '; continue; }
    if (ch === '/' && next === '/') { // line comment
      // skip to end of line
      while (i < source.length && source[i] !== '\n') { out += ' '; i++; }
      i--; // outer for will increment
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; out += ' '; continue; }
    out += ch;
  }
  return out;
}

function parseScriptlib(source: string, includeName: string): IncludeScanResult {
  const cached = includeCache.get(includeName);
  if (cached) return cached;

  const decoded = source;
  const sanitized = sanitizeForParsing(decoded);

  // Track brace depth to identify global scope
  const globals: { lines: string[] } = { lines: [] };
  {
    const lines = sanitized.split('\n');
    let depth = 0;
    for (const line of lines) {
      const open = (line.match(/\{/g) || []).length;
      const close = (line.match(/\}/g) || []).length;
      if (depth === 0) globals.lines.push(line);
      depth += open;
      depth -= close;
      if (depth < 0) depth = 0;
    }
  }

  const _globalSource = globals.lines.join('\n');

  // Parse functions (prototypes and definitions)
  const functions: (NWScriptFunction & { location?: { line: number; character: number } })[] = [];
  const seenFunc = new Set<string>();
  const funcRegex = /^(?:\s*)(void|int|float|string|object|vector|location)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:;|\{)/gm;
  // Run on full sanitized source to compute positions reliably
  let fm: RegExpExecArray | null;
  while ((fm = funcRegex.exec(sanitized)) !== null) {
    const returnType = fm[1];
    const name = fm[2];
    const paramsStr = fm[3] || '';
    if (seenFunc.has(name!)) continue;
    const parameters: NWScriptParameter[] = [];
    if (paramsStr.trim().length > 0) {
      const parts = paramsStr.split(',');
      for (const raw of parts) {
        const part = raw.trim();
        const pm = part.match(/^(int|float|string|object|vector|location)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*([^,]+))?$/);
        if (pm) {
          parameters.push({ name: pm[2]!, type: pm[1]!, defaultValue: pm[3]?.trim() });
        }
      }
    }
    // Compute line/character from match.index in sanitized (same length as decoded)
    const absoluteIndex = fm.index || 0;
    const pre = decoded.substring(0, absoluteIndex);
    const line = pre.split('\n').length - 1;
    const lastNl = pre.lastIndexOf('\n');
    const character = lastNl === -1 ? absoluteIndex : absoluteIndex - (lastNl + 1);
    functions.push({ name: name!, returnType: returnType!, parameters, description: `${name} from ${includeName}`, category: 'scriptlib', includeFile: includeName, location: { line, character } });
    seenFunc.add(name!);
  }

  // Parse constants at global scope
  const constants: Record<string, ScriptlibConstantValue> = {};
  const constantMeta: { [name: string]: { line: number; character: number } } = {};
  const constRegex = /^(?:\s*)(int|float|string)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/gm;
  let cm: RegExpExecArray | null;
  while ((cm = constRegex.exec(sanitized)) !== null) {
    const type = cm[1];
    const name = cm[2];
    const raw = (cm[3] || '').trim();
    // Basic literal parsing
    if (type === 'int') {
      const intVal = parseInt(raw, 10);
      if (!Number.isNaN(intVal)) constants[name!] = intVal;
    } else if (type === 'float') {
      const floatVal = parseFloat(raw);
      if (!Number.isNaN(floatVal)) constants[name!] = floatVal;
    } else if (type === 'string') {
      constants[name!] = raw.replace(/^['"]|['"]$/g, '');
    }
    // Position
    const absoluteIndex = cm.index || 0;
    const pre = decoded.substring(0, absoluteIndex);
    const line = pre.split('\n').length - 1;
    const lastNl = pre.lastIndexOf('\n');
    const character = lastNl === -1 ? absoluteIndex : absoluteIndex - (lastNl + 1);
    constantMeta[name!] = { line, character };
  }

  const result: IncludeScanResult = { functions, constants, constantMeta };
  includeCache.set(includeName, result);
  return result;
}

function collectIncludesRecursively(rootIncludes: string[], visited: Set<string>): IncludeScanResult {
  const agg: IncludeScanResult = { functions: [], constants: {}, constantMeta: {} };
  const queue: string[] = [...rootIncludes];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (!name || visited.has(name)) continue;
    visited.add(name);
    const text = decodeInclude(name);
    if (!text) continue;
    const parsed = parseScriptlib(text, name);
    // Merge
    parsed.functions.forEach(f => {
      if (!agg.functions.find(x => x.name === f.name)) agg.functions.push(f);
    });
    Object.keys(parsed.constants).forEach(k => {
      if (!(k in agg.constants)) agg.constants[k] = parsed.constants[k];
    });
    Object.keys(parsed.constantMeta).forEach(k => {
      const meta = parsed.constantMeta[k];
      if (meta && !(k in agg.constantMeta)) agg.constantMeta[k] = meta;
    });
    // Follow nested includes
    const nested = extractIncludes(text);
    nested.forEach(n => { if (!visited.has(n)) queue.push(n); });
  }
  return agg;
}

// Enhanced circular dependency detection with path tracking
function detectCircularDependencies(rootIncludes: string[]): IncludeDependencyGraph {
  const graph: IncludeDependencyGraph = {
    includes: new Map(),
    dependents: new Map(),
    circularDeps: []
  };

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function visitInclude(includeName: string): void {
    if (recursionStack.has(includeName)) {
      // Circular dependency detected!
      const circleStart = currentPath.indexOf(includeName);
      const circle = currentPath.slice(circleStart).concat(includeName);
      graph.circularDeps.push(circle);
      return;
    }

    if (visited.has(includeName)) return;

    visited.add(includeName);
    recursionStack.add(includeName);
    currentPath.push(includeName);

    const text = decodeInclude(includeName);
    if (text) {
      const includeInfos = extractIncludesWithLocation(text);
      graph.includes.set(includeName, includeInfos);

      // Track dependents
      includeInfos.forEach(inc => {
        if (!graph.dependents.has(inc.name)) {
          graph.dependents.set(inc.name, new Set());
        }
        graph.dependents.get(inc.name)!.add(includeName);

        // Recursively visit nested includes
        visitInclude(inc.name);
      });
    }

    currentPath.pop();
    recursionStack.delete(includeName);
  }

  // Start DFS from root includes
  rootIncludes.forEach(visitInclude);

  return graph;
}

// Generate include-related diagnostics
function generateIncludeDiagnostics(source: string, _uri: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const includeInfos = extractIncludesWithLocation(source);
  const rootIncludes = includeInfos.map(inc => inc.name);

  // Check for missing includes
  includeInfos.forEach(inc => {
    if (!inc.exists) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: inc.line, character: inc.character },
          end: { line: inc.line, character: inc.character + inc.name.length + 10 } // +10 for #include ""
        },
        message: `Include file '${inc.name}' not found`,
        source: 'Forge-KotOR.js',
        code: 'missing-include'
      });
    }
  });

  // Check for circular dependencies
  const depGraph = detectCircularDependencies(rootIncludes);
  depGraph.circularDeps.forEach(circle => {
    const circleStr = circle.join(' → ');
    // Find the include that starts this circle in the current file
    const firstInclude = includeInfos.find(inc => inc.name === circle[0]);
    if (firstInclude) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: firstInclude.line, character: firstInclude.character },
          end: { line: firstInclude.line, character: firstInclude.character + firstInclude.name.length + 10 }
        },
        message: `Circular dependency detected: ${circleStr}`,
        source: 'Forge-KotOR.js',
        code: 'circular-include'
      });
    }
  });

  // Check for duplicate includes in the same file
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  includeInfos.forEach(inc => {
    if (seen.has(inc.name)) {
      duplicates.add(inc.name);
    } else {
      seen.add(inc.name);
    }
  });

  includeInfos.forEach(inc => {
    if (duplicates.has(inc.name)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: inc.line, character: inc.character },
          end: { line: inc.line, character: inc.character + inc.name.length + 10 }
        },
        message: `Duplicate include: '${inc.name}' is already included in this file`,
        source: 'Forge-KotOR.js',
        code: 'duplicate-include'
      });
    }
  });

  return diagnostics;
}

function getAvailableConstants(text: string): Record<string, ScriptlibConstantValue> {
  try {
    const includes = extractIncludes(text);
    if (includes.length === 0) return {};
    const visited = new Set<string>();
    const agg = collectIncludesRecursively(includes, visited);
    return agg.constants;
  } catch {
    return {};
  }
}

function getAvailableFunctions(text: string): NWScriptFunctionWithLocation[] {
  try {
    const includes = extractIncludes(text);
    if (includes.length === 0) return [];
    const visited = new Set<string>();
    const agg = collectIncludesRecursively(includes, visited);
    return agg.functions;
  } catch {
    return [];
  }
}
// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);
setServerConnection(connection);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.console.log('[Server] Text document manager created');

// Settings interface
interface ForgeNWScriptSettings {
  maxNumberOfProblems: number;
  builtinScriptsDirectory?: string;
}

// Default settings
const defaultSettings: ForgeNWScriptSettings = {
  maxNumberOfProblems: 1000,
  builtinScriptsDirectory: undefined
};
let globalSettings: ForgeNWScriptSettings = defaultSettings;

// Cache for settings of all open documents
const documentSettings: Map<string, Thenable<ForgeNWScriptSettings>> = new Map();

// Helper function to resolve builtin script URIs based on configuration
function resolveBuiltinScriptUri(includeName: string, currentDocumentUri: string, settings: ForgeNWScriptSettings): string {
  if (settings.builtinScriptsDirectory) {
    // Use configured directory - convert to file:// URI if it's a local path
    const baseUri = settings.builtinScriptsDirectory;
    if (baseUri.startsWith('file://')) {
      return `${baseUri}/${includeName}.nss`;
    } else if (baseUri.startsWith('/') || baseUri.match(/^[A-Za-z]:/)) {
      // Absolute path
      return `file://${baseUri.replace(/\\/g, '/')}/${includeName}.nss`;
    } else {
      // Relative path - resolve relative to current document
      const currentDir = currentDocumentUri.substring(0, currentDocumentUri.lastIndexOf('/'));
      return `${currentDir}/${baseUri}/${includeName}.nss`;
    }
  } else {
    // Fall back to kotor-forge:// scheme for virtual document content
    return `kotor-forge:/kotor/${includeName}.nss`;
  }
}

// Language data storage (using imported KOTOR definitions)
const constants: NWScriptConstant[] = KOTOR_CONSTANTS;
const functions: NWScriptFunction[] = KOTOR_FUNCTIONS;
const types: NWScriptType[] = NWSCRIPT_TYPES;

// Initialize language data (now using imported KOTOR definitions)
async function initializeLanguageData() {
  try {
    connection.console.info(`[LanguageData] Loaded ${constants.length} KOTOR constants`);
    connection.console.info(`[LanguageData] Loaded ${functions.length} KOTOR functions`);
    connection.console.info(`[LanguageData] Loaded ${types.length} KOTOR types`);
    connection.console.info("[LanguageData] Forge-KotOR.js language data initialized successfully with KOTOR definitions");
  } catch (error) {
    connection.console.error(`[LanguageData] Failed to initialize language data: ${error}`);
  }
}

connection.onInitialize((params: InitializeParams) => {
  connection.console.info('[Initialize] Initializing Forge-KotOR.js NWScript server');

  // Check client capabilities
  hasConfigurationCapability = !!(params.capabilities.workspace && params.capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(params.capabilities.workspace && params.capabilities.workspace.workspaceFolders);

  connection.console.log(`[Initialize] Client capabilities - Configuration: ${hasConfigurationCapability}, WorkspaceFolders: ${hasWorkspaceFolderCapability}`);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '(']
      },
      hoverProvider: true,
      definitionProvider: true,
      declarationProvider: true,
      typeDefinitionProvider: true,
      implementationProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ',']
      },
      renameProvider: {
        prepareProvider: true
      },
      foldingRangeProvider: true,
      codeActionProvider: true,
      // Add debug capabilities
      executeCommandProvider: {
        commands: [
          'nwscript.startDebugging',
          'nwscript.setBreakpoint',
          'nwscript.removeBreakpoint',
          'nwscript.stepOver',
          'nwscript.stepIn',
          'nwscript.stepOut',
          'nwscript.continue',
          'nwscript.pause',
          'nwscript.stop'
        ]
      }
    },
  };

  connection.console.log('[Initialize] Server capabilities configured');

  // Initialize language data
  initializeLanguageData();

  return result;
});

connection.onInitialized(() => {
  connection.console.info("[Initialize] Forge-KotOR.js NWScript server initialized");

  // Initialize the interpreter
  interpreter = new NWScriptInterpreter(connection, documents);
  connection.console.info("[Initialize] NWScript interpreter initialized");

  // Register debug request handlers (arrow wrappers for correct handler typing)
  connection.onRequest('nwscript/debug/setBreakpoints', (params: { source: { path: string }; breakpoints: Array<{ line?: number }> }) => interpreter.handleSetBreakpoints(params));
  connection.onRequest('nwscript/debug/start', (params: { scriptPath: string }) => interpreter.handleStart(params));
  connection.onRequest('nwscript/debug/continue', () => interpreter.handleContinue());
  connection.onRequest('nwscript/debug/next', () => interpreter.handleNext());
  connection.onRequest('nwscript/debug/stepIn', () => interpreter.handleStepIn());
  connection.onRequest('nwscript/debug/stepOut', () => interpreter.handleStepOut());
  connection.onRequest('nwscript/debug/pause', () => interpreter.handlePause());
  connection.onRequest('nwscript/debug/stackTrace', () => interpreter.handleStackTrace());
  connection.onRequest('nwscript/debug/scopes', (params: { frameId?: number }) => interpreter.handleScopes(params));
  connection.onRequest('nwscript/debug/variables', (params: { variablesReference: number }) => interpreter.handleVariables(params));
  connection.onRequest('nwscript/debug/evaluate', (params: { expression: string; frameId?: number }) => interpreter.handleEvaluate(params));
  connection.onRequest('nwscript/debug/stop', () => interpreter.handleStop());
  connection.console.log("[Initialize] Debug request handlers registered");

  // Register capability if client supports configuration
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type);
    connection.console.log("[Initialize] Configuration change notifications registered");
  }
});

// Document settings management
connection.onDidChangeConfiguration(change => {
  connection.console.log('[Configuration] Configuration changed');

  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    const settings = change.settings as { kotorForge?: { nwscript?: ForgeNWScriptSettings } } | undefined;
    globalSettings = (settings?.kotorForge?.nwscript ?? defaultSettings) as ForgeNWScriptSettings;
  }

  documents.all().forEach(validateTextDocument);
});

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let interpreter: NWScriptInterpreter;

function getDocumentSettings(resource: string): Thenable<ForgeNWScriptSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'kotorForge.nwscript'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

documents.onDidOpen(e => {
  connection.console.log(`[Document] Opened: ${e.document.uri} languageId=${e.document.languageId} version=${e.document.version}`);
});

documents.onDidClose(e => {
  connection.console.log(`[Document] Closed: ${e.document.uri}`);
  documentSettings.delete(e.document.uri);
});

// Validation
documents.onDidChangeContent(change => {
  // Update interpreter analysis for this document
  const document = change.document;
  const text = document.getText();
  connection.console.log(`[DocumentChange] Document changed: ${document.uri} (${text.length} characters)`);

  // Check if game version comment is present
  const gameVersionInfo = GameVersionDetector.detectGameVersion(text);
  connection.console.log(`[DocumentChange] Game version: ${gameVersionInfo.version} (explicit: ${gameVersionInfo.hasExplicitVersion})`);

  interpreter.updateAnalysisForDocument(document.uri, text);
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const startTime = Date.now();
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();
  let diagnostics: Diagnostic[] = [];

  connection.console.log(`[Validation] Starting validation for: ${textDocument.uri}`);

  try {
    // Generate include-related diagnostics first
    const includeDiagnostics = generateIncludeDiagnostics(text, textDocument.uri);
    diagnostics.push(...includeDiagnostics);

    // Get include-aware functions and constants for semantic analysis
    const scriptlibFunctions = getAvailableFunctions(text);
    const scriptlibConstants = getAvailableConstants(text);

    connection.console.log(`[Validation] Loaded ${scriptlibFunctions.length} scriptlib functions, ${Object.keys(scriptlibConstants).length} constants`);
    connection.console.log(`[Validation] Found ${includeDiagnostics.length} include-related issues`);

    // Parse the document using the NWScript parser with error recovery
    const parseResult = NWScriptParser.parseWithErrors(text);
    const ast = parseResult.program;

    // Add any parse errors as diagnostics
    parseResult.errors.forEach(error => {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: Math.max(0, error.location.line - 1), character: error.location.column },
          end: { line: Math.max(0, error.location.line - 1), character: error.location.column + 1 }
        },
        message: error.message,
        source: 'Forge-KotOR.js',
        code: 'parse-error'
      });
    });

    connection.console.log(`[Validation] Parsing ${textDocument.uri}: ${parseResult.errors.length === 0 ? 'success' : 'failed'}`);

    // If parsing failed completely, fall back to basic validation
    if (!ast && parseResult.errors.length === 0) {
      connection.console.log("[Validation] No AST generated, falling back to basic validation");
      const basicDiagnostics = performBasicValidation(text);
      diagnostics.push(...basicDiagnostics);
    }

    // If we have a valid AST, perform comprehensive semantic analysis
    if (ast) {
      // Detect game version from source text
      const gameVersionInfo = GameVersionDetector.detectGameVersion(text);
      connection.console.log(`[Validation] Game version detected: ${gameVersionInfo.version} (explicit: ${gameVersionInfo.hasExplicitVersion ? 'yes' : 'no'})`);

      // Filter functions and constants based on detected game version
      const gameFilteredFunctions = gameVersionInfo.version === 'kotor2' ?
                                   functions.filter(f => f.category !== 'kotor1-only') :
                                   gameVersionInfo.version === 'kotor1' ?
                                   functions.filter(f => f.category !== 'kotor2-only') :
                                   functions;

      const gameFilteredConstants = gameVersionInfo.version === 'kotor2' ?
                                   constants.filter(c => c.category !== 'kotor1-only') :
                                   gameVersionInfo.version === 'kotor1' ?
                                   constants.filter(c => c.category !== 'kotor2-only') :
                                   constants;

      const analyzer = new SemanticAnalyzer(scriptlibFunctions, scriptlibConstants, gameVersionInfo.version);
      const semanticErrors = analyzer.analyze(ast, text);

      // Use a diagnostic provider to improve error messages
      const diagnosticProvider = new DiagnosticProvider(
        [...gameFilteredFunctions, ...scriptlibFunctions],
        [
          ...gameFilteredConstants,
          ...Object.entries(scriptlibConstants).map(([name, value]) => ({
            name,
            type: typeof value === 'number' ? 'int' : 'string',
            value,
            description: 'Scriptlib constant',
            category: 'scriptlib'
          }))
        ]
      );

      const enhancedDiagnostics = diagnosticProvider.enhanceDiagnostics(semanticErrors);

      // Add contextual information
      enhancedDiagnostics.forEach(diag => {
        diagnosticProvider.addContextualInfo(diag, text);
      });

      // Add game version warning if not specified
      const versionWarning = GameVersionDetector.generateMissingVersionWarning(text);
      if (versionWarning) {
        enhancedDiagnostics.push({
          severity: versionWarning.severity,
          range: {
            start: { line: versionWarning.range.start.line, character: versionWarning.range.start.column },
            end: { line: versionWarning.range.end.line, character: versionWarning.range.end.column }
          },
          message: versionWarning.message,
          source: 'Forge-KotOR.js',
          code: versionWarning.code
        });
      }

      diagnostics.push(...enhancedDiagnostics);
    }

  } catch (error) {
    // Fallback to basic validation if everything else fails
    connection.console.error(`[Validation] Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    const basicDiagnostics = performBasicValidation(text);
    diagnostics = basicDiagnostics;
  }

  // Limit diagnostics to prevent overwhelming the user
  const limitedDiagnostics = diagnostics.slice(0, settings.maxNumberOfProblems);
  const duration = Date.now() - startTime;

  connection.console.log(`[Validation] Document validation: ${limitedDiagnostics.length} diagnostics`);
  connection.console.log(`[Validation] Document validation duration: ${duration}ms`);

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: limitedDiagnostics });
}

/**
 * Fallback basic validation for when AST parsing fails
 */
function performBasicValidation(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = text.split('\n');

  // Basic brace and parentheses balance checking
  let braceBalance = 0;
  let parenBalance = 0;
  let inBlockComment = false;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Preserve string state across lines; do not reset here
    /*if (!line.trim().endsWith('\\')) {
      inString = false;
      stringChar = '';
    }*/

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';
      const nextChar = j < line.length - 1 ? line[j + 1] : '';

      // Handle string literals
      if (!inBlockComment) {
        if ((char === '"' || char === "'") && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
      }

      // Handle comments (skip parsing inside strings)
      if (!inString) {
        // Block comments
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          j++; // Skip next character
          continue;
        }
        if (char === '*' && nextChar === '/' && inBlockComment) {
          inBlockComment = false;
          j++; // Skip next character
          continue;
        }

        // Line comments
        if (char === '/' && nextChar === '/') {
          break; // Rest of line is comment
        }

        // Skip parsing inside comments
        if (inBlockComment) continue;

        // Track braces and parentheses
        if (char === '{') braceBalance++;
        else if (char === '}') braceBalance--;
        else if (char === '(') parenBalance++;
        else if (char === ')') parenBalance--;

        // Check for negative balance (closing without opening)
        if (braceBalance < 0) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: i, character: j },
              end: { line: i, character: j + 1 }
            },
            message: 'Unexpected closing brace - no matching opening brace',
            source: 'Forge-KotOR.js',
            code: 'unmatched-brace'
          });
          braceBalance = 0; // Reset to prevent cascade errors
        }

        if (parenBalance < 0) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: i, character: j },
              end: { line: i, character: j + 1 }
            },
            message: 'Unexpected closing parenthesis - no matching opening parenthesis',
            source: 'Forge-KotOR.js',
            code: 'unmatched-paren'
          });
          parenBalance = 0; // Reset to prevent cascade errors
        }
      }
    }

    // Check for unterminated strings
    if (inString && !line.trim().endsWith('\\')) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length }
        },
        message: 'Unterminated string literal',
        source: 'Forge-KotOR.js',
        code: 'unterminated-string'
      });
      inString = false; // Reset for next line
    }
  }

  // Check for unmatched braces at end of document
  if (braceBalance > 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: lines.length - 1, character: 0 },
        end: { line: lines.length - 1, character: lines[lines.length - 1]?.length || 0 }
      },
      message: `${braceBalance} unclosed brace(s) - missing closing brace(s)`,
      source: 'Forge-KotOR.js',
      code: 'unclosed-braces'
    });
  }

  if (parenBalance > 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: lines.length - 1, character: 0 },
        end: { line: lines.length - 1, character: lines[lines.length - 1]?.length || 0 }
      },
      message: `${parenBalance} unclosed parenthesis(es) - missing closing parenthesis(es)`,
      source: 'Forge-KotOR.js',
      code: 'unclosed-parens'
    });
  }

  return diagnostics;
}

// Completion provider
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const startTime = Date.now();
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log(`[Completion] Completion requested for unknown document: ${params.textDocument.uri}`);
    return [];
  }

  connection.console.log(`[Completion] Completion requested at ${params.position.line}:${params.position.character} in ${params.textDocument.uri}`);

  try {
    const text = document.getText();

    // Detect game version for context-aware completions
    const gameVersionInfo = GameVersionDetector.detectGameVersion(text);

    // Get include-aware functions and constants
    const scriptlibFunctions = getAvailableFunctions(text);
    const scriptlibConstants = getAvailableConstants(text);

    // Get game-specific functions and constants based on detected version
    const gameFunctions = gameVersionInfo.version === 'kotor2' ?
                         [...functions.filter(f => f.category !== 'kotor1-only')] :
                         gameVersionInfo.version === 'kotor1' ?
                         [...functions.filter(f => f.category !== 'kotor2-only')] :
                         [...functions];

    const gameConstants = gameVersionInfo.version === 'kotor2' ?
                         [...constants.filter(c => c.category !== 'kotor1-only')] :
                         gameVersionInfo.version === 'kotor1' ?
                         [...constants.filter(c => c.category !== 'kotor2-only')] :
                         [...constants];

    // Combine all available functions and constants
    const allFunctions = [
      ...gameFunctions,
      ...scriptlibFunctions,
      ...GLOBAL_SCRIPTLIB.functions
    ];

    const allConstants = [
      ...gameConstants,
      ...Object.entries(scriptlibConstants).map(([name, value]) => ({
        name,
        type: typeof value === 'number' ? 'int' : 'string',
        value,
        description: 'Scriptlib constant',
        category: 'scriptlib'
      })),
      ...Object.entries(GLOBAL_SCRIPTLIB.constants).map(([name, value]) => ({
        name,
        type: typeof value === 'number' ? 'int' : 'string',
        value,
        description: 'Global scriptlib constant',
        category: 'scriptlib'
      }))
    ];

    // Use the advanced completion provider
    const completionProvider = new CompletionProvider(allFunctions, allConstants, types, NWSCRIPT_KEYWORDS);
    const completions = completionProvider.provideCompletions(document, params.position);

    const duration = Date.now() - startTime;
    connection.console.log(`[Completion] ${params.textDocument.uri}:${params.position.line}:${params.position.character}: ${completions.length} completions`);
    connection.console.log(`[Completion] Completion duration: ${duration}ms`);

    return completions;

  } catch (error) {
    connection.console.error(`[Completion] Completion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
});


// Completion resolve provider
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// Hover provider
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log(`[Hover] Hover requested for unknown document: ${params.textDocument.uri}`);
    return null;
  }

  connection.console.log(`[Hover] Hover requested at ${params.position.line}:${params.position.character} in ${params.textDocument.uri}`);

  const text = document.getText();
  const position = params.position;
  const lines = text.split('\n');

  if (position.line >= lines.length) {
    return null;
  }

  const line = lines[position.line];
  const wordRange = getWordRangeAtPosition(line || '', position.character);

  if (!wordRange) {
    return null;
  }

  const word = (line || '').substring(wordRange.start, wordRange.end);

  // Check if it's a constant
  const constant = findConstant(word);
  if (constant) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${constant.name}** (${constant.type})\n\n${constant.description || 'KOTOR constant'}\n\n*Value:* \`${constant.value}\`${constant.category ? `\n\n*Category:* ${constant.category}` : ''}`
      },
      range: {
        start: { line: position.line, character: wordRange.start },
        end: { line: position.line, character: wordRange.end }
      }
    };
  }

  // Check if it's a function (core first)
  const func = findFunction(word) || (FUNCTION_ALIASES[word] ? findFunction(FUNCTION_ALIASES[word]!) : undefined);
  if (func) {
    const params = func.parameters.map((p: NWScriptParameter) =>
      p.defaultValue ? `${p.type} ${p.name} = ${p.defaultValue}` : `${p.type} ${p.name}`
    ).join(', ');

    const cleanDescription = cleanFunctionDescription(func.description || '');

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${func.name}** (${func.returnType})\n\n\`\`\`nwscript\n${func.returnType} ${func.name}(${params})\n\`\`\`\n\n${cleanDescription || 'KOTOR function'}${func.category ? `\n\n*Category:* ${func.category}` : ''}`
      },
      range: {
        start: { line: position.line, character: wordRange.start },
        end: { line: position.line, character: wordRange.end }
      }
    };
  }

  // Check if it's a scriptlib function
  const documentScriptlibFunctions = getAvailableFunctions(text);
  const scriptlibFunc = documentScriptlibFunctions.find((f: NWScriptFunction) => f.name === word) || GLOBAL_SCRIPTLIB.functions.find((f: NWScriptFunction) => f.name === word) || (FUNCTION_ALIASES[word] ? (documentScriptlibFunctions.find((f: NWScriptFunction) => f.name === FUNCTION_ALIASES[word]) || GLOBAL_SCRIPTLIB.functions.find((f: NWScriptFunction) => f.name === FUNCTION_ALIASES[word]!)) : undefined);
  if (scriptlibFunc) {
    const params = (scriptlibFunc.parameters || []).map((p: NWScriptParameter) =>
      p.defaultValue ? `${p.type} ${p.name} = ${p.defaultValue}` : `${p.type} ${p.name}`
    ).join(', ');

    const cleanDescription = cleanFunctionDescription(scriptlibFunc.description || '');

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${scriptlibFunc.name}** (${scriptlibFunc.returnType})${scriptlibFunc.includeFile ? ` from \`${scriptlibFunc.includeFile}\`` : ''}\n\n\`\`\`nwscript\n${scriptlibFunc.returnType} ${scriptlibFunc.name}(${params})\n\`\`\`\n\n${cleanDescription || 'NWScript scriptlib function'}${scriptlibFunc.category ? `\n\n*Category:* ${scriptlibFunc.category}` : ''}`
      },
      range: {
        start: { line: position.line, character: wordRange.start },
        end: { line: position.line, character: wordRange.end }
      }
    };
  }

  // Check for scriptlib constants in document or global
  const scriptlibConsts = getAvailableConstants(text);
  if (Object.prototype.hasOwnProperty.call(scriptlibConsts, word) || Object.prototype.hasOwnProperty.call(GLOBAL_SCRIPTLIB.constants, word)) {
    const val = Object.prototype.hasOwnProperty.call(scriptlibConsts, word) ? scriptlibConsts[word] : GLOBAL_SCRIPTLIB.constants[word];
    const type = typeof val === 'number' ? 'int' : typeof val === 'string' ? 'string' : 'unknown';
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${word}** (${type})\n\n*Value:* \`${val}\``
      },
      range: {
        start: { line: position.line, character: wordRange.start },
        end: { line: position.line, character: wordRange.end }
      }
    };
  }

  // Check if it's a variable with an inferred value (via interpreter analysis)
  const inferredValue = interpreter.getVariableValue(params.textDocument.uri, word, position);
  if (inferredValue) {
    let content = `**${word}** (${inferredValue.type})`;

    // For known values
    if (inferredValue.isKnown) {
      let valueDisplay = '';

      if (inferredValue.type === 'string') {
        valueDisplay = `"${inferredValue.value}"`;
      } else {
        valueDisplay = `${inferredValue.value}`;
      }

      content += `\n\n*Inferred value:* \`${valueDisplay}\``;
    }
    // For conditional values
    else if (inferredValue.conditions && inferredValue.conditions.length > 0) {
      content += '\n\n*Conditional values:*';

      inferredValue.conditions.forEach(condition => {
        let condValueDisplay = '';

        if (condition.value.type === 'string') {
          condValueDisplay = `"${condition.value.value}"`;
        } else {
          condValueDisplay = `${condition.value.value}`;
        }

        content += `\n- When \`${condition.condition}\`: \`${condValueDisplay}\``;
      });
    }
    // For unknown values
    else {
      content += '\n\n*Value could not be determined statically*';

      // Try to provide context about the variable
      const scopeType = interpreter.getScopeTypeAt(params.textDocument.uri, position);
      if (scopeType !== null) {
        if (scopeType === ScopeType.Function) {
          content += '\n\nVariable is defined in function scope';
        } else if (scopeType === ScopeType.Loop) {
          content += '\n\nVariable is modified in a loop';
        } else if (scopeType === ScopeType.Conditional) {
          content += '\n\nVariable has different values in conditional branches';
        }
      }
    }

    // Show scope information
    // Scope string for hover
    const st = interpreter.getScopeTypeAt(params.textDocument.uri, position);
    if (st !== null) content += `\n\n*Scope:* ${ScopeType[st]}`;

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content
      },
      range: {
        start: { line: position.line, character: wordRange.start },
        end: { line: position.line, character: wordRange.end }
      }
    };
  }

  return null;
});

// Helper function to get word range at position
function getWordRangeAtPosition(line: string, character: number): { start: number; end: number } | null {
  if (!line || character < 0 || character >= line.length) {
    return null;
  }

  // Find word boundaries
  let start = character;
  let end = character;

  // Move start backward to find word start
  while (start > 0) {
    const prevChar = line[start - 1];
    if (!prevChar || !/[a-zA-Z0-9_]/.test(prevChar)) break;
    start--;
  }

  // Move end forward to find word end
  while (end < line.length) {
    const char = line[end];
    if (!char || !/[a-zA-Z0-9_]/.test(char)) break;
    end++;
  }

  if (start === end) {
    return null;
  }

  return { start, end };
}

// Definition provider
connection.onDefinition(async (params: TextDocumentPositionParams) => {
  connection.console.log(`[Definition] Request uri=${params.textDocument.uri} line=${params.position.line} char=${params.position.character}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log('[Definition] Document not found');
    return null;
  }
  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;
  const line = lines[params.position.line] || '';

  // Get settings for URI resolution
  const settings = await getDocumentSettings(params.textDocument.uri);

  // Check if we're clicking on an include directive
  const includeMatch = line.match(/^\s*#include\s+"([A-Za-z0-9_]+)"/);
  if (includeMatch && includeMatch[1]) {
    const includeName = includeMatch[1];
    const includeStart = line.indexOf('"') + 1;
    const includeEnd = includeStart + includeName.length;

    // Check if cursor is within the include name
    if (params.position.character >= includeStart && params.position.character <= includeEnd) {
      const includeText = decodeInclude(includeName);
      if (includeText) {
        return {
          uri: resolveBuiltinScriptUri(includeName, params.textDocument.uri, settings),
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          }
        };
      } else {
        // Include file doesn't exist - return null so LSP shows "No definition found"
        return null;
      }
    }
  }

  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;
  const word = line.substring(range.start, range.end);

  // Try functions first (document includes, then global)
  const docFuncs = getAvailableFunctions(text);
  const func = docFuncs.find(f => f.name === word) ?? GLOBAL_SCRIPTLIB.functions.find(f => f.name === word);
  if (func && func.includeFile && func.location) {
    const uri = resolveBuiltinScriptUri(func.includeFile, params.textDocument.uri, settings);
    return {
      uri,
      range: {
        start: { line: func.location.line, character: func.location.character },
        end: { line: func.location.line, character: func.location.character + String(func.name).length }
      }
    };
  }

  // Then constants (document includes, then global)
  const docConsts = getAvailableConstants(text) as Record<string, ScriptlibConstantValue>;
  const inDocConsts: boolean = Boolean(Object.prototype.hasOwnProperty.call(docConsts, word));
  const inGlobalConsts: boolean = Boolean(Object.prototype.hasOwnProperty.call(GLOBAL_SCRIPTLIB.constants as Record<string, ScriptlibConstantValue>, word));
  if (inDocConsts || inGlobalConsts) {
    // We don't currently store per-document const positions. Use global if available.
    // Try to find in any parsed include by scanning cache
    for (const [inc, parsed] of includeCache.entries()) {
      const loc: { line: number; character: number } | undefined = parsed.constantMeta?.[word];
      if (loc) {
        const uri = resolveBuiltinScriptUri(inc, params.textDocument.uri, settings);
        return {
          uri,
          range: {
            start: { line: loc.line, character: loc.character },
            end: { line: loc.line, character: loc.character + word.length }
          }
        };
      }
    }
  }

  return null;
});

// Declaration provider (shows where something is declared)
connection.onDeclaration((params: TextDocumentPositionParams) => {
  connection.console.log(`[Declaration] Request uri=${params.textDocument.uri} line=${params.position.line} char=${params.position.character}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log('[Declaration] Document not found');
    return null;
  }
  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;
  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;
  const word = line.substring(range.start, range.end);

  // Parse the document to find function declarations
  try {
    const parseResult = NWScriptParser.parseWithErrors(text);
    if (parseResult.program) {
      // Look for function declarations in the current document
      for (const decl of parseResult.program.body) {
        if (decl instanceof FunctionDeclaration && decl.name === word) {
          return {
            uri: params.textDocument.uri,
            range: {
              start: { line: decl.range.start.line, character: decl.range.start.column },
              end: { line: decl.range.start.line, character: decl.range.start.column + decl.name.length }
            }
          };
        }
      }
    }
  } catch (error) {
    connection.console.error(`[Declaration] Parse error: ${error}`);
  }

  // Fall back to definition provider behavior
  return null;
});

// Helper function to check if a position is in a comment
function isInComment(line: string, characterIndex: number): boolean {
  // Check for single-line comments (//)
  const commentIndex = line.indexOf('//');
  if (commentIndex !== -1 && characterIndex >= commentIndex) {
    return true;
  }

  // TODO: Add support for multi-line comments /* */ if needed
  // For now, NWScript primarily uses // comments

  return false;
}

// References provider
connection.onReferences((params) => {
  connection.console.log(`[References] Request uri=${params.textDocument.uri} line=${params.position.line} char=${params.position.character}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log('[References] Document not found');
    return [];
  }
  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';
  const wordRange = getWordRangeAtPosition(line, params.position.character);
  if (!wordRange) return [];
  const word = line.substring(wordRange.start, wordRange.end);

  const results: Location[] = [];
  const wordRegex = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');

  for (let li = 0; li < lines.length; li++) {
    const l = lines[li] || '';
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(l)) !== null) {
      // Skip if this match is in a comment
      if (!isInComment(l, m.index)) {
        results.push({
          uri: params.textDocument.uri,
          range: {
            start: { line: li, character: m.index },
            end: { line: li, character: m.index + word.length }
          }
        });
      }
    }
  }

  return results;
});

// Document symbol provider
connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const text = document.getText();

  try {
    const parseResult = NWScriptParser.parseWithErrors(text);
    if (!parseResult.program) return [];

    const symbols: DocumentSymbol[] = [];

    // Add functions
    for (const decl of parseResult.program.body) {
      if (decl instanceof FunctionDeclaration) {
        const symbol: DocumentSymbol = {
          name: decl.name,
          detail: `${decl.returnType.name} ${decl.name}(${decl.parameters.map(p => `${p.paramType.name} ${p.name}`).join(', ')})`,
          kind: SymbolKind.Function,
          range: {
            start: { line: decl.range.start.line, character: decl.range.start.column },
            end: { line: decl.range.end.line, character: decl.range.end.column }
          },
          selectionRange: {
            start: { line: decl.range.start.line, character: decl.range.start.column },
            end: { line: decl.range.start.line, character: decl.range.start.column + decl.name.length }
          }
        };
        symbols.push(symbol);
      } else if (decl instanceof VariableDeclaration) {
        const symbol: DocumentSymbol = {
          name: decl.name,
          detail: `${decl.varType.name} ${decl.name}`,
          kind: decl.isConstant ? SymbolKind.Constant : SymbolKind.Variable,
          range: {
            start: { line: decl.range.start.line, character: decl.range.start.column },
            end: { line: decl.range.end.line, character: decl.range.end.column }
          },
          selectionRange: {
            start: { line: decl.range.start.line, character: decl.range.start.column },
            end: { line: decl.range.start.line, character: decl.range.start.column + decl.name.length }
          }
        };
        symbols.push(symbol);
      }
    }

    return symbols;
  } catch (error) {
    connection.console.error(`[DocumentSymbol] Error: ${error}`);
    return [];
  }
});

// Workspace symbol provider
connection.onWorkspaceSymbol((params) => {
  const query = params.query.toLowerCase();
  const symbols: WorkspaceSymbol[] = [];

  // Search through all open documents
  for (const document of documents.all()) {
    const text = document.getText();
    try {
      const parseResult = NWScriptParser.parseWithErrors(text);
      if (!parseResult.program) continue;

      for (const decl of parseResult.program.body) {
        if (decl instanceof FunctionDeclaration) {
          if (decl.name.toLowerCase().includes(query)) {
            symbols.push({
              name: decl.name,
              kind: SymbolKind.Function,
              location: {
                uri: document.uri,
                range: {
                  start: { line: decl.range.start.line, character: decl.range.start.column },
                  end: { line: decl.range.end.line, character: decl.range.end.column }
                }
              }
            });
          }
        } else if (decl instanceof VariableDeclaration) {
          if (decl.name.toLowerCase().includes(query)) {
            symbols.push({
              name: decl.name,
              kind: decl.isConstant ? SymbolKind.Constant : SymbolKind.Variable,
              location: {
                uri: document.uri,
                range: {
                  start: { line: decl.range.start.line, character: decl.range.start.column },
                  end: { line: decl.range.end.line, character: decl.range.end.column }
                }
              }
            });
          }
        }
      }
    } catch (error) {
      connection.console.error(`[WorkspaceSymbol] Parse error for ${document.uri}: ${error}`);
    }
  }

  return symbols;
});

// Code action provider
connection.onCodeAction((_params) => {
  // This would be where we add quick fixes
  return [];
});

// Provide include content for virtual URIs
connection.onRequest('kotor-forge/includeText', (params: { include: string }): { text: string } | null => {
  connection.console.log(`[IncludeText] Include text requested: ${params.include}`);
  const text = decodeInclude(params.include);
  if (!text) {
    connection.console.log(`[IncludeText] Include not found: ${params.include}`);
    return null;
  }
  connection.console.log(`[IncludeText] Include text provided: ${params.include} (${text.length} chars)`);
  return { text };
});

// Signature help provider
connection.onSignatureHelp((params: TextDocumentPositionParams): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const position = params.position;
  const lines = text.split('\n');

  if (position.line >= lines.length) {
    return null;
  }

  const line = lines[position.line];
  if (!line) return null;
  const beforeCursor = line.substring(0, position.character);

  // Find the function call context
  const functionCallMatch = beforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*$/);
  if (!functionCallMatch) {
    return null;
  }

  const functionName = functionCallMatch[1];
  if (!functionName) return null;
  const alias = FUNCTION_ALIASES[functionName];
  const func = findFunction(functionName) || (alias ? findFunction(alias as string) : undefined);

  if (!func) {
    return null;
  }

  // Count commas to determine active parameter
  const afterFunctionName = beforeCursor.substring(beforeCursor.lastIndexOf(functionName) + functionName.length);
  const openParenIndex = afterFunctionName.indexOf('(');
  if (openParenIndex === -1) {
    return null;
  }

  const insideParens = afterFunctionName.substring(openParenIndex + 1);
  const commaCount = (insideParens.match(/,/g) || []).length;
  const activeParameter = Math.min(commaCount, func.parameters.length - 1);

  // Build parameter information
  const parameterInfos: ParameterInformation[] = func.parameters.map(param => ({
    label: `${param.type} ${param.name}${param.defaultValue ? ` = ${param.defaultValue}` : ''}`,
    documentation: param.description || `Parameter of type ${param.type}`
  }));

  const signature: SignatureInformation = {
    label: `${func.returnType} ${func.name}(${func.parameters.map(p =>
      `${p.type} ${p.name}${p.defaultValue ? ` = ${p.defaultValue}` : ''}`
    ).join(', ')})`,
    documentation: cleanFunctionDescription(func.description) || `Function returning ${func.returnType}`,
    parameters: parameterInfos
  };

  return {
    signatures: [signature],
    activeSignature: 0,
    activeParameter: activeParameter >= 0 ? activeParameter : 0
  };
});

// Type Definition provider
connection.onTypeDefinition((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;

  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;

  const word = line.substring(range.start, range.end);

  // Try to find type definition for variables
  try {
    const parseResult = NWScriptParser.parseWithErrors(text);
    if (parseResult.program) {
      for (const decl of parseResult.program.body) {
        if (decl instanceof VariableDeclaration && decl.name === word) {
          // Return the type definition location (same as declaration for now)
          return {
            uri: params.textDocument.uri,
            range: {
              start: { line: decl.range.start.line, character: decl.range.start.column },
              end: { line: decl.range.start.line, character: decl.range.start.column + decl.varType.name.length }
            }
          };
        }
      }
    }
  } catch (error) {
    connection.console.error(`[TypeDefinition] Parse error: ${error}`);
  }

  return null;
});

// Implementation provider
connection.onImplementation((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;

  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;

  const word = line.substring(range.start, range.end);

  // Find function implementations (non-prototype functions)
  try {
    const parseResult = NWScriptParser.parseWithErrors(text);
    if (parseResult.program) {
      const implementations: Location[] = [];

      for (const decl of parseResult.program.body) {
        if (decl instanceof FunctionDeclaration && decl.name === word && !decl.isPrototype) {
          implementations.push({
            uri: params.textDocument.uri,
            range: {
              start: { line: decl.range.start.line, character: decl.range.start.column },
              end: { line: decl.range.start.line, character: decl.range.start.column + decl.name.length }
            }
          });
        }
      }

      return implementations.length > 0 ? implementations : null;
    }
  } catch (error) {
    connection.console.error(`[Implementation] Parse error: ${error}`);
  }

  return null;
});

// Document Highlight provider
connection.onDocumentHighlight((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return [];

  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return [];

  const word = line.substring(range.start, range.end);
  const highlights: DocumentHighlight[] = [];

  // Find all occurrences of the word in the document
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i] || '';
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(currentLine)) !== null) {
      const startChar = match.index;
      highlights.push({
        range: {
          start: { line: i, character: startChar },
          end: { line: i, character: startChar + word.length }
        },
        kind: 1 // Text highlight kind
      });
    }
  }

  return highlights;
});

// Rename provider
connection.onPrepareRename((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;

  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;

  const word = line.substring(range.start, range.end);

  // Check if the symbol can be renamed (user-defined functions/variables)
  try {
    const parseResult = NWScriptParser.parseWithErrors(text);
    if (parseResult.program) {
      for (const decl of parseResult.program.body) {
        if ((decl instanceof FunctionDeclaration && decl.name === word) ||
            (decl instanceof VariableDeclaration && decl.name === word)) {
          return {
            start: { line: params.position.line, character: range.start },
            end: { line: params.position.line, character: range.end }
          };
        }
      }
    }
  } catch (error) {
    connection.console.error(`[PrepareRename] Parse error: ${error}`);
  }

  return null;
});

connection.onRenameRequest((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const lines = text.split('\n');
  if (params.position.line >= lines.length) return null;

  const line = lines[params.position.line] || '';
  const range = getWordRangeAtPosition(line, params.position.character);
  if (!range) return null;

  const oldName = line.substring(range.start, range.end);
  const changes: TextEdit[] = [];

  // Find all occurrences of the old name and replace with new name
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i] || '';
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(currentLine)) !== null) {
      const startChar = match.index;
      changes.push({
        range: {
          start: { line: i, character: startChar },
          end: { line: i, character: startChar + oldName.length }
        },
        newText: params.newName
      });
    }
  }

  return {
    changes: {
      [params.textDocument.uri]: changes
    }
  };
});

// Folding Range provider
connection.onFoldingRanges((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const lines = text.split('\n');
  const foldingRanges: FoldingRange[] = [];

  const braceStack: number[] = [];
  let commentStart: number | null = null;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    // Handle block comments
    if (line.includes('/*') && !inBlockComment) {
      commentStart = i;
      inBlockComment = true;
    }
    if (line.includes('*/') && inBlockComment) {
      if (commentStart !== null && i > commentStart) {
        foldingRanges.push({
          startLine: commentStart,
          endLine: i,
          kind: 'comment'
        });
      }
      commentStart = null;
      inBlockComment = false;
    }

    // Handle braces for code folding
    if (line.includes('{')) {
      braceStack.push(i);
    }
    if (line.includes('}') && braceStack.length > 0) {
      const startLine = braceStack.pop();
      if (startLine !== undefined && i > startLine) {
        foldingRanges.push({
          startLine: startLine,
          endLine: i,
          kind: 'region'
        });
      }
    }
  }

  return foldingRanges;
});

// Make the text document manager listen on the connection
connection.console.log('[Server] Documents listening on connection');
documents.listen(connection);

// Listen on the connection
connection.console.info('[Server] Language server listening; ready for requests');
connection.listen();
