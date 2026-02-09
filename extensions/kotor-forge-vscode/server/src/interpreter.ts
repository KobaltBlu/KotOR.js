import * as fs from 'fs';
import * as path from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  Connection,
  Position,
  TextDocuments
} from 'vscode-languageserver/node';
import { findConstant, findFunction, KOTOR_CONSTANTS } from './kotor-definitions';
import { Program } from './nwscript-ast';
import { NWScriptParser, ParseError } from './nwscript-parser';
import { NWScriptRuntime, NWScriptValue } from './nwscript-runtime';
import { InferredValue, ScopeType, VariableTracker } from './variable-tracker';

/**
 * NWScript Variable represents a variable during script execution
 */
export interface NWScriptVariable {
  name: string;
  type: string;
  value: any;
  hasChildren?: boolean;
}

/**
 * NWScript Stack Frame represents a function call in the call stack
 */
export interface NWScriptStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
  locals: Map<string, NWScriptVariable>;
}

/**
 * NWScript Breakpoint represents a debugging breakpoint
 */
export interface NWScriptBreakpoint {
  file: string;
  line: number;
  condition?: string;
  verified: boolean;
}

/**
 * Production-ready NWScript Interpreter Service
 * Handles debugging operations for NWScript with proper parsing and execution
 */
export class NWScriptInterpreter {
  private connection: Connection;
  private documents: TextDocuments<TextDocument>;
  private breakpoints: Map<string, NWScriptBreakpoint[]> = new Map();

  // Execution state
  private runtime?: NWScriptRuntime;
  private program?: Program;
  private currentFile: string = '';
  private currentLine: number = 0;
  private currentColumn: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private stepMode: 'none' | 'into' | 'over' | 'out' = 'none';

  // Include file resolution
  private includeSearchPaths: string[] = [];
  private resolvedIncludes: Map<string, Program> = new Map();

  // Static analysis state for hover/value computation
  private analysisTrackers: Map<string, VariableTracker> = new Map();

  constructor(connection: Connection, documents: TextDocuments<TextDocument>) {
    this.connection = connection;
    this.documents = documents;

    // Set up default include search paths
    this.includeSearchPaths = [
      './includes',
      '../includes',
      './nwscript/include',
      '../nwscript/include'
    ];
  }

  /**
   * Update internal analysis model for a document.
   */
  public updateAnalysisForDocument(uri: string, text: string): void {
    try {
      let tracker = this.analysisTrackers.get(uri);
      if (!tracker) {
        tracker = new VariableTracker();
        this.analysisTrackers.set(uri, tracker);
      }
      tracker.parseDocument(text);
    } catch (e) {
      this.connection.console.error(`updateAnalysisForDocument failed: ${e}`);
    }
  }

  /**
   * Get the best-known value for an identifier at a position in a document.
   */
  public getVariableValue(uri: string, name: string, position: Position): InferredValue | null {
    const tracker = this.analysisTrackers.get(uri);
    if (!tracker) return null;
    return tracker.getValueAtPosition(name, position);
  }

  /**
   * Get the scope type for a position in a document.
   */
  public getScopeTypeAt(uri: string, position: Position): ScopeType | null {
    const tracker = this.analysisTrackers.get(uri);
    if (!tracker) return null;
    const scope = tracker.findScopeAtLine(position.line);
    return scope?.type ?? null;
  }

  /**
   * Handle a request to set breakpoints
   */
  public handleSetBreakpoints(params: any): any {
    const source = params.source;
    const clientLines = params.breakpoints.map((bp: any) => bp.line);

    try {
      const filePath = source.path;

      // Create verified breakpoints
      const breakpoints: NWScriptBreakpoint[] = clientLines.map((line: number, i: number) => ({
        file: filePath,
        line,
        verified: true // We'll verify against the AST later
      }));

      this.breakpoints.set(filePath, breakpoints);

      this.connection.console.log(`Set ${clientLines.length} breakpoints for ${filePath}`);

      // Return breakpoints in expected format
      return {
        breakpoints: breakpoints.map((bp, i) => ({
          id: i,
          verified: bp.verified,
          line: bp.line
        }))
      };
    } catch (error) {
      this.connection.console.error(`Failed to set breakpoints: ${error}`);
      return {
        breakpoints: [],
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Start debugging a script
   */
  public async handleStart(params: { scriptPath: string }): Promise<any> {
    try {
      this.currentFile = params.scriptPath;
      this.currentLine = 1;
      this.currentColumn = 1;
      this.isRunning = true;
      this.isPaused = true;
      this.stepMode = 'none';

      // Parse the main script
      this.program = await this.parseScriptFile(this.currentFile);

      // Resolve all includes
      await this.resolveIncludes(this.program);

      // Create runtime with breakpoint callback
      this.runtime = new NWScriptRuntime();

      this.connection.console.log(`Started debugging session for: ${params.scriptPath}`);

      return { success: true };
    } catch (error) {
      this.connection.console.error(`Failed to start debugging: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Continue execution until next breakpoint or end
   */
  public async handleContinue(): Promise<any> {
    if (!this.runtime || !this.program) {
      return { success: false, error: 'No active debugging session' };
    }

    try {
      this.isPaused = false;
      this.stepMode = 'none';

      // Execute with breakpoint callback
      const result = this.runtime.execute(this.program, (line, column) => {
        this.currentLine = line;
        this.currentColumn = column;

        // Check if we hit a breakpoint
        const fileBreakpoints = this.breakpoints.get(this.currentFile) || [];
        const hitBreakpoint = fileBreakpoints.some(bp => bp.line === line && bp.verified);

        if (hitBreakpoint) {
          this.isPaused = true;
          return true; // Stop execution
        }

        return false; // Continue execution
      });

      if (this.isPaused) {
        return {
          success: true,
          stopReason: 'breakpoint',
          line: this.currentLine,
          column: this.currentColumn,
          file: this.currentFile
        };
      } else {
        this.isRunning = false;
        return {
          success: true,
          stopReason: 'end',
          line: this.currentLine,
          column: this.currentColumn,
          file: this.currentFile,
          result: result.value
        };
      }
    } catch (error) {
      this.connection.console.error(`Runtime error: ${error}`);
      this.isRunning = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Step over the current line
   */
  public async handleNext(): Promise<any> {
    if (!this.runtime || !this.program) {
      return { success: false, error: 'No active debugging session' };
    }

    try {
      this.isPaused = false;
      this.stepMode = 'over';
      this.runtime.setStepMode('over');

      // Continue execution with step mode
      return await this.handleContinue();
    } catch (error) {
      this.connection.console.error(`Step over error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Step into a function or include
   */
  public async handleStepIn(): Promise<any> {
    if (!this.runtime || !this.program) {
      return { success: false, error: 'No active debugging session' };
    }

    try {
      this.isPaused = false;
      this.stepMode = 'into';
      this.runtime.setStepMode('into');

      // Continue execution with step mode
      return await this.handleContinue();
    } catch (error) {
      this.connection.console.error(`Step in error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Step out of the current function
   */
  public async handleStepOut(): Promise<any> {
    if (!this.runtime || !this.program) {
      return { success: false, error: 'No active debugging session' };
    }

    try {
      this.isPaused = false;
      this.stepMode = 'out';
      this.runtime.setStepMode('out');

      // Continue execution with step mode
      return await this.handleContinue();
    } catch (error) {
      this.connection.console.error(`Step out error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Pause execution
   */
  public async handlePause(): Promise<any> {
    try {
      this.isPaused = true;
      this.stepMode = 'none';

      return {
        success: true,
        line: this.currentLine,
        column: this.currentColumn,
        file: this.currentFile
      };
    } catch (error) {
      this.connection.console.error(`Pause error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get stack trace information
   */
  public async handleStackTrace(): Promise<any> {
    if (!this.runtime) {
      return {
        stackFrames: [],
        totalFrames: 0
      };
    }

    try {
      const callStack = this.runtime.getCallStack();

      const stackFrames = callStack.map((functionName, index) => ({
        id: index,
        name: functionName,
        source: {
          name: path.basename(this.currentFile),
          path: this.currentFile
        },
        line: this.currentLine,
        column: this.currentColumn
      }));

      return {
        stackFrames,
        totalFrames: stackFrames.length
      };
    } catch (error) {
      this.connection.console.error(`Stack trace error: ${error}`);
      return {
        stackFrames: [],
        totalFrames: 0
      };
    }
  }

  /**
   * Get available scopes for a stack frame
   */
  public handleScopes(params: any): any {
    const frameId = params.frameId || 0;

    return {
      scopes: [
        {
          name: 'Local',
          variablesReference: frameId + 1000,
          expensive: false
        },
        {
          name: 'Global',
          variablesReference: 1,
          expensive: false
        },
        {
          name: 'Constants',
          variablesReference: 2,
          expensive: false
        }
      ]
    };
  }

  /**
   * Get variables for a scope
   */
  public async handleVariables(params: { variablesReference: number }): Promise<any> {
    const variablesReference = params.variablesReference;
    const variables: any[] = [];

    try {
      if (variablesReference === 1) {
        // Global scope
        if (this.runtime) {
          const environment = this.runtime.getCurrentEnvironment();
          const allVars = environment.getAll();

          allVars.forEach((value, name) => {
            // Filter out constants
            const constant = findConstant(name);
            if (!constant) {
              variables.push({
                name,
                value: this.formatValue(value),
                type: value.type,
                variablesReference: 0
              });
            }
          });
        }
      } else if (variablesReference === 2) {
        // Constants scope
        for (let i = 0; i < Math.min(50, KOTOR_CONSTANTS.length); i++) {
          const constant = KOTOR_CONSTANTS[i];
          if (constant) {
            variables.push({
              name: constant.name,
              value: String(constant.value),
              type: constant.type,
              variablesReference: 0
            });
          }
        }
      } else if (variablesReference >= 1000) {
        // Local scope for specific frame
        // For now, just return global scope since we don't track per-frame locals yet
        if (this.runtime) {
          const environment = this.runtime.getCurrentEnvironment();
          const allVars = environment.getAll();

          allVars.forEach((value, name) => {
            variables.push({
              name,
              value: this.formatValue(value),
              type: value.type,
              variablesReference: 0
            });
          });
        }
      }

      return { variables };
    } catch (error) {
      this.connection.console.error(`Variables error: ${error}`);
      return { variables: [] };
    }
  }

  /**
   * Evaluate an expression in the current context
   */
  public async handleEvaluate(params: { expression: string, frameId?: number }): Promise<any> {
    if (!this.runtime) {
      return {
        result: 'No active debugging session',
        variablesReference: 0,
        type: 'error'
      };
    }

    try {
      const { expression } = params;

      // Try to get variable value
      const environment = this.runtime.getCurrentEnvironment();

      if (environment.has(expression)) {
        const value = environment.get(expression);
        return {
          result: this.formatValue(value),
          variablesReference: 0,
          type: value.type
        };
      }

      // Check if it's a KOTOR constant
      const constant = findConstant(expression);
      if (constant) {
        return {
          result: String(constant.value),
          variablesReference: 0,
          type: constant.type
        };
      }

      // Check if it's a KOTOR function
      const func = findFunction(expression);
      if (func) {
        return {
          result: `${func.returnType} ${func.name}(...)`,
          variablesReference: 0,
          type: 'function'
        };
      }

      // Try to parse and evaluate as expression
      try {
        const exprProgram = NWScriptParser.parse(`void main() { ${expression}; }`);
        // This would require more complex evaluation logic
        return {
          result: `Cannot evaluate complex expression: ${expression}`,
          variablesReference: 0,
          type: 'unknown'
        };
      } catch (parseError) {
        return {
          result: `Unknown identifier: ${expression}`,
          variablesReference: 0,
          type: 'unknown'
        };
      }
    } catch (error) {
      this.connection.console.error(`Evaluate error: ${error}`);
      return {
        result: `Error: ${error instanceof Error ? error.message : String(error)}`,
        variablesReference: 0,
        type: 'error'
      };
    }
  }

  /**
   * Stop the debug session
   */
  public async handleStop(): Promise<any> {
    try {
      this.isRunning = false;
      this.isPaused = false;
      this.stepMode = 'none';
      this.runtime = undefined;
      this.program = undefined;
      this.breakpoints.clear();
      this.resolvedIncludes.clear();

      this.connection.console.log('Stopped debugging session');
      return { success: true };
    } catch (error) {
      this.connection.console.error(`Stop error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Parse a script file into an AST
   */
  private async parseScriptFile(filePath: string): Promise<Program> {
    try {
      // Get script content
      let content: string;
      const fileUri = this.getFileUri(filePath);
      const document = this.documents.get(fileUri);

      if (document) {
        content = document.getText();
      } else if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
      } else {
        throw new Error(`Script file not found: ${filePath}`);
      }

      // Parse with production parser
      const program = NWScriptParser.parse(content);

      this.connection.console.log(`Parsed script: ${filePath}`);
      return program;
    } catch (error) {
      if (error instanceof ParseError) {
        this.connection.console.error(`Parse error in ${filePath} at line ${error.location.line}: ${error.message}`);
      } else {
        this.connection.console.error(`Error parsing ${filePath}: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Resolve all include directives in a program
   */
  private async resolveIncludes(program: Program): Promise<void> {
    for (const include of program.includes) {
      if (!this.resolvedIncludes.has(include.filename)) {
        try {
          const includePath = this.resolveIncludePath(include.filename);
          const includeProgram = await this.parseScriptFile(includePath);

          this.resolvedIncludes.set(include.filename, includeProgram);
          include.resolved = includeProgram;

          // Recursively resolve includes in the included file
          await this.resolveIncludes(includeProgram);
        } catch (error) {
          this.connection.console.warn(`Could not resolve include: ${include.filename} - ${error}`);
        }
      } else {
        include.resolved = this.resolvedIncludes.get(include.filename);
      }
    }
  }

  /**
   * Resolve the full path for an include file
   */
  private resolveIncludePath(filename: string): string {
    // Try relative to current file first
    const currentDir = path.dirname(this.currentFile);
    let includePath = path.resolve(currentDir, filename);

    if (fs.existsSync(includePath)) {
      return includePath;
    }

    // Try with .nss extension if not present
    if (!filename.endsWith('.nss')) {
      includePath = path.resolve(currentDir, filename + '.nss');
      if (fs.existsSync(includePath)) {
        return includePath;
      }
    }

    // Try search paths
    for (const searchPath of this.includeSearchPaths) {
      const resolvedSearchPath = path.resolve(currentDir, searchPath);
      includePath = path.resolve(resolvedSearchPath, filename);

      if (fs.existsSync(includePath)) {
        return includePath;
      }

      if (!filename.endsWith('.nss')) {
        includePath = path.resolve(resolvedSearchPath, filename + '.nss');
        if (fs.existsSync(includePath)) {
          return includePath;
        }
      }
    }

    throw new Error(`Include file not found: ${filename}`);
  }

  /**
   * Format a runtime value for display
   */
  private formatValue(value: NWScriptValue): string {
    switch (value.type) {
      case 'string':
        return `"${value.value}"`;
      case 'vector':
        if (value.value && typeof value.value === 'object') {
          return `[${value.value.x}, ${value.value.y}, ${value.value.z}]`;
        }
        return String(value.value);
      case 'object':
        if (value.value === null) {
          return 'OBJECT_INVALID';
        }
        return String(value.value);
      default:
        return String(value.value);
    }
  }

  /**
   * Get a file URI from a path
   */
  private getFileUri(filePath: string): string {
    return `file://${filePath.replace(/\\/g, '/')}`;
  }
}