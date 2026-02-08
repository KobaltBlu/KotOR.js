import * as vscode from 'vscode';

// Import all editor providers
import {
  GFFEditorProvider,
  UTCEditorProvider,
  UTDEditorProvider,
  UTPEditorProvider,
  UTIEditorProvider,
  UTEEditorProvider,
  UTSEditorProvider,
  UTTEditorProvider,
  UTWEditorProvider,
  UTMEditorProvider
} from './providers/GFFEditorProvider';
import { TwoDAEditorProvider } from './providers/TwoDAEditorProvider';
import { ERFEditorProvider } from './providers/ERFEditorProvider';
import { ModelViewerProvider } from './providers/ModelViewerProvider';
import { ImageViewerProvider } from './providers/ImageViewerProvider';
import { DLGEditorProvider } from './providers/DLGEditorProvider';
import { TLKEditorProvider } from './providers/TLKEditorProvider';
import { LIPEditorProvider } from './providers/LIPEditorProvider';
import { SSFEditorProvider } from './providers/SSFEditorProvider';
import { WalkmeshEditorProvider } from './providers/WalkmeshEditorProvider';
import { AudioPlayerProvider } from './providers/AudioPlayerProvider';
import { BinaryViewerProvider } from './providers/BinaryViewerProvider';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('KotOR Forge extension is now active');

  // Register all custom editor providers
  context.subscriptions.push(
    // GFF-based template editors
    UTCEditorProvider.register(context),
    UTDEditorProvider.register(context),
    UTPEditorProvider.register(context),
    UTIEditorProvider.register(context),
    UTEEditorProvider.register(context),
    UTSEditorProvider.register(context),
    UTTEditorProvider.register(context),
    UTWEditorProvider.register(context),
    UTMEditorProvider.register(context),
    GFFEditorProvider.register(context),

    // Specialized editors
    TwoDAEditorProvider.register(context),
    ERFEditorProvider.register(context),
    ModelViewerProvider.register(context),
    ImageViewerProvider.register(context),
    DLGEditorProvider.register(context),
    TLKEditorProvider.register(context),
    LIPEditorProvider.register(context),
    SSFEditorProvider.register(context),
    WalkmeshEditorProvider.register(context),
    AudioPlayerProvider.register(context),

    // Fallback binary viewer
    BinaryViewerProvider.register(context)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('kotorForge.setKotorPath', async () => {
      const path = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select KotOR Installation Directory'
      });
      if (path && path[0]) {
        await vscode.workspace.getConfiguration('kotorForge').update('kotorPath', path[0].fsPath, true);
        vscode.window.showInformationMessage(`KotOR path set to: ${path[0].fsPath}`);
      }
    }),

    vscode.commands.registerCommand('kotorForge.setTSLPath', async () => {
      const path = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select KotOR II Installation Directory'
      });
      if (path && path[0]) {
        await vscode.workspace.getConfiguration('kotorForge').update('tslPath', path[0].fsPath, true);
        vscode.window.showInformationMessage(`KotOR II path set to: ${path[0].fsPath}`);
      }
    })
  );

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'Welcome to KotOR Forge! Set your game installation paths in settings to enable resource browsing.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'kotorForge');
      }
    });
    context.globalState.update('hasShownWelcome', true);
  }
}

/**
 * Extension deactivation function
 */
export function deactivate() {
  console.log('KotOR Forge extension is now deactivated');
}
