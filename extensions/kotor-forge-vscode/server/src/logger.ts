/**
 * Server-side logger that forwards to the LSP connection console.
 * Set the connection once from server.ts so all server modules can log
 * to the same KotOR Forge output channel.
 */

import type { Connection } from 'vscode-languageserver/node';

const PREFIX = '[HoloLSP Server]';

let connection: Connection | undefined;

function _noop(_msg: string) {}

export function setServerConnection(conn: Connection): void {
  connection = conn;
  conn.console.log(`${PREFIX} [trace] Logger connected; server log level controlled by Output panel`);
}

function formatMsg(level: string, msg: string, ...args: unknown[]): string {
  let formatted = msg;
  if (args.length > 0) {
    formatted = msg.replace(/%[sdifoO]/g, () => String(args.shift() ?? ''));
  }
  return `${PREFIX} [${level}] ${formatted}`;
}

export function trace(msg: string, ...args: unknown[]): void {
  if (connection) {
    connection.console.log(formatMsg('trace', msg, ...args));
  }
}

export function debug(msg: string, ...args: unknown[]): void {
  if (connection) {
    connection.console.log(formatMsg('debug', msg, ...args));
  }
}

export function info(msg: string, ...args: unknown[]): void {
  if (connection) {
    connection.console.info(formatMsg('info', msg, ...args));
  }
}

export function warn(msg: string, ...args: unknown[]): void {
  if (connection) {
    connection.console.warn(formatMsg('warn', msg, ...args));
  }
}

export function error(msg: string, ...args: unknown[]): void {
  if (connection) {
    connection.console.error(formatMsg('error', msg, ...args));
  }
}
