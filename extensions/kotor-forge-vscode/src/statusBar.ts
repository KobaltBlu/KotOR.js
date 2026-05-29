import * as vscode from 'vscode';

import { LogScope, createScopedLogger } from './logger';

const log = createScopedLogger(LogScope.Extension);

export function registerStatusBarItem(context: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(item);

  function update(): void {
    const config = vscode.workspace.getConfiguration('kotorForge');
    const kotorPath = config.get<string>('kotorPath', '');
    const tslPath = config.get<string>('tslPath', '');
    const activeGame = config.get<string>('activeGame', 'kotor');

    item.color = new vscode.ThemeColor('kotorForge.statusBar.foreground');
    if (kotorPath || tslPath) {
      const label = activeGame === 'tsl' ? 'TSL' : 'K1';
      item.text = `$(gamepad) KotOR: ${label}`;
      item.tooltip = activeGame === 'tsl'
        ? `Active: TSL | Path: ${tslPath || '(not set)'}`
        : `Active: KotOR I | Path: ${kotorPath || '(not set)'}`;
      item.command = 'workbench.action.openSettings';
      item.arguments = ['kotorForge'];
      item.show();
    } else {
      item.text = '$(gamepad) KotOR: No game set';
      item.tooltip = 'Set KotOR or TSL path in settings';
      item.command = 'workbench.action.openSettings';
      item.arguments = ['kotorForge'];
      item.show();
    }
  }

  update();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kotorForge')) update();
    })
  );

  log.debug('Status bar item registered');
}
