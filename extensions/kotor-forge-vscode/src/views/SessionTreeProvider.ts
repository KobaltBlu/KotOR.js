import * as vscode from 'vscode';

export interface SessionTreeNode {
  id: string;
  userId: string;
  game: string;
  status: string;
  containerStatus?: string;
  token?: string;
  accessUrl?: string;
  containerUpstreamUrl?: string;
  containerError?: string;
  warningInMs?: number;
  expiresInMs?: number;
}

function formatRemaining(ms?: number): string {
  if (typeof ms !== 'number') return '?';
  return `${Math.max(0, Math.round(ms / 1000))}s`;
}

function rankStatus(session: SessionTreeNode): number {
  if (session.status === 'active' || session.status === 'warning' || session.status === 'saving') {
    return 0;
  }
  if (session.status === 'closed') return 1;
  return 2;
}

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionTreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SessionTreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SessionTreeNode): vscode.TreeItem {
    const expires = formatRemaining(element.expiresInMs);
    const warning = formatRemaining(element.warningInMs);
    const item = new vscode.TreeItem(`${element.userId} (${element.game.toUpperCase()})`, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    const container = element.containerStatus || 'unknown';
    item.description = `${element.status}/${container} • ${expires}`;
    const upstream = element.containerUpstreamUrl || '(n/a)';
    const failure = element.containerError || '(none)';
    item.tooltip = `Session ${element.id}\nStatus: ${element.status}\nContainer: ${container}\nUser: ${element.userId}\nWarning in: ${warning}\nExpires in: ${expires}\nUpstream: ${upstream}\nContainer error: ${failure}`;
    item.contextValue = element.accessUrl ? 'kotorForge.session.access' : 'kotorForge.session';
    item.iconPath = container === 'failed'
      ? new vscode.ThemeIcon('error')
      : element.status === 'warning'
      ? new vscode.ThemeIcon('warning')
      : (container === 'ready' ? new vscode.ThemeIcon('vm-active') : new vscode.ThemeIcon('vm'));
    if (element.accessUrl) {
      item.command = {
        command: 'kotorForge.openHostedSession',
        title: 'Open Hosted Session',
        arguments: [{ id: element.id, accessUrl: element.accessUrl }],
      };
    }
    return item;
  }

  async getChildren(_element?: SessionTreeNode): Promise<SessionTreeNode[]> {
    const cfg = vscode.workspace.getConfiguration('kotorForge');
    const sessionManagerUrl = cfg.get<string>('sessionManagerUrl', '').trim();
    const adminToken = cfg.get<string>('sessionManagerAdminToken', '').trim();
    if (!sessionManagerUrl) {
      return [];
    }

    try {
      const endpoint = new URL('/api/sessions', sessionManagerUrl);
      if (adminToken) {
        endpoint.searchParams.set('includeTokens', '1');
      }
      const response = await fetch(endpoint.toString(), {
        headers: adminToken
          ? { 'x-admin-token': adminToken }
          : undefined,
      });
      if (!response.ok) {
        return [];
      }
      const sessions = await response.json() as SessionTreeNode[];
      if (!Array.isArray(sessions)) {
        return [];
      }
      return sessions.sort((a, b) => {
        const rankDelta = rankStatus(a) - rankStatus(b);
        if (rankDelta !== 0) return rankDelta;
        return (a.expiresInMs || 0) - (b.expiresInMs || 0);
      });
    } catch {
      return [];
    }
  }
}
