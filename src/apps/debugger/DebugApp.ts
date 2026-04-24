import type { DebuggerState } from '@/apps/debugger/states/DebuggerState';

export class DebugApp {
  /** Instance marker so this class is not treated as extraneous (static-only). */
  private readonly _instance = true;

  static appState: DebuggerState;
}
