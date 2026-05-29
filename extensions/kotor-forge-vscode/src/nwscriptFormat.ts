import * as vscode from 'vscode';

import { LogScope, createScopedLogger } from './logger';

const log = createScopedLogger(LogScope.Extension);

/**
 * Simple NWScript document formatter: indent lines by brace depth.
 */
export function registerDocumentFormattingEditProvider(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerDocumentFormattingEditProvider(
    { language: 'nwscript' },
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const tabSize = 4;
        const indent = ' '.repeat(tabSize);
        let depth = 0;
        const lines = document.getText().split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          if (trimmed === '') continue;

          const opens = (line.match(/{/g) || []).length;
          const closes = (line.match(/}/g) || []).length;

          const newIndent = indent.repeat(depth);
          const currentIndent = line.match(/^\s*/)?.[0] ?? '';
          if (newIndent !== currentIndent || line !== newIndent + trimmed) {
            const range = new vscode.Range(i, 0, i, line.length);
            edits.push(vscode.TextEdit.replace(range, newIndent + trimmed));
          }

          depth += opens - closes;
          if (depth < 0) depth = 0;
        }

        log.trace('Format produced %d edits', edits.length);
        return edits;
      }
    }
  );
  context.subscriptions.push(provider);
  log.debug('NWScript document formatting provider registered');
}
