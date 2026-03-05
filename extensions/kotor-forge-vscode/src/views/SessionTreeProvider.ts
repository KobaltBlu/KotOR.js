import * as vscode from 'vscode';

export interface SessionTreeNode {
  id: string;
  userId: string;
  game: string;
  status: string;
  containerStatus?: string;
  warningInMs?: number;
  expiresInMs?: number;
}

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionTreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SessionTreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SessionTreeNode): vscode.TreeItem {
    const expires = typeof element.expiresInMs === 'number'
      ? `${Math.max(0, Math.round(element.expiresInMs / 1000))}s`
      : '?';
    const item = new vscode.TreeItem(`${element.userId} (${element.game.toUpperCase()})`, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    const container = element.containerStatus || 'unknown';
    item.description = `${element.status}/${container} • ${expires}`;
    item.tooltip = `Session ${element.id}\nStatus: ${element.status}\nContainer: ${container}\nUser: ${element.userId}\nExpires in: ${expires}`;
    item.contextValue = 'kotorForge.session';
    return item;
  }

  async getChildren(_element?: SessionTreeNode): Promise<SessionTreeNode[]> {
    const cfg = vscode.workspace.getConfiguration('kotorForge');
    const sessionManagerUrl = cfg.get<string>('sessionManagerUrl', '').trim();
    if (!sessionManagerUrl) {
      return [];
    }

    try {
      const endpoint = new URL('/api/sessions', sessionManagerUrl).toString();
      const response = await fetch(endpoint);
      if (!response.ok) {
        return [];
      }
      const sessions = await response.json() as SessionTreeNode[];
      return Array.isArray(sessions) ? sessions : [];
    } catch {
      return [];
    }
  }
}
