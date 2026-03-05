import * as vscode from 'vscode';

import { GFFObject } from '@kotor/resource/GFFObject';
import { bytesMDL, readMDL } from '@kotor/resource/MDLAuto';
import { getLogger, setExtensionLogger, setConfiguredLogLevel, LogScope, createScopedLogger } from './logger';
import { activateLsp, deactivateLsp } from './lsp/client';
import { KotorForgeProvider } from './providers/KotorForgeProvider';
import { ResourceTreeProvider } from './views/ResourceTreeProvider';
import { SessionTreeProvider } from './views/SessionTreeProvider';

const log = createScopedLogger(LogScope.Extension);
const GFF_LIKE_EXTS = new Set(['.are', '.bic', '.dlg', '.fac', '.gff', '.git', '.gui', '.ifo', '.jrl', '.ltr', '.pth', '.res', '.utc', '.utd', '.ute', '.uti', '.utm', '.utp', '.uts', '.utt', '.utw', '.vis']);
const VALIDATION_EXTS = new Set([...GFF_LIKE_EXTS, '.mdl', '.mdx', '.json']);

function getActiveResourceUri(): vscode.Uri | undefined {
  const tab = vscode.window.tabGroups?.activeTabGroup?.activeTab;
  const input = tab?.input as { uri?: vscode.Uri } | undefined;
  return input?.uri || vscode.window.activeTextEditor?.document?.uri;
}

function getResourceExtension(uri?: vscode.Uri): string {
  if (!uri) return '';
  return `.${(uri.fsPath.split('.').pop() ?? '').toLowerCase()}`;
}

function getActiveGameLabel(activeGame: string): string {
  return activeGame === 'tsl' ? 'TSL' : 'K1';
}

function buildStatusBarTooltip(activeGame: string, kotorPath: string, tslPath: string): string {
  const activeLabel = activeGame === 'tsl' ? 'KotOR II: The Sith Lords' : 'KotOR I';
  const k1 = kotorPath || '(not set)';
  const k2 = tslPath || '(not set)';
  return `KotOR Forge active game: ${activeLabel}\nK1 path: ${k1}\nTSL path: ${k2}`;
}

function getResourceLabel(uri: vscode.Uri): string {
  return uri.path.split('/').pop() || uri.toString();
}

function createValidationDiagnostic(message: string): vscode.Diagnostic {
  return new vscode.Diagnostic(
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
    `KotOR resource validation failed: ${message}`,
    vscode.DiagnosticSeverity.Error
  );
}

async function fetchSessionManagerResource(
  sessionManagerUrl: string,
  resourcePath: string,
  adminToken: string,
  asText = false
): Promise<unknown> {
  const endpoint = new URL(resourcePath, sessionManagerUrl);
  const response = await fetch(endpoint.toString(), {
    headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
  });
  if (!response.ok) {
    throw new Error(`${resourcePath} request failed (${response.status})`);
  }
  return asText ? response.text() : response.json();
}

function readSessionManagerSettings(): { sessionManagerUrl: string; adminToken: string } {
  const cfg = vscode.workspace.getConfiguration('kotorForge');
  return {
    sessionManagerUrl: cfg.get<string>('sessionManagerUrl', '').trim(),
    adminToken: cfg.get<string>('sessionManagerAdminToken', '').trim(),
  };
}

async function openActiveGffAsText(
  formatLabel: 'XML' | 'YAML' | 'TOML',
  language: string,
  convert: (gff: GFFObject) => string,
): Promise<void> {
  const uri = getActiveResourceUri();
  const ext = getResourceExtension(uri);

  if (!uri || !GFF_LIKE_EXTS.has(ext)) {
    vscode.window.showWarningMessage('Open a GFF-based KotOR resource first (.utc/.utp/.are/.dlg/.gff/etc).');
    log.debug(`openAs${formatLabel}: no suitable file active`);
    return;
  }

  try {
    const raw = await vscode.workspace.fs.readFile(uri);
    const gff = new GFFObject(new Uint8Array(raw));
    const content = convert(gff);
    const doc = await vscode.workspace.openTextDocument({
      content,
      language,
    });
    await vscode.window.showTextDocument(doc, { preview: false });
    log.info(`openAs${formatLabel}: opened ${formatLabel} preview for ${uri.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`openAs${formatLabel} failed: ${message}`);
    vscode.window.showErrorMessage(`Failed to open as ${formatLabel}: ${message}`);
  }
}

async function validateResourceUri(uri: vscode.Uri, extOverride?: string): Promise<void> {
  const ext = (extOverride || getResourceExtension(uri)).toLowerCase();
  const raw = await vscode.workspace.fs.readFile(uri);

  if (GFF_LIKE_EXTS.has(ext)) {
    new GFFObject(new Uint8Array(raw));
    return;
  }

  if (ext === '.mdl') {
    let mdxBytes: Uint8Array | undefined;
    const mdxUri = uri.with({ path: uri.path.replace(/\.mdl$/i, '.mdx') });
    try {
      mdxBytes = await vscode.workspace.fs.readFile(mdxUri);
    } catch {
      mdxBytes = undefined;
    }
    readMDL(new Uint8Array(raw), { mdxBuffer: mdxBytes ? new Uint8Array(mdxBytes) : undefined });
    return;
  }

  if (ext === '.mdx') {
    const mdlUri = uri.with({ path: uri.path.replace(/\.mdx$/i, '.mdl') });
    const mdlBytes = await vscode.workspace.fs.readFile(mdlUri);
    readMDL(new Uint8Array(mdlBytes), { mdxBuffer: new Uint8Array(raw) });
    return;
  }

  if (ext === '.json') {
    JSON.parse(new TextDecoder().decode(raw));
    return;
  }

  throw new Error(`Unsupported resource type for validation: ${ext}`);
}

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
  log.trace('activate() entered');
  const outputChannel = vscode.window.createOutputChannel('Forge-KotOR.js', { log: true });
  context.subscriptions.push(outputChannel);
  setExtensionLogger(outputChannel);
  const refreshConfiguredLogLevel = () => {
    const cfg = vscode.workspace.getConfiguration('kotorForge');
    const configured = cfg.get<string>('logLevel', 'info');
    const resolved = setConfiguredLogLevel(configured);
    outputChannel.info(`[Logger] Configured minimum level: ${vscode.LogLevel[resolved]} (${configured})`);
  };
  refreshConfiguredLogLevel();

  log.info('KotOR Forge extension is now active');
  log.debug(`Extension extensionPath: ${context.extensionPath}`);
  log.trace(`Extension subscriptions count: ${context.subscriptions.length}`);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'kotorForge.switchActiveGame';
  const sessionStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  sessionStatusBarItem.command = 'kotorForge.refreshSessions';
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
  const validationDiagnostics = vscode.languages.createDiagnosticCollection('kotorForgeValidation');
  const refreshSessionStatusBar = async () => {
    const { sessionManagerUrl, adminToken } = readSessionManagerSettings();
    if (!sessionManagerUrl) {
      sessionStatusBarItem.text = '$(server) Sessions: off';
      sessionStatusBarItem.tooltip = 'Session manager URL is not configured.';
      sessionStatusBarItem.show();
      return;
    }

    try {
      const sessions = await fetchSessionManagerResource(
        sessionManagerUrl,
        adminToken ? '/api/sessions?includeTokens=1' : '/api/sessions',
        adminToken
      ) as Array<{ status?: string; containerStatus?: string }>;
      const active = sessions.filter((s) => s.status !== 'expired' && s.status !== 'closed').length;
      const ready = sessions.filter((s) => s.containerStatus === 'ready').length;
      sessionStatusBarItem.text = `$(server-environment) Sessions: ${active}`;
      sessionStatusBarItem.tooltip = `Hosted sessions active: ${active}\nContainers ready: ${ready}\nTotal tracked: ${sessions.length}`;
      sessionStatusBarItem.show();
    } catch (error) {
      sessionStatusBarItem.text = '$(warning) Sessions: error';
      sessionStatusBarItem.tooltip = `Session manager unavailable.\n${error instanceof Error ? error.message : String(error)}`;
      sessionStatusBarItem.show();
    }
  };
  void refreshSessionStatusBar();
  context.subscriptions.push(
    validationDiagnostics,
    vscode.window.registerTreeDataProvider('kotorForgeSessions', sessionTreeProvider),
    vscode.window.registerTreeDataProvider('kotorForgeResources', resourceTreeProvider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kotorForge.sessionManagerUrl')
        || e.affectsConfiguration('kotorForge.sessionManagerAdminToken')) {
        sessionTreeProvider.refresh();
        void refreshSessionStatusBar();
      }
      if (e.affectsConfiguration('files.exclude')) {
        resourceTreeProvider.refresh();
      }
    })
  );
  context.subscriptions.push(
    sessionStatusBarItem,
    statusBarItem,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kotorForge.activeGame')
        || e.affectsConfiguration('kotorForge.kotorPath')
        || e.affectsConfiguration('kotorForge.tslPath')) {
        refreshStatusBar();
      }
      if (e.affectsConfiguration('kotorForge.logLevel')) {
        refreshConfiguredLogLevel();
      }
    })
  );
  const sessionStatusInterval = setInterval(() => {
    sessionTreeProvider.refresh();
    void refreshSessionStatusBar();
  }, 15000);
  context.subscriptions.push(new vscode.Disposable(() => clearInterval(sessionStatusInterval)));

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

    vscode.commands.registerCommand('kotorForge.setLogLevel', async () => {
      log.debug('Command invoked: kotorForge.setLogLevel');
      const cfg = vscode.workspace.getConfiguration('kotorForge');
      const current = cfg.get<string>('logLevel', 'info');
      const selection = await vscode.window.showQuickPick([
        { label: 'Trace', value: 'trace', description: 'Most verbose diagnostics' },
        { label: 'Debug', value: 'debug', description: 'Development/debug details' },
        { label: 'Info', value: 'info', description: 'Normal operational logs' },
        { label: 'Warn', value: 'warn', description: 'Warnings and errors only' },
        { label: 'Error', value: 'error', description: 'Errors only' },
      ], {
        title: 'Set KotOR Forge log level',
        placeHolder: `Current: ${current}`,
      });
      if (!selection) {
        return;
      }

      await cfg.update('logLevel', selection.value, true);
      vscode.window.showInformationMessage(`KotOR Forge log level set to ${selection.label}`);
      log.info(`Log level switched to ${selection.value}`);
    }),

    vscode.commands.registerCommand('kotorForge.refreshSessions', () => {
      log.debug('Command invoked: kotorForge.refreshSessions');
      sessionTreeProvider.refresh();
      void refreshSessionStatusBar();
    }),

    vscode.commands.registerCommand('kotorForge.checkSessionManagerHealth', async () => {
      log.debug('Command invoked: kotorForge.checkSessionManagerHealth');
      const { sessionManagerUrl } = readSessionManagerSettings();
      if (!sessionManagerUrl) {
        vscode.window.showWarningMessage('Session manager URL is not configured.');
        return;
      }

      try {
        const endpoint = new URL('/healthz', sessionManagerUrl);
        const response = await fetch(endpoint.toString());
        if (!response.ok) {
          throw new Error(`health check failed (${response.status})`);
        }
        const payload = await response.json() as { ok?: boolean };
        if (!payload.ok) {
          throw new Error('session manager returned unhealthy status');
        }
        vscode.window.showInformationMessage(`Session manager reachable at ${endpoint.origin}`);
        log.info(`[session-health] healthy: ${endpoint.origin}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Session manager health check failed: ${message}`);
        log.error(`checkSessionManagerHealth failed: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.showSessionManagerStats', async () => {
      log.debug('Command invoked: kotorForge.showSessionManagerStats');
      const { sessionManagerUrl, adminToken } = readSessionManagerSettings();
      if (!sessionManagerUrl) {
        vscode.window.showWarningMessage('Session manager URL is not configured.');
        return;
      }

      try {
        const stats = await fetchSessionManagerResource(
          sessionManagerUrl,
          '/api/stats',
          adminToken
        ) as {
          activeSessions?: number;
          readyContainers?: number;
          totalSessions?: number;
          byStatus?: Record<string, number>;
          byContainerStatus?: Record<string, number>;
        };
        const statusSummary = Object.entries(stats.byStatus || {})
          .map(([key, value]) => `${key}:${value}`)
          .join(', ');
        const containerSummary = Object.entries(stats.byContainerStatus || {})
          .map(([key, value]) => `${key}:${value}`)
          .join(', ');

        const summary = `Sessions active ${stats.activeSessions ?? 0}, ready ${stats.readyContainers ?? 0}, total ${stats.totalSessions ?? 0}`;
        vscode.window.showInformationMessage(summary);
        log.info(`[session-stats] ${summary}; status=[${statusSummary}] containers=[${containerSummary}]`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to fetch session manager stats: ${message}`);
        log.error(`showSessionManagerStats failed: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.showSessionManagerMetrics', async () => {
      log.debug('Command invoked: kotorForge.showSessionManagerMetrics');
      const { sessionManagerUrl, adminToken } = readSessionManagerSettings();
      if (!sessionManagerUrl) {
        vscode.window.showWarningMessage('Session manager URL is not configured.');
        return;
      }

      try {
        const metricsText = await fetchSessionManagerResource(
          sessionManagerUrl,
          '/api/metrics',
          adminToken,
          true
        ) as string;
        const doc = await vscode.workspace.openTextDocument({
          content: metricsText,
          language: 'plaintext',
        });
        await vscode.window.showTextDocument(doc, { preview: false });
        log.info(`[session-metrics] opened metrics snapshot (${metricsText.length} bytes)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to fetch session manager metrics: ${message}`);
        log.error(`showSessionManagerMetrics failed: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.showSessionManagerConfig', async () => {
      log.debug('Command invoked: kotorForge.showSessionManagerConfig');
      const { sessionManagerUrl, adminToken } = readSessionManagerSettings();
      if (!sessionManagerUrl) {
        vscode.window.showWarningMessage('Session manager URL is not configured.');
        return;
      }

      try {
        const config = await fetchSessionManagerResource(
          sessionManagerUrl,
          '/api/config',
          adminToken
        ) as Record<string, unknown>;
        const doc = await vscode.workspace.openTextDocument({
          content: JSON.stringify(config, null, 2),
          language: 'json',
        });
        await vscode.window.showTextDocument(doc, { preview: false });
        log.info('[session-config] opened session manager config snapshot');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to fetch session manager config: ${message}`);
        log.error(`showSessionManagerConfig failed: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.openHostedSession', async (value?: string | { accessUrl?: string }) => {
      log.debug('Command invoked: kotorForge.openHostedSession');
      const accessUrl = typeof value === 'string'
        ? value
        : (value && typeof value.accessUrl === 'string' ? value.accessUrl : undefined);
      if (!accessUrl || typeof accessUrl !== 'string') {
        vscode.window.showWarningMessage('Session access URL is unavailable. Set session manager admin token for tokenized links.');
        return;
      }
      const parsed = vscode.Uri.parse(accessUrl);
      await vscode.env.openExternal(parsed);
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
      await openActiveGffAsText('XML', 'xml', (gff) => gff.toXML());
    }),

    vscode.commands.registerCommand('kotorForge.openAsYaml', async () => {
      log.debug('Command invoked: kotorForge.openAsYaml');
      await openActiveGffAsText('YAML', 'yaml', (gff) => gff.toYAML());
    }),

    vscode.commands.registerCommand('kotorForge.openAsToml', async () => {
      log.debug('Command invoked: kotorForge.openAsToml');
      await openActiveGffAsText('TOML', 'toml', (gff) => gff.toTOML());
    }),

    vscode.commands.registerCommand('kotorForge.compareWithSaved', async () => {
      log.debug('Command invoked: kotorForge.compareWithSaved');
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Focus a text editor first to compare with saved.');
        return;
      }

      try {
        await vscode.commands.executeCommand('workbench.files.action.compareWithSaved');
        log.info(`compareWithSaved: opened diff for ${editor.document.uri.toString()}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to compare with saved: ${message}`);
        log.error(`compareWithSaved failed: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.openAsAscii', async () => {
      log.debug('Command invoked: kotorForge.openAsAscii');
      const uri = getActiveResourceUri();
      const ext = getResourceExtension(uri).replace('.', '');

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
    }),

    vscode.commands.registerCommand('kotorForge.validateActiveResource', async () => {
      log.debug('Command invoked: kotorForge.validateActiveResource');
      const uri = getActiveResourceUri();
      const ext = getResourceExtension(uri);
      if (!uri) {
        vscode.window.showWarningMessage('Open a KotOR resource first to validate.');
        return;
      }
      if (!VALIDATION_EXTS.has(ext)) {
        vscode.window.showWarningMessage(`Validation is not supported for ${ext || 'this file type'}.`);
        return;
      }

      validationDiagnostics.delete(uri);
      try {
        await validateResourceUri(uri, ext);
        vscode.window.showInformationMessage(`Validation succeeded for ${getResourceLabel(uri)}.`);
        log.info(`validateActiveResource: validation succeeded for ${uri.toString()}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        validationDiagnostics.set(uri, [createValidationDiagnostic(message)]);
        vscode.window.showErrorMessage(`Validation failed: ${message}`);
        log.error(`validateActiveResource failed for ${uri.toString()}: ${message}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.validateWorkspaceResources', async () => {
      log.debug('Command invoked: kotorForge.validateWorkspaceResources');
      const extPattern = Array.from(VALIDATION_EXTS)
        .map((ext) => ext.replace('.', ''))
        .join(',');
      const files = await vscode.workspace.findFiles(
        `**/*.{${extPattern}}`,
        '**/{node_modules,.git,dist,build,.next,.cache}/**',
        400
      );

      if (!files.length) {
        vscode.window.showWarningMessage('No supported KotOR resources found in workspace for validation.');
        return;
      }

      let validatedCount = 0;
      let failedCount = 0;
      validationDiagnostics.clear();

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'KotOR Forge: validating workspace resources',
        cancellable: true,
      }, async (progress, token) => {
        for (let index = 0; index < files.length; index += 1) {
          if (token.isCancellationRequested) {
            log.warn(`validateWorkspaceResources cancelled after ${index} files`);
            break;
          }

          const uri = files[index];
          progress.report({
            message: `${index + 1}/${files.length} ${getResourceLabel(uri)}`,
            increment: (100 / files.length),
          });

          try {
            await validateResourceUri(uri);
            validatedCount += 1;
          } catch (error) {
            failedCount += 1;
            const message = error instanceof Error ? error.message : String(error);
            validationDiagnostics.set(uri, [createValidationDiagnostic(message)]);
            log.warn(`validateWorkspaceResources failed for ${uri.toString()}: ${message}`);
          }
        }
      });

      const summary = `Validated ${validatedCount}/${files.length} resources`;
      if (failedCount > 0) {
        vscode.window.showWarningMessage(`${summary}; failures: ${failedCount}. See Problems for details.`);
        log.warn(`validateWorkspaceResources completed with failures: ${failedCount}/${files.length}`);
      } else {
        vscode.window.showInformationMessage(`${summary}; no validation errors detected.`);
        log.info(`validateWorkspaceResources completed successfully: ${validatedCount}/${files.length}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.findResourceReferences', async () => {
      log.debug('Command invoked: kotorForge.findResourceReferences');
      const uri = getActiveResourceUri();
      if (!uri) {
        vscode.window.showWarningMessage('Open a resource first to search references.');
        return;
      }

      const fileName = uri.path.split('/').pop() || '';
      const resref = fileName.split('.').slice(0, -1).join('.') || fileName;
      if (!resref) {
        vscode.window.showWarningMessage('Unable to derive resource name for reference search.');
        return;
      }

      const matches: Array<{ uri: vscode.Uri; range: vscode.Range; preview: string }> = [];
      await vscode.workspace.findTextInFiles(
        { pattern: resref, isRegExp: false, isCaseSensitive: false },
        {
          include: '**/*.{nss,ncs,dlg,2da,utc,utd,ute,uti,utm,utp,uts,utt,utw,are,git,ifo,jrl,res,gff,txt,json,xml,yaml,yml,toml}',
          exclude: '**/{node_modules,.git,dist,build,.next,.cache}/**',
          maxResults: 200,
        },
        (result) => {
          if (result instanceof vscode.TextSearchMatch) {
            const firstRange = Array.isArray(result.ranges) ? result.ranges[0] : result.ranges;
            matches.push({
              uri: result.uri,
              range: firstRange,
              preview: result.preview.text.trim(),
            });
          }
        }
      );

      if (!matches.length) {
        vscode.window.showInformationMessage(`No references found for "${resref}".`);
        return;
      }

      const picks = matches.map((match, index) => ({
        label: `${index + 1}. ${vscode.workspace.asRelativePath(match.uri)}:${match.range.start.line + 1}`,
        description: match.preview,
        match,
      }));
      const selected = await vscode.window.showQuickPick(picks, {
        title: `References for "${resref}"`,
        placeHolder: `Found ${matches.length} references`,
      });

      if (!selected) return;

      const document = await vscode.workspace.openTextDocument(selected.match.uri);
      const editor = await vscode.window.showTextDocument(document, { preview: false });
      editor.selection = new vscode.Selection(selected.match.range.start, selected.match.range.end);
      editor.revealRange(selected.match.range, vscode.TextEditorRevealType.InCenter);
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
