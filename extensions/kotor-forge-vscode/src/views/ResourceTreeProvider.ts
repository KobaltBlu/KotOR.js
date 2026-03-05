import * as path from 'path';
import * as vscode from 'vscode';

import { KotorForgeProvider } from '../providers/KotorForgeProvider';

type ResourceNode = ResourceGroupNode | ResourceFileNode;

interface ResourceGroupNode {
  kind: 'group';
  id: string;
  label: string;
  extensions: string[];
}

interface ResourceFileNode {
  kind: 'file';
  id: string;
  uri: vscode.Uri;
  groupId: string;
}

const RESOURCE_GROUPS: ResourceGroupNode[] = [
  { kind: 'group', id: 'gff', label: 'GFF Resources', extensions: ['are', 'bic', 'dlg', 'fac', 'gff', 'git', 'gui', 'ifo', 'jrl', 'ltr', 'pth', 'res', 'sav', 'utc', 'utd', 'ute', 'uti', 'utm', 'utp', 'uts', 'utt', 'utw', 'vis'] },
  { kind: 'group', id: 'models', label: 'Models & Walkmeshes', extensions: ['mdl', 'mdx', 'wok'] },
  { kind: 'group', id: 'textures', label: 'Textures & Images', extensions: ['bmp', 'dds', 'gif', 'jpg', 'jpeg', 'png', 'tga', 'tpc', 'webp'] },
  { kind: 'group', id: 'audio', label: 'Audio', extensions: ['bmu', 'mp3', 'ogg', 'wav', 'wma'] },
  { kind: 'group', id: 'scripts-text', label: 'Scripts & Text', extensions: ['2da', 'ini', 'json', 'log', 'ncs', 'nss', 'txi', 'txt', 'xml', 'yaml', 'yml', 'toml'] },
];

export class ResourceTreeProvider implements vscode.TreeDataProvider<ResourceNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<ResourceNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private readonly groupCache = new Map<string, vscode.Uri[]>();

  refresh(): void {
    this.groupCache.clear();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ResourceNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const children = this.groupCache.get(element.id) ?? [];
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.id = `kotorForge.resourceGroup.${element.id}`;
      item.contextValue = 'kotorForge.resourceGroup';
      item.description = `${children.length}`;
      return item;
    }

    const fileName = path.basename(element.uri.fsPath);
    const item = new vscode.TreeItem(fileName, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.resourceUri = element.uri;
    item.contextValue = 'kotorForge.resourceFile';
    item.description = path.dirname(element.uri.fsPath);
    item.tooltip = element.uri.fsPath;
    item.command = {
      title: 'Open in KotOR Forge',
      command: 'vscode.openWith',
      arguments: [element.uri, KotorForgeProvider.viewType],
    };
    return item;
  }

  async getChildren(element?: ResourceNode): Promise<ResourceNode[]> {
    if (!element) {
      await this.ensureGroupCache();
      return RESOURCE_GROUPS;
    }

    if (element.kind === 'group') {
      await this.ensureGroupCache();
      const uris = this.groupCache.get(element.id) ?? [];
      return uris.map((uri) => ({
        kind: 'file' as const,
        id: `${element.id}:${uri.toString()}`,
        uri,
        groupId: element.id,
      }));
    }

    return [];
  }

  private async ensureGroupCache(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.length) {
      this.groupCache.clear();
      return;
    }

    for (const group of RESOURCE_GROUPS) {
      if (!this.groupCache.has(group.id)) {
        const uris = await this.findFilesForExtensions(group.extensions);
        this.groupCache.set(group.id, uris);
      }
    }
  }

  private async findFilesForExtensions(extensions: string[]): Promise<vscode.Uri[]> {
    const unique = Array.from(new Set(extensions.map((ext) => ext.toLowerCase())));
    if (!unique.length) return [];
    const includeGlob = `**/*.{${unique.join(',')}}`;
    const files = await vscode.workspace.findFiles(includeGlob, '**/{.git,node_modules,dist,build,.next,.cache}/**', 10000);
    return files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
  }
}
