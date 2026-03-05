import * as vscode from 'vscode';

import { GFFObject } from '@kotor/resource/GFFObject';
import { bytesMDL, readMDL } from '@kotor/resource/MDLAuto';
import { getLogger, setExtensionLogger, LogScope, createScopedLogger } from './logger';
import { activateLsp, deactivateLsp } from './lsp/client';
import { KotorForgeProvider } from './providers/KotorForgeProvider';
import { ResourceTreeProvider } from './views/ResourceTreeProvider';
import { SessionTreeProvider } from './views/SessionTreeProvider';

const log = createScopedLogger(LogScope.Extension);

function getActiveGameLabel(activeGame: string): string {
  return activeGame === 'tsl' ? 'TSL' : 'K1';
}

function buildStatusBarTooltip(activeGame: string, kotorPath: string, tslPath: string): string {
  const activeLabel = activeGame === 'tsl' ? 'KotOR II: The Sith Lords' : 'KotOR I';
  const k1 = kotorPath || '(not set)';
  const k2 = tslPath || '(not set)';
  return `KotOR Forge active game: ${activeLabel}\nK1 path: ${k1}\nTSL path: ${k2}`;
}

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

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'kotorForge.switchActiveGame';
  const refreshStatusBar = () => {
    const cfg = vscode.workspace.getConfiguration('kotorForge');
    const activeGame = cfg.get<string>('activeGame', 'kotor');
    const kotorPath = cfg.get<string>('kotorPath', '');
    const tslPath = cfg.get<string>('tslPath', '');
    statusBarItem.text = `$(symbol-key) KotOR: ${getActiveGameLabel(activeGame)}`;
    statusBarItem.tooltip = buildStatusBarTooltip(activeGame, kotorPath, tslPath);
    statusBarItem.show();
    log.trace(`Status bar refreshed activeGame=${activeGame}`);
  };
  refreshStatusBar();
  const sessionTreeProvider = new SessionTreeProvider();
  const resourceTreeProvider = new ResourceTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('kotorForgeSessions', sessionTreeProvider),
    vscode.window.registerTreeDataProvider('kotorForgeResources', resourceTreeProvider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kotorForge.sessionManagerUrl')) {
        sessionTreeProvider.refresh();
      }
      if (e.affectsConfiguration('files.exclude')) {
        resourceTreeProvider.refresh();
      }
    })
  );
  context.subscriptions.push(
    statusBarItem,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kotorForge.activeGame')
        || e.affectsConfiguration('kotorForge.kotorPath')
        || e.affectsConfiguration('kotorForge.tslPath')) {
        refreshStatusBar();
      }
    })
  );

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
        refreshStatusBar();
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
        refreshStatusBar();
        log.trace('kotorForge.setTSLPath completed successfully');
      } else {
        log.debug('kotorForge.setTSLPath cancelled or no path selected');
      }
    }),

    vscode.commands.registerCommand('kotorForge.switchActiveGame', async () => {
      log.debug('Command invoked: kotorForge.switchActiveGame');
      const cfg = vscode.workspace.getConfiguration('kotorForge');
      const current = cfg.get<string>('activeGame', 'kotor');
      const selection = await vscode.window.showQuickPick([
        { label: 'KotOR I', description: 'kotor', value: 'kotor' },
        { label: 'KotOR II: The Sith Lords', description: 'tsl', value: 'tsl' },
      ], {
        title: 'Select active KotOR game',
        placeHolder: `Current: ${current}`,
      });

      if (!selection) {
        return;
      }

      await cfg.update('activeGame', selection.value, true);
      refreshStatusBar();
      vscode.window.showInformationMessage(`KotOR Forge active game set to ${selection.label}`);
      log.info(`Active game switched to ${selection.value}`);
    }),

    vscode.commands.registerCommand('kotorForge.refreshSessions', () => {
      log.debug('Command invoked: kotorForge.refreshSessions');
      sessionTreeProvider.refresh();
    }),

    vscode.commands.registerCommand('kotorForge.refreshResources', () => {
      log.debug('Command invoked: kotorForge.refreshResources');
      resourceTreeProvider.refresh();
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
    }),

    vscode.commands.registerCommand('kotorForge.openAsYaml', async () => {
      log.debug('Command invoked: kotorForge.openAsYaml');
      const gffLikeExts = new Set(['.are', '.bic', '.dlg', '.fac', '.gff', '.git', '.gui', '.ifo', '.jrl', '.ltr', '.pth', '.res', '.utc', '.utd', '.ute', '.uti', '.utm', '.utp', '.uts', '.utt', '.utw', '.vis']);
      const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
      const input = tab?.input as { uri?: vscode.Uri } | undefined;
      const uri = input?.uri || vscode.window.activeTextEditor?.document?.uri;
      const ext = uri ? (uri.fsPath.split('.').pop() ?? '').toLowerCase() : '';

      if (!uri || !gffLikeExts.has(`.${ext}`)) {
        vscode.window.showWarningMessage('Open a GFF-based KotOR resource first (.utc/.utp/.are/.dlg/.gff/etc).');
        return;
      }

      try {
        const raw = await vscode.workspace.fs.readFile(uri);
        const gff = new GFFObject(new Uint8Array(raw));
        const yaml = gff.toYAML();
        const yamlDoc = await vscode.workspace.openTextDocument({
          content: yaml,
          language: 'yaml',
        });
        await vscode.window.showTextDocument(yamlDoc, { preview: false });
        log.info(`openAsYaml: opened YAML preview for ${uri.toString()}`);
      } catch (e) {
        log.error(`openAsYaml failed: ${e}`);
        vscode.window.showErrorMessage(`Failed to open as YAML: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.openAsToml', async () => {
      log.debug('Command invoked: kotorForge.openAsToml');
      const gffLikeExts = new Set(['.are', '.bic', '.dlg', '.fac', '.gff', '.git', '.gui', '.ifo', '.jrl', '.ltr', '.pth', '.res', '.utc', '.utd', '.ute', '.uti', '.utm', '.utp', '.uts', '.utt', '.utw', '.vis']);
      const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
      const input = tab?.input as { uri?: vscode.Uri } | undefined;
      const uri = input?.uri || vscode.window.activeTextEditor?.document?.uri;
      const ext = uri ? (uri.fsPath.split('.').pop() ?? '').toLowerCase() : '';

      if (!uri || !gffLikeExts.has(`.${ext}`)) {
        vscode.window.showWarningMessage('Open a GFF-based KotOR resource first (.utc/.utp/.are/.dlg/.gff/etc).');
        return;
      }

      try {
        const raw = await vscode.workspace.fs.readFile(uri);
        const gff = new GFFObject(new Uint8Array(raw));
        const toml = gff.toTOML();
        const tomlDoc = await vscode.workspace.openTextDocument({
          content: toml,
          language: 'toml',
        });
        await vscode.window.showTextDocument(tomlDoc, { preview: false });
        log.info(`openAsToml: opened TOML preview for ${uri.toString()}`);
      } catch (e) {
        log.error(`openAsToml failed: ${e}`);
        vscode.window.showErrorMessage(`Failed to open as TOML: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.openAsAscii', async () => {
      log.debug('Command invoked: kotorForge.openAsAscii');
      const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
      const input = tab?.input as { uri?: vscode.Uri } | undefined;
      const uri = input?.uri || vscode.window.activeTextEditor?.document?.uri;
      const ext = uri ? (uri.fsPath.split('.').pop() ?? '').toLowerCase() : '';

      if (!uri || (ext !== 'mdl' && ext !== 'mdx')) {
        vscode.window.showWarningMessage('Open an MDL/MDX resource first.');
        return;
      }

      if (ext === 'mdx') {
        vscode.window.showWarningMessage('Open the matching .mdl file to view ASCII model data.');
        return;
      }

      try {
        const mdlBytes = await vscode.workspace.fs.readFile(uri);
        let mdxBytes: Uint8Array | undefined;
        const mdxUri = uri.with({ path: uri.path.replace(/\.mdl$/i, '.mdx') });
        try {
          mdxBytes = await vscode.workspace.fs.readFile(mdxUri);
        } catch {
          mdxBytes = undefined;
        }

        const mdl = readMDL(new Uint8Array(mdlBytes), { mdxBuffer: mdxBytes ? new Uint8Array(mdxBytes) : undefined });
        const ascii = new TextDecoder().decode(bytesMDL(mdl, 'mdl_ascii'));
        const asciiDoc = await vscode.workspace.openTextDocument({
          content: ascii,
          language: 'plaintext',
        });
        await vscode.window.showTextDocument(asciiDoc, { preview: false });
        log.info(`openAsAscii: opened ASCII model for ${uri.toString()}`);
      } catch (e) {
        log.error(`openAsAscii failed: ${e}`);
        vscode.window.showErrorMessage(`Failed to open as ASCII MDL: ${e instanceof Error ? e.message : String(e)}`);
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
