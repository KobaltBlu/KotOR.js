/**
 * First-run Trask Ulgo tour state machine.
 *
 * @file TraskTourState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import {
  getSessionSettings,
  setSessionSettings,
} from "@/apps/forge/settings/forgeSessionSettings";
import {
  getTraskTourStep,
  getTraskTourStepCount,
  type TraskTourStep,
} from "@/apps/forge/tutorial/traskTourSteps";

export type TraskTourEventType = "onChange";

type TraskTourListeners = {
  onChange: Function[];
};

/** Sync localStorage key — ConfigClient/IDB can race with Init() and drop session flags. */
export const TRASK_TOUR_COMPLETED_STORAGE_KEY = "forge.traskTour.completed";

function readTourCompletedFromStorage(): boolean | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const stored = localStorage.getItem(TRASK_TOUR_COMPLETED_STORAGE_KEY);
    if (stored === "1") {
      return true;
    }
    if (stored === "0") {
      return false;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeTourCompletedToStorage(completed: boolean): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(TRASK_TOUR_COMPLETED_STORAGE_KEY, completed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function isTourCompleted(): boolean {
  const fromStorage = readTourCompletedFromStorage();
  if (fromStorage != null) {
    return fromStorage;
  }
  const fromSession = !!getSessionSettings().traskTourCompleted;
  // Migrate older session-only completions onto the sync storage key.
  if (fromSession) {
    writeTourCompletedToStorage(true);
  }
  return fromSession;
}

function persistTourCompleted(completed: boolean): void {
  writeTourCompletedToStorage(completed);
  setSessionSettings({ traskTourCompleted: completed });
}

export class TraskTourState {
  private static visible = false;
  private static stepIndex = 0;
  private static autoStartAttempted = false;
  private static listeners: TraskTourListeners = {
    onChange: [],
  };

  static isVisible(): boolean {
    return this.visible;
  }

  static getStepIndex(): number {
    return this.stepIndex;
  }

  static getStepCount(): number {
    return getTraskTourStepCount();
  }

  static getCurrentStep(): TraskTourStep | undefined {
    return getTraskTourStep(this.stepIndex);
  }

  static isFirstStep(): boolean {
    return this.stepIndex <= 0;
  }

  static isLastStep(): boolean {
    return this.stepIndex >= this.getStepCount() - 1;
  }

  static shouldAutoStart(): boolean {
    return !isTourCompleted();
  }

  static start(): void {
    this.stepIndex = 0;
    this.visible = true;
    this.emit();
  }

  static tryAutoStart(): boolean {
    if (this.autoStartAttempted) {
      return false;
    }
    this.autoStartAttempted = true;
    if (!this.shouldAutoStart() || this.visible) {
      return false;
    }
    this.start();
    return true;
  }

  static next(): void {
    if (!this.visible) {
      return;
    }
    if (this.isLastStep()) {
      this.finish();
      return;
    }
    this.stepIndex += 1;
    this.emit();
  }

  static prev(): void {
    if (!this.visible || this.isFirstStep()) {
      return;
    }
    this.stepIndex -= 1;
    this.emit();
  }

  static skip(): void {
    if (!this.visible) {
      return;
    }
    this.markCompleted();
    this.visible = false;
    this.stepIndex = 0;
    this.emit();
  }

  static finish(): void {
    if (!this.visible) {
      return;
    }
    this.markCompleted();
    this.visible = false;
    this.stepIndex = 0;
    this.emit();
  }

  /** Clear completion and restart (Settings → Replay). */
  static replay(): void {
    this.autoStartAttempted = true;
    persistTourCompleted(false);
    this.start();
  }

  private static markCompleted(): void {
    persistTourCompleted(true);
  }

  static addEventListener(type: TraskTourEventType, cb: Function): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(cb);
  }

  static removeEventListener(type: TraskTourEventType, cb: Function): void {
    const list = this.listeners[type];
    if (!list) {
      return;
    }
    const index = list.indexOf(cb);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  private static emit(): void {
    const list = this.listeners.onChange;
    for (const cb of list) {
      try {
        cb();
      } catch (err) {
        console.error(err);
      }
    }
  }

  /** Test helper — reset in-memory state without touching settings. */
  static resetForTests(options?: { visible?: boolean; stepIndex?: number }): void {
    this.visible = options?.visible ?? false;
    this.stepIndex = options?.stepIndex ?? 0;
    this.autoStartAttempted = false;
    this.listeners = { onChange: [] };
  }
}
