import * as path from 'path';
import * as vscode from 'vscode';

import { LogScope, createScopedLogger } from './logger';

const log = createScopedLogger(LogScope.Extension);

export function registerTaskProvider(context: vscode.ExtensionContext): void {
  const provider = vscode.tasks.registerTaskProvider('kotor-forge', {
    async provideTasks(): Promise<vscode.Task[]> {
      const tasks: vscode.Task[] = [];
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) return tasks;

      try {
        const files = await vscode.workspace.findFiles('**/*.nss', undefined, 50);
        for (const uri of files) {
          const name = path.basename(uri.fsPath);
          const task = new vscode.Task(
            { type: 'kotor-forge', script: uri.fsPath },
            vscode.TaskScope.Workspace,
            `Debug NWScript: ${name}`,
            'KotOR Forge'
          );
          task.definition = { type: 'kotor-forge', script: uri.fsPath, label: task.name };
          tasks.push(task);
        }
      } catch (e) {
        log.warn('provideTasks failed: %s', String(e));
      }
      return tasks;
    },

    resolveTask(_task: vscode.Task): vscode.Task | undefined {
      return undefined;
    }
  });
  context.subscriptions.push(provider);
  log.debug('KotOR Forge task provider registered');
}
