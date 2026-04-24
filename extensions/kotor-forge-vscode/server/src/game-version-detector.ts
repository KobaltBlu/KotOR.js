/**
 * Game Version Detection for NWScript Files
 * Parses comments to determine target game version (KOTOR 1 vs KOTOR 2/TSL)
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';

import { trace } from './logger';
import { SemanticError } from './semantic-analyzer';

export type GameVersion = 'kotor1' | 'kotor2' | 'both';

export interface GameVersionInfo {
  version: GameVersion;
  hasExplicitVersion: boolean;
  versionLine?: number;
  versionColumn?: number;
}

export class GameVersionDetector {
  private static readonly VERSION_PATTERNS = [
    // TypeScript/C++ style pragma comments
    /^\s*\/\/\s*@target\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,
    /^\s*\/\/\s*@game\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,
    /^\s*\/\/\s*@version\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,

    // Pragma-style comments
    /^\s*\/\/\s*#pragma\s+target\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,
    /^\s*\/\/\s*#pragma\s+game\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,

    // JSDoc-style comments
    /^\s*\/\*\*?\s*@target\s+(kotor1|kotor2|tsl|k1|k2)\s*\*\//i,
    /^\s*\/\*\*?\s*@game\s+(kotor1|kotor2|tsl|k1|k2)\s*\*\//i,

    // Simple comment patterns
    /^\s*\/\/\s*(kotor1|kotor2|tsl|k1|k2)\s+only\s*$/i,
    /^\s*\/\/\s*for\s+(kotor1|kotor2|tsl|k1|k2)\s*$/i,
    /^\s*\/\/\s*target:\s*(kotor1|kotor2|tsl|k1|k2)\s*$/i
  ];

  public static detectGameVersion(sourceText: string): GameVersionInfo {
    trace('GameVersionDetector.detectGameVersion() entered');
    const lines = sourceText.split('\n');
    const headerLines = lines.slice(0, 10);

    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i] || '';
      for (const pattern of this.VERSION_PATTERNS) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const versionString = match[1].toLowerCase();
          const version = this.normalizeVersion(versionString);
          trace(`GameVersionDetector.detectGameVersion() found version=${version} line=${i}`);
          return {
            version,
            hasExplicitVersion: true,
            versionLine: i,
            versionColumn: line.indexOf(match[0])
          };
        }
      }
    }

    trace('GameVersionDetector.detectGameVersion() no explicit version, defaulting to both');
    return {
      version: 'both',
      hasExplicitVersion: false
    };
  }

  public static generateMissingVersionWarning(sourceText: string): SemanticError | null {
    const versionInfo = this.detectGameVersion(sourceText);

    if (!versionInfo.hasExplicitVersion) {
      return {
        message: 'No target game version specified. Add a comment like "// @target kotor1" or "// @target kotor2" at the top of the file',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 1, offset: 1 }
        },
        code: 'missing-game-version'
      };
    }

    return null;
  }

  public static generateVersionQuickFixes(): Array<{
    title: string;
    kind: string;
    edit: {
      range: { start: { line: number; character: number }, end: { line: number; character: number } };
      newText: string;
    };
  }> {
    return [
      {
        title: 'Add KOTOR 1 target comment',
        kind: 'quickfix',
        edit: {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          newText: '// @target kotor1\n'
        }
      },
      {
        title: 'Add KOTOR 2/TSL target comment',
        kind: 'quickfix',
        edit: {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          newText: '// @target kotor2\n'
        }
      }
    ];
  }

  private static normalizeVersion(versionString: string): GameVersion {
    switch (versionString) {
      case 'kotor1':
      case 'k1':
        return 'kotor1';
      case 'kotor2':
      case 'tsl':
      case 'k2':
        return 'kotor2';
      default:
        return 'both';
    }
  }

  public static getVersionDisplayName(version: GameVersion): string {
    switch (version) {
      case 'kotor1':
        return 'KOTOR 1';
      case 'kotor2':
        return 'KOTOR 2/TSL';
      case 'both':
        return 'KOTOR 1 & 2';
    }
  }

  public static getVersionDescription(version: GameVersion): string {
    switch (version) {
      case 'kotor1':
        return 'Knights of the Old Republic (2003)';
      case 'kotor2':
        return 'Knights of the Old Republic II: The Sith Lords (2004)';
      case 'both':
        return 'Compatible with both KOTOR games';
    }
  }
}
