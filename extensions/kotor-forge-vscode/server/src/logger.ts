/**
 * Server-side logger that forwards to the LSP connection console.
 * Set the connection once from server.ts so all server modules can log
 * to the same KotOR Forge output channel.
 */

import type { Connection } from 'vscode-languageserver/node';

const PREFIX = '[HoloLSP Server]';

let connection: Connection | undefined;

function noop(_msg: string) {}

export function setServerConnection(conn: Connection): void {
  connection = conn;
  conn.console.log(`${PREFIX} [trace] Logger connected; server log level controlled by Output panel`);
}

export function trace(msg: string): void {
  if (connection) {
    connection.console.log(`${PREFIX} [trace] ${msg}`);
  }
}

export function debug(msg: string): void {
  if (connection) {
    connection.console.log(`${PREFIX} [debug] ${msg}`);
  }
}

export function info(msg: string): void {
  if (connection) {
    connection.console.info(`${PREFIX} [info] ${msg}`);
  }
}

export function warn(msg: string): void {
  if (connection) {
    connection.console.warn(`${PREFIX} [warn] ${msg}`);
  }
}

export function error(msg: string): void {
  if (connection) {
    connection.console.error(`${PREFIX} [error] ${msg}`);
  }
}
