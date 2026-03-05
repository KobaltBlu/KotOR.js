import * as vscode from 'vscode';

import { GFFObject } from '@kotor/resource/GFFObject';
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

  // Register Forge-backed custom editors: default + Generic GFF option for GFF types
  log.trace('Registering KotorForgeProvider (default + kotor.forge.gff)');
  context.subscriptions.push(
    KotorForgeProvider.register(context)
  );
  log.info('KotorForgeProvider registered; open files with KotOR Forge or "Open With" > KotOR Forge (Generic GFF) for GFF types');

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
    }),

    vscode.commands.registerCommand('kotorForge.openAsJson', async () => {
      log.debug('Command invoked: kotorForge.openAsJson');
      const jsonExts = new Set(['.2da', '.are', '.bic', '.dlg', '.fac', '.gff', '.git', '.gui', '.ifo', '.jrl', '.ltr', '.pth', '.res', '.tlk', '.utc', '.utd', '.ute', '.uti', '.utm', '.utp', '.uts', '.utt', '.utw', '.vis']);
      const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
      const input = tab?.input as { uri?: vscode.Uri } | undefined;
      const uri = input?.uri || vscode.window.activeTextEditor?.document?.uri;
      const ext = uri ? (uri.fsPath.split('.').pop() ?? '').toLowerCase() : '';
      if (!uri || !jsonExts.has(`.${ext}`)) {
        vscode.window.showWarningMessage('Open a KotOR file that supports JSON view (e.g. .utc, .gff, .2da, .tlk) first.');
        log.debug('openAsJson: no suitable file active');
        return;
      }
      try {
        await vscode.commands.executeCommand('vscode.openWith', uri, KotorForgeProvider.viewTypeJson);
        log.info('openAsJson: opened JSON view');
      } catch (e) {
        log.error(`openAsJson failed: ${e}`);
        vscode.window.showErrorMessage(`Failed to open as JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.openAsXml', async () => {
      log.debug('Command invoked: kotorForge.openAsXml');
      const gffLikeExts = new Set(['.are', '.bic', '.dlg', '.fac', '.gff', '.git', '.gui', '.ifo', '.jrl', '.ltr', '.pth', '.res', '.utc', '.utd', '.ute', '.uti', '.utm', '.utp', '.uts', '.utt', '.utw', '.vis']);
      const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
      const input = tab?.input as { uri?: vscode.Uri } | undefined;
      const uri = input?.uri || vscode.window.activeTextEditor?.document?.uri;
      const ext = uri ? (uri.fsPath.split('.').pop() ?? '').toLowerCase() : '';

      if (!uri || !gffLikeExts.has(`.${ext}`)) {
        vscode.window.showWarningMessage('Open a GFF-based KotOR resource first (.utc/.utp/.are/.dlg/.gff/etc).');
        log.debug('openAsXml: no suitable file active');
        return;
      }

      try {
        const raw = await vscode.workspace.fs.readFile(uri);
        const gff = new GFFObject(new Uint8Array(raw));
        const xml = gff.toXML();
        const xmlDoc = await vscode.workspace.openTextDocument({
          content: xml,
          language: 'xml',
        });
        await vscode.window.showTextDocument(xmlDoc, { preview: false });
        log.info(`openAsXml: opened XML preview for ${uri.toString()}`);
      } catch (e) {
        log.error(`openAsXml failed: ${e}`);
        vscode.window.showErrorMessage(`Failed to open as XML: ${e instanceof Error ? e.message : String(e)}`);
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
