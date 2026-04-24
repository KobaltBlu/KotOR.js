/**
 * Shared logger for KotOR.js and Forge. Used by the main app and by the
 * VS Code webview; when running in the extension webview, the host sends
 * logLevel in the init message so verbosity matches kotorForge.logLevel.
 */
/* eslint-disable no-console -- Logger is the designated console bridge; only this file may use console for output */

export const LogLevel = {
  Trace: 0,
  Debug: 1,
  Info: 2,
  Warn: 3,
  Error: 4,
  Off: 5,
} as const;

export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];

export const LogLevelFromString: Record<string, LogLevelValue> = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  off: LogLevel.Off,
};

export interface ILogWriter {
  trace(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  /** Accepts string, Error, or unknown (e.g. from catch). Converts unknown to string for output. */
  error(msg: string | Error | unknown, ...args: unknown[]): void;
}

const _noop = (_msg: string, ..._args: unknown[]) => {};

let currentLevel: LogLevelValue = LogLevel.Info;
let customWriter: ILogWriter | null = null;

function shouldLog(level: LogLevelValue): boolean {
  if (currentLevel === LogLevel.Off) return false;
  return level >= currentLevel;
}

function formatMessage(scope: string, msg: string): string {
  return scope ? `${scope} ${msg}` : msg;
}

/**
 * Set minimum log level. In the VS Code webview, the host sends this in the init message.
 */
export function setLogLevel(level: LogLevelValue | string): void {
  if (typeof level === 'string') {
    currentLevel = LogLevelFromString[level.toLowerCase()] ?? LogLevel.Info;
  } else {
    currentLevel = level;
  }
}

export function getLogLevel(): LogLevelValue {
  return currentLevel;
}

/**
 * Optional: set a custom writer (e.g. to forward to extension host). If not set, console is used.
 */
export function setLogWriter(writer: ILogWriter | null): void {
  customWriter = writer;
}

function write(
  level: LogLevelValue,
  scope: string,
  method: keyof ILogWriter,
  msg: string | Error | unknown,
  ...args: unknown[]
): void {
  const msgStr = typeof msg === 'string' ? msg : msg instanceof Error ? msg.message : String(msg);
  if (!shouldLog(level)) return;
  const full = formatMessage(scope, msgStr);
  if (customWriter) {
    const fn = customWriter[method];
    if (typeof fn === 'function') {
      fn(full, ...args);
    }
    return;
  }
  switch (method) {
    case 'trace':
      console.debug(full, ...args);
      break;
    case 'debug':
      console.debug(full, ...args);
      break;
    case 'info':
      console.info(full, ...args);
      break;
    case 'warn':
      console.warn(full, ...args);
      break;
    case 'error':
      if (msg instanceof Error) {
        console.error(full, msg, ...args);
      } else {
        console.error(full, ...args);
      }
      break;
    default:
      console.log(full, ...args);
  }
}

export const LogScope = {
  Extension: '[Extension]',
  Forge: '[Forge]',
  Document: '[Document]',
  NWScript: '[NWScript]',
  Webview: '[Webview]',
  Debug: '[Debug]',
  Provider: '[Provider]',
  Game: '[Game]',
  Loader: '[Loader]',
  Module: '[Module]',
  Config: '[Config]',
  Manager: '[Manager]',
  Resource: '[Resource]',
  Audio: '[Audio]',
  Combat: '[Combat]',
  GUI: '[GUI]',
  Action: '[Action]',
  Effect: '[Effect]',
  Event: '[Event]',
  Electron: '[Electron]',
  Launcher: '[Launcher]',
  Controls: '[Controls]',
  Default: '',
} as const;

export type LogScopeValue = (typeof LogScope)[keyof typeof LogScope];

export interface IScopedLogger extends ILogWriter {
  readonly name: string;
}

/**
 * Create a scoped logger. Messages are prefixed with the scope.
 * Respects setLogLevel (and in webview, the level sent in init).
 */
export function createScopedLogger(scope: string): IScopedLogger {
  return {
    get name() {
      return scope || 'KotOR';
    },
    trace: (msg: string, ...args: unknown[]) => write(LogLevel.Trace, scope, 'trace', msg, ...args),
    debug: (msg: string, ...args: unknown[]) => write(LogLevel.Debug, scope, 'debug', msg, ...args),
    info: (msg: string, ...args: unknown[]) => write(LogLevel.Info, scope, 'info', msg, ...args),
    warn: (msg: string, ...args: unknown[]) => write(LogLevel.Warn, scope, 'warn', msg, ...args),
    error: (msg: string | Error | unknown, ...args: unknown[]) => write(LogLevel.Error, scope, 'error', msg, ...args),
  };
}
