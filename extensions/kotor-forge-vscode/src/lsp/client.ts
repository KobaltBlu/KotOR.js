import * as path from 'path';
import * as vscode from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
  TransportKind,
} from 'vscode-languageclient/node';

import { getLogger, LogScope, createScopedLogger } from '../logger';

import {
  NWScriptConfigurationProvider,
  NWScriptDebugAdapterDescriptorFactory,
  NWScriptDebugAdapterTrackerFactory,
} from './debugAdapter';

let client: LanguageClient | undefined;
let debugDisposables: vscode.Disposable[] = [];
let unhandledRejectionHandler: ((reason: unknown, promise: Promise<unknown>) => void) | undefined;

const log = createScopedLogger(LogScope.NWScript);

/** Suppress known LSP lifecycle rejections from vscode-languageclient when the server dies during start. */
function installUnhandledRejectionHandler(context: vscode.ExtensionContext): void {
  if (unhandledRejectionHandler) return;
  unhandledRejectionHandler = (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (
      msg.includes('Pending response rejected since connection got disposed') ||
      msg.includes("Client is not running and can't be stopped")
    ) {
      log.debug(`LSP lifecycle rejection (suppressed): ${msg}`);
    }
  };
  process.on('unhandledRejection', unhandledRejectionHandler);
  context.subscriptions.push({
    dispose: () => {
      if (unhandledRejectionHandler) {
        process.off('unhandledRejection', unhandledRejectionHandler);
        unhandledRejectionHandler = undefined;
      }
    },
  });
}

/**
 * Activate the NWScript language server and debugger.
 * Called from the main extension when the extension activates.
 * Uses the shared Forge-KotOR.js output channel (see Output panel, log level dropdown).
 */
export function activateLsp(context: vscode.ExtensionContext): void {
  log.trace('activateLsp() entered');
  log.info('Activating NWScript language server');

  installUnhandledRejectionHandler(context);

  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  log.trace(`Server module path: ${serverModule}`);

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'nwscript' },
      { scheme: 'file', pattern: '**/*.nss' },
      { scheme: 'file', pattern: '**/*.ncs' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{nss,ncs}'),
    },
    outputChannel: getLogger(),
  };

  const languageClient = new LanguageClient(
    'forge-kotorjs-nwscript',
    'Forge-KotOR.js NWScript Language Server',
    serverOptions,
    clientOptions
  );

  languageClient.onDidChangeState((e) => {
    if (e.newState === State.Stopped) {
      log.debug(`LSP client state: Stopped; clearing client reference`);
      if (client === languageClient) {
        client = undefined;
      }
    }
  });

  client = languageClient;

  client.start().then(() => {
    log.info('NWScript language server started successfully');
    log.debug('Language server connection established');
    log.trace('Calling setupDebugger()');
    setupDebugger(context);
    log.trace('Calling registerIncludeDocumentProvider()');
    registerIncludeDocumentProvider(context);
    log.trace('activateLsp() startup completed');
  }).catch((error: unknown) => {
    log.error(`Failed to start NWScript language server: ${error}`);
    vscode.window.showErrorMessage(`Failed to start Forge-KotOR.js NWScript server: ${error}`);
    // Clear client so deactivate doesn't try to stop a failed client (avoids "can't be stopped" errors)
    client = undefined;
  });
}

function registerIncludeDocumentProvider(_context: vscode.ExtensionContext): void {
  if (!client) return;
  log.trace('Registering include document content provider');
  const provider: vscode.TextDocumentContentProvider = {
    provideTextDocumentContent: async (uri: vscode.Uri): Promise<string> => {
      const file = uri.path.split('/').pop() || '';
      const include = file.replace(/\.nss$/i, '');
      log.debug(`Requesting include content: ${include} uri=${uri.toString()}`);
      try {
        const result = await client!.sendRequest<{ text: string } | null>('kotor-forge/includeText', { include });
        const text = result?.text ?? `// Unable to load include: ${include}`;
        log.trace(`Include ${include} returned ${text.length} chars`);
        return text;
      } catch (err: unknown) {
        const errorMsg = String(err);
        let includeName = '';
        try {
          const file = uri.path.split('/').pop() || '';
          includeName = file.replace(/\.nss$/i, '');
        } catch {
          includeName = '<unknown>';
        }
        log.error(`Error loading include ${includeName}: ${errorMsg}`);
        return `// Error loading content: ${errorMsg}`;
      }
    },
  };
  debugDisposables.push(vscode.workspace.registerTextDocumentContentProvider('kotor-forge', provider));
  log.trace('Include document content provider registered (scheme: kotor-forge)');
}

function setupDebugger(_context: vscode.ExtensionContext): void {
  if (!client) return;
  log.debug('Setting up NWScript debugger');

  const configProvider = new NWScriptConfigurationProvider();
  debugDisposables.push(vscode.debug.registerDebugConfigurationProvider('nwscript', configProvider));
  log.trace('Debug configuration provider registered');

  const factory = new NWScriptDebugAdapterDescriptorFactory(client);
  debugDisposables.push(vscode.debug.registerDebugAdapterDescriptorFactory('nwscript', factory));
  debugDisposables.push(factory);
  log.trace('Debug adapter descriptor factory registered');

  const trackerFactory = new NWScriptDebugAdapterTrackerFactory();
  debugDisposables.push(vscode.debug.registerDebugAdapterTrackerFactory('nwscript', trackerFactory));
  log.trace('Debug adapter tracker factory registered');

  vscode.commands.getCommands(true).then((all) => {
    if (all.includes('nwscript.startDebugging')) {
      log.debug('Debug command already exists, skipping registration');
      return;
    }
    debugDisposables.push(
      vscode.commands.registerCommand('nwscript.startDebugging', async () => {
        log.info('Starting NWScript debugging session');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          const error = 'No active editor found';
          log.error(`Debug error: ${error}`);
          vscode.window.showErrorMessage(error);
          return;
        }
        const document = editor.document;
        if (document.languageId !== 'nwscript' && !document.fileName.toLowerCase().endsWith('.nss')) {
          const error = 'Not a NWScript file';
          log.error(`Debug error: ${error}`);
          vscode.window.showErrorMessage(error);
          return;
        }
        const config: vscode.DebugConfiguration = {
          type: 'nwscript',
          name: 'Debug NWScript',
          request: 'launch',
          script: document.fileName,
          stopOnEntry: true,
        };
        log.info(`Starting debug session for: ${document.fileName}`);
        await vscode.debug.startDebugging(undefined, config);
      })
    );
    log.debug('Debug command registered: nwscript.startDebugging');
  });
}

/**
 * Deactivate the language server and clean up debug registrations.
 * Only calls client.stop() when the client is actually running; otherwise
 * skip stop to avoid "Client is not running and can't be stopped" errors
 * (e.g. when the server crashed during start or connection was disposed).
 */
export function deactivateLsp(): PromiseLike<void> | undefined {
  log.trace('deactivateLsp() entered');
  log.info('Deactivating NWScript language server');
  const count = debugDisposables.length;
  debugDisposables.forEach((d) => d.dispose());
  debugDisposables = [];
  log.trace(`Disposed ${count} debug disposables`);

  if (!client) {
    log.debug('No client to stop');
    log.trace('deactivateLsp() completed (no client)');
    return undefined;
  }

  const current = client;
  client = undefined;

  if (current.state !== State.Running) {
    log.debug(`Client not running (state: ${State[current.state] ?? current.state}), skipping stop`);
    log.trace('deactivateLsp() completed (skipped stop)');
    return undefined;
  }

  log.info('Stopping language server');
  return current.stop().then(() => {
    log.info('Language server stopped successfully');
    log.trace('deactivateLsp() completed');
  }).catch((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Client is not running and can't be stopped") || msg.includes('connection got disposed')) {
      log.debug(`Stop skipped or connection already closed: ${msg}`);
    } else {
      log.error(`Error stopping language server: ${error}`);
    }
  });
}
