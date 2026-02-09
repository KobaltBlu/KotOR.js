import * as vscode from 'vscode';

import { getLogger, setExtensionLogger, LogScope, createScopedLogger } from './logger';
import { activateLsp, deactivateLsp } from './lsp/client';
import { KotorForgeProvider } from './providers/KotorForgeProvider';

const log = createScopedLogger(LogScope.Extension);

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
  log.trace('activate() entered');
  const outputChannel = vscode.window.createOutputChannel('Forge-KotOR.js', { log: true });
  context.subscriptions.push(outputChannel);
  setExtensionLogger(outputChannel);

  log.info('KotOR Forge extension is now active');
  log.debug(`Extension extensionPath: ${context.extensionPath}`);
  log.trace(`Extension subscriptions count: ${context.subscriptions.length}`);

  // Register a single Forge-backed custom editor for all KotOR file types
  log.trace('Registering KotorForgeProvider');
  context.subscriptions.push(
    KotorForgeProvider.register(context)
  );
  log.debug('KotorForgeProvider registered successfully');

  // Start NWScript language server for .nss/.ncs IntelliSense, diagnostics, and debugging
  log.trace('Calling activateLsp()');
  activateLsp(context);
  log.trace('activateLsp() returned');

  // Register commands
  log.trace('Registering extension commands');
  context.subscriptions.push(
    vscode.commands.registerCommand('kotorForge.setKotorPath', async () => {
      log.debug('Command invoked: kotorForge.setKotorPath');
      const path = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select KotOR Installation Directory'
      });
      if (path && path[0]) {
        log.info(`Setting KotOR path to: ${path[0].fsPath}`);
        await vscode.workspace.getConfiguration('kotorForge').update('kotorPath', path[0].fsPath, true);
        getLogger().info(`[Extension] KotOR path set to: ${path[0].fsPath}`);
        vscode.window.showInformationMessage(`KotOR path set to: ${path[0].fsPath}`);
        log.trace('kotorForge.setKotorPath completed successfully');
      } else {
        log.debug('kotorForge.setKotorPath cancelled or no path selected');
      }
    }),

    vscode.commands.registerCommand('kotorForge.setTSLPath', async () => {
      log.debug('Command invoked: kotorForge.setTSLPath');
      const path = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select KotOR II Installation Directory'
      });
      if (path && path[0]) {
        log.info(`Setting KotOR II path to: ${path[0].fsPath}`);
        await vscode.workspace.getConfiguration('kotorForge').update('tslPath', path[0].fsPath, true);
        getLogger().info(`[Extension] KotOR II path set to: ${path[0].fsPath}`);
        vscode.window.showInformationMessage(`KotOR II path set to: ${path[0].fsPath}`);
        log.trace('kotorForge.setTSLPath completed successfully');
      } else {
        log.debug('kotorForge.setTSLPath cancelled or no path selected');
      }
    })
  );
  log.trace('Extension commands registered');

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
  log.trace(`hasShownWelcome from globalState: ${hasShownWelcome}`);
  if (!hasShownWelcome) {
    log.debug('Showing first-install welcome message');
    vscode.window.showInformationMessage(
      'Welcome to KotOR Forge! Set your game installation paths in settings to enable resource browsing.',
      'Open Settings'
    ).then(selection => {
      log.trace(`Welcome message selection: ${selection ?? 'dismissed'}`);
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'kotorForge');
      }
    });
    context.globalState.update('hasShownWelcome', true);
    log.trace('hasShownWelcome persisted to globalState');
  }

  log.trace('activate() completed');
}

/**
 * Extension deactivation function
 */
export function deactivate(): PromiseLike<void> | undefined {
  log.trace('deactivate() entered');
  log.info('KotOR Forge extension is now deactivated');
  const result = deactivateLsp();
  if (result) {
    log.trace('deactivateLsp() returned a Thenable; awaiting cleanup');
    Promise.resolve(result).then(() => log.trace('deactivateLsp() resolved'), (err: unknown) => log.error(`deactivateLsp() rejected: ${err}`));
  } else {
    log.trace('deactivateLsp() returned undefined');
  }
  log.trace('deactivate() completed');
  return result;
}
