import {
  DebugSession,
  InitializedEvent,
  Scope,
  Source,
  StackFrame,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  ThreadEvent,
  Variable
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import * as vscode from 'vscode';

import { LanguageClient } from 'vscode-languageclient/node';

import { LogScope, createScopedLogger } from '../logger';

const log = createScopedLogger(LogScope.Debug);

/**
 * Debug adapter for NWScript debugging
 * Translates between the Debug Adapter Protocol (DAP) and our custom LSP debug protocol
 */
export class NWScriptDebugAdapter extends DebugSession {
  private static threadID = 1;
  private client: LanguageClient;
  private variableHandles = new Map<number, string>();
  private nextVariableHandle = 1;

  constructor(client: LanguageClient) {
    super();
    this.client = client;
    log.trace('NWScriptDebugAdapter constructed');
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);
  }

  /**
   * Initialize debug session
   */
  override initializeRequest(response: DebugProtocol.InitializeResponse, _args: DebugProtocol.InitializeRequestArguments): void {
    log.trace('initializeRequest() entered');
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsEvaluateForHovers = true;
    response.body.supportsStepBack = false;
    response.body.supportsSetVariable = false;
    response.body.supportsFunctionBreakpoints = false;
    response.body.supportsConditionalBreakpoints = false;
    response.body.supportsHitConditionalBreakpoints = false;
    response.body.supportsLogPoints = false;
    response.body.supportsRestartFrame = false;
    response.body.supportsStepInTargetsRequest = false;
    response.body.supportsGotoTargetsRequest = false;
    response.body.supportsCompletionsRequest = false;
    response.body.supportsRestartRequest = false;
    response.body.supportsExceptionOptions = false;
    response.body.supportsValueFormattingOptions = false;
    response.body.supportsExceptionInfoRequest = false;
    response.body.supportsSingleThreadExecutionRequests = true;

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
    log.debug('initializeRequest() completed');
  }

  /**
   * Launch the debugger
   */
  override async launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments & { script?: string }): Promise<void> {
    log.trace(`launchRequest() entered script=${args?.script}`);
    try {
      const scriptPath = args.script;
      if (!scriptPath) {
        log.error('launchRequest() script path not specified');
        this.sendErrorResponse(response, {
          id: 1,
          format: 'Script path not specified',
          showUser: true
        });
        return;
      }

      // Start the debugging session on the server
      const result = await this.client.sendRequest('nwscript/debug/start', {
        scriptPath
      }) as { success: boolean; message?: string };

      if (result.success) {
        log.info(`launchRequest() success for ${scriptPath}`);
        this.sendEvent(new ThreadEvent('started', NWScriptDebugAdapter.threadID));
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('entry', NWScriptDebugAdapter.threadID));
      } else {
        log.error(`launchRequest() failed: ${result.message}`);
        this.sendErrorResponse(response, {
          id: 2,
          format: `Failed to start debugging: ${result.message}`,
          showUser: true
        });
      }
    } catch (error) {
      log.error(`launchRequest() error: ${error}`);
      this.sendErrorResponse(response, {
        id: 3,
        format: `Error launching debug session: ${error}`,
        showUser: true
      });
    }
  }

  /**
   * Set breakpoints
   */
  override async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    const source = args.source;
    const breakpoints = args.breakpoints || [];
    log.trace(`setBreakPointsRequest() source=${source?.path} count=${breakpoints.length}`);

    try {
      // Forward breakpoints to the server
      const result = await this.client.sendRequest('nwscript/debug/setBreakpoints', {
        source: {
          path: source.path
        },
        breakpoints: breakpoints.map(bp => ({
          line: bp.line
        }))
      }) as { breakpoints: Array<{ id?: number; verified?: boolean; line?: number }> };

      response.body = {
        breakpoints: result.breakpoints.map((bp) => ({
          id: bp.id,
          verified: bp.verified,
          source: source,
          line: bp.line
        }))
      };

      this.sendResponse(response);
      log.debug('setBreakPointsRequest() completed');
    } catch (error) {
      log.error(`setBreakPointsRequest() error: ${error}`);
      this.sendErrorResponse(response, {
        id: 4,
        format: `Error setting breakpoints: ${error}`,
        showUser: true
      });
    }
  }

  /**
   * Continue execution after a breakpoint or step
   */
  override async continueRequest(response: DebugProtocol.ContinueResponse, _args: DebugProtocol.ContinueArguments): Promise<void> {
    log.trace('continueRequest() entered');
    try {
      const result = await this.client.sendRequest('nwscript/debug/continue', {}) as { success: boolean; message?: string };

      if (result.success) {
        response.body = { allThreadsContinued: true };
        this.sendResponse(response);
        log.trace('continueRequest() success');
      } else {
        log.error(`continueRequest() failed: ${result.message}`);
        this.sendErrorResponse(response, { id: 5, format: `Failed to continue: ${result.message}`, showUser: true });
      }
    } catch (error) {
      log.error(`continueRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 6, format: `Error continuing execution: ${error}`, showUser: true });
    }
  }

  /**
   * Step over the current line
   */
  override async nextRequest(response: DebugProtocol.NextResponse, _args: DebugProtocol.NextArguments): Promise<void> {
    log.trace('nextRequest() entered');
    try {
      const result = await this.client.sendRequest('nwscript/debug/next', {}) as { success: boolean; message?: string };

      if (result.success) {
        this.sendResponse(response);
        log.trace('nextRequest() success');
      } else {
        log.error(`nextRequest() failed: ${result.message}`);
        this.sendErrorResponse(response, { id: 7, format: `Failed to step over: ${result.message}`, showUser: true });
      }
    } catch (error) {
      log.error(`nextRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 8, format: `Error stepping over: ${error}`, showUser: true });
    }
  }

  /**
   * Step into a function
   */
  override async stepInRequest(response: DebugProtocol.StepInResponse, _args: DebugProtocol.StepInArguments): Promise<void> {
    log.trace('stepInRequest() entered');
    try {
      const result = await this.client.sendRequest('nwscript/debug/stepIn', {}) as { success: boolean; message?: string };

      if (result.success) {
        this.sendResponse(response);
      } else {
        this.sendErrorResponse(response, {
          id: 9,
          format: `Failed to step in: ${result.message}`,
          showUser: true
        });
      }
    } catch (error) {
      this.sendErrorResponse(response, {
        id: 10,
        format: `Error stepping in: ${error}`,
        showUser: true
      });
    }
  }

  /**
   * Step out of current function
   */
  override async stepOutRequest(response: DebugProtocol.StepOutResponse, _args: DebugProtocol.StepOutArguments): Promise<void> {
    log.trace('stepOutRequest() entered');
    try {
      const result = await this.client.sendRequest('nwscript/debug/stepOut', {}) as { success: boolean; message?: string };

      if (result.success) {
        this.sendResponse(response);
      } else {
        this.sendErrorResponse(response, {
          id: 11,
          format: `Failed to step out: ${result.message}`,
          showUser: true
        });
      }
    } catch (error) {
      this.sendErrorResponse(response, {
        id: 12,
        format: `Error stepping out: ${error}`,
        showUser: true
      });
    }
  }

  /**
   * Pause execution
   */
  override async pauseRequest(response: DebugProtocol.PauseResponse, _args: DebugProtocol.PauseArguments): Promise<void> {
    log.trace('pauseRequest() entered');
    try {
      const result = await this.client.sendRequest('nwscript/debug/pause', {}) as { success: boolean; message?: string };

      if (result.success) {
        this.sendResponse(response);
      } else {
        this.sendErrorResponse(response, {
          id: 13,
          format: `Failed to pause: ${result.message}`,
          showUser: true
        });
      }
    } catch (error) {
      this.sendErrorResponse(response, {
        id: 14,
        format: `Error pausing: ${error}`,
        showUser: true
      });
    }
  }

  /**
   * Get stack trace
   */
  override async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
    log.trace(`stackTraceRequest() entered threadId=${args?.threadId}`);
    try {
      const result = await this.client.sendRequest('nwscript/debug/stackTrace', {}) as { stackFrames: Array<{ id: number; name: string; source: { name: string; path: string }; line: number; column: number }>; totalFrames: number };

      const stackFrames = result.stackFrames.map((frame) => {
        return new StackFrame(
          frame.id,
          frame.name,
          new Source(
            frame.source.name,
            frame.source.path
          ),
          frame.line,
          frame.column
        );
      });

      response.body = {
        stackFrames,
        totalFrames: result.totalFrames
      };

      this.sendResponse(response);
      log.trace(`stackTraceRequest() completed frames=${result.stackFrames?.length ?? 0}`);
    } catch (error) {
      log.error(`stackTraceRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 15, format: `Error getting stack trace: ${error}`, showUser: true });
    }
  }

  /**
   * Get available scopes
   */
  override async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): Promise<void> {
    log.trace(`scopesRequest() entered frameId=${args?.frameId}`);
    try {
      const frameId = args.frameId;
      const result = await this.client.sendRequest('nwscript/debug/scopes', { frameId }) as { scopes: Array<{ name: string; variablesReference: number; expensive?: boolean }> };

      const scopes = result.scopes.map((scope) => {
        return new Scope(
          scope.name,
          scope.variablesReference,
          scope.expensive
        );
      });

      response.body = {
        scopes
      };

      this.sendResponse(response);
      log.trace(`scopesRequest() completed scopes=${result.scopes?.length ?? 0}`);
    } catch (error) {
      log.error(`scopesRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 16, format: `Error getting scopes: ${error}`, showUser: true });
    }
  }

  /**
   * Get variables for a scope
   */
  override async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void> {
    log.trace(`variablesRequest() entered variablesReference=${args?.variablesReference}`);
    try {
      const variablesReference = args.variablesReference;
      const result = await this.client.sendRequest('nwscript/debug/variables', { variablesReference }) as { variables: Array<{ name: string; value: string; type?: string; variablesReference?: number }> };

      const variables = result.variables.map((v) => {
        return new Variable(
          v.name,
          v.value,
          v.type,
          v.variablesReference
        );
      });

      response.body = {
        variables
      };

      this.sendResponse(response);
      log.trace(`variablesRequest() completed variables=${result.variables?.length ?? 0}`);
    } catch (error) {
      log.error(`variablesRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 17, format: `Error getting variables: ${error}`, showUser: true });
    }
  }

  /**
   * Evaluate an expression
   */
  override async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): Promise<void> {
    log.trace(`evaluateRequest() entered expression=${args?.expression?.substring(0, 50)}`);
    try {
      const result = await this.client.sendRequest('nwscript/debug/evaluate', {
        expression: args.expression,
        frameId: args.frameId
      }) as { result: string; variablesReference: number };

      response.body = {
        result: result.result,
        variablesReference: result.variablesReference
      };

      this.sendResponse(response);
      log.trace('evaluateRequest() completed');
    } catch (error) {
      log.error(`evaluateRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 18, format: `Error evaluating expression: ${error}`, showUser: true });
    }
  }

  /**
   * Terminate the debug session
   */
  override async disconnectRequest(response: DebugProtocol.DisconnectResponse, _args: DebugProtocol.DisconnectArguments): Promise<void> {
    log.trace('disconnectRequest() entered');
    try {
      await this.client.sendRequest('nwscript/debug/stop', {});
      this.sendResponse(response);
      this.sendEvent(new TerminatedEvent());
      log.info('disconnectRequest() debug session stopped');
    } catch (error) {
      log.error(`disconnectRequest() error: ${error}`);
      this.sendErrorResponse(response, { id: 19, format: `Error stopping debug session: ${error}`, showUser: true });
    }
  }

  /**
   * Get list of threads (we only support one thread)
   */
  override threadsRequest(response: DebugProtocol.ThreadsResponse): void {
    log.trace('threadsRequest() entered');
    response.body = {
      threads: [
        new Thread(NWScriptDebugAdapter.threadID, "Main Thread")
      ]
    };
    this.sendResponse(response);
    log.trace('threadsRequest() completed');
  }
}

/**
 * Factory that creates debug adapter descriptor
 */
export class NWScriptDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory, vscode.Disposable {
  private client: LanguageClient;
  private disposables: vscode.Disposable[] = [];

  constructor(client: LanguageClient) {
    this.client = client;
    log.trace('NWScriptDebugAdapterDescriptorFactory constructed');
  }

  createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    log.trace(`createDebugAdapterDescriptor() sessionId=${session.id} name=${session.name}`);
    const debugAdapter = new NWScriptDebugAdapter(this.client);
    const descriptor = new vscode.DebugAdapterInlineImplementation(debugAdapter);
    log.debug('createDebugAdapterDescriptor() returning inline implementation');
    return descriptor;
  }

  dispose(): void {
    log.trace(`NWScriptDebugAdapterDescriptorFactory dispose() disposables=${this.disposables.length}`);
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

/**
 * Debug configuration provider for NWScript
 */
export class NWScriptConfigurationProvider implements vscode.DebugConfigurationProvider {
  /**
   * Provide initial debug configurations for 'Add Debug Configuration'
   */
  provideDebugConfigurations(_folder: vscode.WorkspaceFolder | undefined): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    log.trace('provideDebugConfigurations() entered');
    const configs = [
      { type: 'nwscript', request: 'launch', name: 'Debug NWScript', script: '${file}' }
    ];
    log.debug('provideDebugConfigurations() returning default launch config');
    return configs;
  }

  /**
   * Resolve debug configuration
   */
  resolveDebugConfiguration(_folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): vscode.ProviderResult<vscode.DebugConfiguration> {
    log.trace(`resolveDebugConfiguration() type=${config?.type} request=${config?.request} script=${config?.script}`);
    if (!config.type && !config.request && !config.name) {
      log.debug('resolveDebugConfiguration() empty config, returning default');
      return {
        type: 'nwscript',
        request: 'launch',
        name: 'Debug NWScript',
        script: '${file}'
      };
    }

    if (!config.script) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'nwscript') {
        config.script = editor.document.uri.fsPath;
        log.debug(`resolveDebugConfiguration() resolved script=${config.script}`);
      } else {
        log.warn('resolveDebugConfiguration() no active NWScript file');
        return vscode.window.showInformationMessage('Cannot find an active NWScript file to debug').then(_ => {
          return undefined;
        });
      }
    }

    log.trace('resolveDebugConfiguration() returning config');
    return config;
  }
}

/**
 * Debug adapter tracker factory for NWScript
 */
export class NWScriptDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    log.trace(`createDebugAdapterTracker() sessionId=${session.id}`);
    return {
      onDidSendMessage(message: unknown): void {
        const m = message as { type?: string; command?: string };
        log.trace(`onDidSendMessage type=${m?.type ?? m?.command}`);
      },
      onWillReceiveMessage(message: unknown): void {
        const m = message as { type?: string; command?: string };
        log.trace(`onWillReceiveMessage type=${m?.type ?? m?.command}`);
      },
      onWillStartSession(): void {
        log.debug('Debug session starting');
      },
      onWillStopSession(): void {
        log.debug('Debug session stopping');
      },
      onError(error: Error): void {
        log.error(`Debug adapter error: ${error.message}`);
      },
      onExit(code: number | undefined, signal: string | undefined): void {
        log.trace(`Debug adapter exit: code=${code}, signal=${signal}`);
      }
    };
  }
}
