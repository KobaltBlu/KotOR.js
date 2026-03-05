import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Forge-KotOR.js Logging System
// ---------------------------------------------------------------------------
// All extension output goes through a single VS Code LogOutputChannel named
// "Forge-KotOR.js". The channel is created with `{ log: true }` which gives
// VS Code's built-in log level filtering via the Output panel dropdown:
//   Trace > Debug > Info > Warning > Error
//
// Scoped loggers prefix every message with a tag (e.g. [Extension], [NWScript])
// so you can quickly filter in the Output panel.
//
// Usage:
//   import { createScopedLogger, LogScope } from './logger';
//   const log = createScopedLogger(LogScope.NWScript);
//   log.trace('verbose detail');
//   log.debug('debugging info');
//   log.info('normal operation');
//   log.warn('something unexpected');
//   log.error('failure!');
//
// Change log level:
//   - In the Output panel, select "Forge-KotOR.js" and use the dropdown to
//     choose Trace / Debug / Info / Warning / Error.
//   - Or set "kotorForge.logLevel" in settings.json.
// ---------------------------------------------------------------------------

const noop = (..._args: unknown[]) => {};
const LOG_LEVEL_LOOKUP: Record<string, vscode.LogLevel> = {
  trace: vscode.LogLevel.Trace,
  debug: vscode.LogLevel.Debug,
  info: vscode.LogLevel.Info,
  warn: vscode.LogLevel.Warning,
  error: vscode.LogLevel.Error,
};

function makeNoopChannel(): vscode.LogOutputChannel {
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    append: noop,
    appendLine: noop,
    replace: noop,
    clear: noop,
    show: noop,
    hide: noop,
    dispose: noop,
    get name() {
      return 'Forge-KotOR.js (no-op)';
    },
    get logLevel() {
      return vscode.LogLevel.Off;
    },
    onDidChangeLogLevel: new vscode.EventEmitter<vscode.LogLevel>().event,
  } as unknown as vscode.LogOutputChannel;
}

let extensionChannel: vscode.LogOutputChannel | undefined;
const noopChannel = makeNoopChannel();
let configuredLogLevel: vscode.LogLevel = vscode.LogLevel.Info;

function shouldLog(level: vscode.LogLevel): boolean {
  return level >= configuredLogLevel;
}

export function setConfiguredLogLevel(level: string | vscode.LogLevel): vscode.LogLevel {
  if (typeof level === 'string') {
    const normalized = level.trim().toLowerCase();
    configuredLogLevel = LOG_LEVEL_LOOKUP[normalized] ?? vscode.LogLevel.Info;
    return configuredLogLevel;
  }

  configuredLogLevel = level;
  return configuredLogLevel;
}

export function getConfiguredLogLevel(): vscode.LogLevel {
  return configuredLogLevel;
}

/**
 * Set the extension's log output channel. Called once during activation.
 * The channel must be created with `{ log: true }` so users can set the log
 * level (Trace / Debug / Info / Warning / Error) from the Output panel dropdown.
 */
export function setExtensionLogger(channel: vscode.LogOutputChannel): void {
  extensionChannel = channel;
  channel.trace('[Logger] Output channel registered – all scoped loggers now write here');
}

/**
 * Get the extension's raw LogOutputChannel.  Prefer `createScopedLogger()`
 * for component-level logging; use `getLogger()` only when you need to pass
 * the channel directly (e.g. as `outputChannel` for LanguageClient).
 *
 * The output appears in the "Forge-KotOR.js" view in the Output panel.
 */
export function getLogger(): vscode.LogOutputChannel {
  return extensionChannel ?? noopChannel;
}

// ---------------------------------------------------------------------------
// Canonical log scopes – every component uses exactly one of these prefixes
// so messages can be filtered by scope in the Output panel.
// ---------------------------------------------------------------------------
export const LogScope = {
  /** Extension activation / deactivation, commands, lifecycle */
  Extension: '[Extension]',
  /** Forge editor host adapter, tab management */
  Forge: '[Forge]',
  /** KotorDocument serialisation, binary I/O */
  Document: '[Document]',
  /** NWScript language server client, LSP communication */
  NWScript: '[NWScript]',
  /** Webview bridge, postMessage traffic */
  Webview: '[Webview]',
  /** Debug adapter, DAP traffic, breakpoints */
  Debug: '[Debug]',
  /** Custom editor provider registration */
  Provider: '[Provider]',
} as const;

export type LogScopeValue = (typeof LogScope)[keyof typeof LogScope];

/**
 * A lightweight logger facade that delegates to the shared Forge-KotOR.js
 * LogOutputChannel but prefixes every message with a scope tag.
 *
 * The returned object is **lazy** – it always resolves the current output
 * channel at call-time, so loggers created before `setExtensionLogger()` will
 * still write to the real channel once it is set.
 *
 * ```ts
 * const log = createScopedLogger(LogScope.NWScript);
 * log.trace('connection handshake');   // => [NWScript] connection handshake
 * log.error('server crashed');         // => [NWScript] server crashed
 * ```
 */
export function createScopedLogger(scope: string) {
  // Use a getter so we always resolve to the real channel once it's available.
  const ch = () => extensionChannel ?? noopChannel;

  return {
    get name() { return ch().name; },
    get logLevel() { return ch().logLevel; },
    get onDidChangeLogLevel() { return ch().onDidChangeLogLevel; },

    // ---- log level methods (all 5 from trace→error) ----
    trace: (msg: string, ...args: unknown[]) => {
      if (!shouldLog(vscode.LogLevel.Trace)) return;
      ch().trace(`${scope} ${msg}`, ...args);
    },
    debug: (msg: string, ...args: unknown[]) => {
      if (!shouldLog(vscode.LogLevel.Debug)) return;
      ch().debug(`${scope} ${msg}`, ...args);
    },
    info:  (msg: string, ...args: unknown[]) => {
      if (!shouldLog(vscode.LogLevel.Info)) return;
      ch().info(`${scope} ${msg}`, ...args);
    },
    warn:  (msg: string, ...args: unknown[]) => {
      if (!shouldLog(vscode.LogLevel.Warning)) return;
      ch().warn(`${scope} ${msg}`, ...args);
    },
    error: (msg: string | Error, ...args: unknown[]) => {
      if (!shouldLog(vscode.LogLevel.Error)) return;
      ch().error(`${scope} ${msg}`, ...args);
    },

    // ---- raw output (unfiltered) ----
    append:     (value: string) => ch().append(value),
    appendLine: (value: string) => ch().appendLine(value),
    replace:    (value: string) => ch().replace(value),

    // ---- channel management ----
    clear: ()                       => ch().clear(),
    show:  (preserveFocus?: boolean) => ch().show(preserveFocus),
    hide:  ()                       => ch().hide(),
    dispose: ()                     => ch().dispose(),
  } as vscode.LogOutputChannel;
}
