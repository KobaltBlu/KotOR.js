import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { TabState } from "@/apps/forge/states/tabs/TabState";

interface AutosaveSnapshotRecord {
  key: string;
  tabType: string;
  fileName: string;
  timestamp: number;
  dataBase64: string;
}

/**
 * Periodic autosave + temporary snapshot manager.
 *
 * - If Editor.AutoSave is enabled, unsaved current tab content is saved at interval.
 * - If Editor.AutoSaveSnapshots is enabled, snapshots are persisted in localStorage so
 *   unsaved changes can be recovered after an unexpected reload/crash.
 */
export class AutosaveManager {
  private timerId: number | undefined;
  private busy = false;
  private currentIntervalMs = 30_000;
  private readonly snapshotIndexKey = "forge.autosave.snapshotIndex";

  constructor(private readonly tabManagerProvider: () => EditorTabManager) {}

  start(): void {
    this.restartTimer(this.readIntervalMs());
  }

  stop(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private restartTimer(nextIntervalMs: number): void {
    this.stop();
    this.currentIntervalMs = nextIntervalMs;
    this.timerId = window.setInterval(() => {
      void this.tick();
    }, this.currentIntervalMs);
  }

  private readIntervalMs(): number {
    const configured = Number(KotOR.ConfigClient.get("Editor.AutoSaveIntervalMs", 30_000));
    if (!Number.isFinite(configured)) return 30_000;
    return Math.max(5_000, Math.min(300_000, configured));
  }

  private async tick(): Promise<void> {
    if (this.busy) return;

    const nextIntervalMs = this.readIntervalMs();
    if (nextIntervalMs !== this.currentIntervalMs) {
      this.restartTimer(nextIntervalMs);
    }

    const manager = this.tabManagerProvider();
    const tab = manager.currentTab;
    if (!(tab instanceof TabState) || !(tab.file instanceof EditorFile) || !tab.file.unsaved_changes) {
      return;
    }

    this.busy = true;
    try {
      if (KotOR.ConfigClient.get("Editor.AutoSaveSnapshots", true)) {
        await this.captureSnapshot(tab);
      }

      if (KotOR.ConfigClient.get("Editor.AutoSave", false)) {
        const saved = await tab.save();
        if (saved) {
          this.removeSnapshot(tab.file);
        }
      }
    } catch (e) {
      console.warn("AutosaveManager tick failed", e);
    } finally {
      this.busy = false;
    }
  }

  async captureSnapshot(tab: TabState): Promise<void> {
    if (!(tab.file instanceof EditorFile)) return;
    const buffer = await tab.getExportBuffer();
    const key = this.getSnapshotKey(tab.file);
    const record: AutosaveSnapshotRecord = {
      key,
      tabType: tab.type,
      fileName: tab.file.getFilename() || "unsaved-resource.bin",
      timestamp: Date.now(),
      dataBase64: this.uint8ToBase64(buffer),
    };

    this.setStorageItem(key, JSON.stringify(record));
    const index = this.getSnapshotIndex().filter((entry) => entry.key !== key);
    index.unshift({ key, tabType: record.tabType, fileName: record.fileName, timestamp: record.timestamp });
    this.setStorageItem(this.snapshotIndexKey, JSON.stringify(index.slice(0, 50)));
  }

  removeSnapshot(file: EditorFile): void {
    const key = this.getSnapshotKey(file);
    localStorage.removeItem(key);
    const index = this.getSnapshotIndex().filter((entry) => entry.key !== key);
    this.setStorageItem(this.snapshotIndexKey, JSON.stringify(index));
  }

  getSnapshotForFile(file: EditorFile): Uint8Array | null {
    const key = this.getSnapshotKey(file);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const record = JSON.parse(raw) as AutosaveSnapshotRecord;
      return this.base64ToUint8(record.dataBase64 || "");
    } catch {
      return null;
    }
  }

  listSnapshots(): Array<{ key: string; tabType: string; fileName: string; timestamp: number }> {
    return this.getSnapshotIndex();
  }

  private getSnapshotKey(file: EditorFile): string {
    const identifier = file.getPath() || file.getFilename() || `${file.resref || "unknown"}.${file.ext || "bin"}`;
    return `forge.autosave.${identifier}`;
  }

  private getSnapshotIndex(): Array<{ key: string; tabType: string; fileName: string; timestamp: number }> {
    const raw = localStorage.getItem(this.snapshotIndexKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => entry && typeof entry.key === "string");
    } catch {
      return [];
    }
  }

  private setStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("AutosaveManager storage write failed", key, e);
    }
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64");
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8(base64: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(base64, "base64"));
    }
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
}
