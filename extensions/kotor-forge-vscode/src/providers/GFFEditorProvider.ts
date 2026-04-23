import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for GFF-based file editors (UTC, UTD, UTP, UTI, UTE, UTS, UTT, UTW, UTM, etc.)
 */
export class GFFEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.gff';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      GFFEditorProvider.viewType,
      new GFFEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'gff';
  }
}

/**
 * Provider for UTC (Creature Template) files with 3D preview
 */
export class UTCEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utc';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTCEditorProvider.viewType,
      new UTCEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utc';
  }
}

/**
 * Provider for UTD (Door Template) files
 */
export class UTDEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utd';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTDEditorProvider.viewType,
      new UTDEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utd';
  }
}

/**
 * Provider for UTP (Placeable Template) files with 3D preview
 */
export class UTPEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utp';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTPEditorProvider.viewType,
      new UTPEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utp';
  }
}

/**
 * Provider for UTI (Item Template) files
 */
export class UTIEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.uti';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTIEditorProvider.viewType,
      new UTIEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'uti';
  }
}

/**
 * Provider for UTE (Encounter Template) files
 */
export class UTEEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.ute';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTEEditorProvider.viewType,
      new UTEEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'ute';
  }
}

/**
 * Provider for UTS (Sound Template) files
 */
export class UTSEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.uts';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTSEditorProvider.viewType,
      new UTSEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'uts';
  }
}

/**
 * Provider for UTT (Trigger Template) files
 */
export class UTTEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utt';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTTEditorProvider.viewType,
      new UTTEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utt';
  }
}

/**
 * Provider for UTW (Waypoint Template) files
 */
export class UTWEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utw';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTWEditorProvider.viewType,
      new UTWEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utw';
  }
}

/**
 * Provider for UTM (Merchant Template) files
 */
export class UTMEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.utm';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      UTMEditorProvider.viewType,
      new UTMEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'utm';
  }
}
