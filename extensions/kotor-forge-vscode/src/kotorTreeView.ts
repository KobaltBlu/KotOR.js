import * as vscode from 'vscode';

import { LogScope, createScopedLogger } from './logger';

const log = createScopedLogger(LogScope.Extension);

const KOTOR_GLOB = '**/*.{2da,are,bic,dlg,erf,fac,gff,git,gui,ifo,jrl,lip,ltr,mdl,mdx,mod,nss,ncs,pth,res,rim,sav,ssf,tga,tlk,tpc,utc,utd,ute,uti,utm,utp,uts,utt,utw,vis,wav,wok,dwk,pwk,bwm}';

export interface KotorTreeItem {
  uri: vscode.Uri;
  label: string;
  description?: string;
  isFolder?: boolean;
}

export class KotorTreeDataProvider implements vscode.TreeDataProvider<KotorTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<KotorTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private recentUris: vscode.Uri[] = [];
  private maxRecent = 20;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: KotorTreeItem): Promise<KotorTreeItem[]> {
    if (element) {
      return [];
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      return [];
    }
    try {
      const files = await vscode.workspace.findFiles(KOTOR_GLOB, undefined, this.maxRecent);
      this.recentUris = files;
      void vscode.commands.executeCommand('setContext', 'kotorForge.hasRecentFiles', files.length > 0);
      return files.map((uri) => ({
        uri,
        label: uri.path.split(/[/\\]/).pop() ?? uri.fsPath,
        description: vscode.workspace.asRelativePath(uri)
      }));
    } catch (e) {
      log.warn('getChildren failed: %s', String(e));
      return [];
    }
  }

  getTreeItem(element: KotorTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.description;
    item.resourceUri = element.uri;
    item.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [element.uri]
    };
    return item;
  }
}

export function registerKotorTreeView(context: vscode.ExtensionContext): void {
  const provider = new KotorTreeDataProvider();
  const treeView = vscode.window.createTreeView('kotor-forge.recent', {
    treeDataProvider: provider,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);

  const refreshDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh());
  context.subscriptions.push(refreshDisposable);

  const watcher = vscode.workspace.createFileSystemWatcher(KOTOR_GLOB);
  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());
  context.subscriptions.push(watcher);

  log.debug('KotOR tree view registered');
}
