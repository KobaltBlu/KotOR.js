/**
 * DLGNavigationManager class.
 *
 * Manages navigation history for the DLG editor (back/forward).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGNavigationManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DLGTreeNode } from '@/apps/forge/interfaces/DLGTreeNode';

export interface NavigationEntry {
  nodeId: string;
  timestamp: number;
}

export class DLGNavigationManager {
  private history: NavigationEntry[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;
  private changeListeners: (() => void)[] = [];

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Navigate to a node
   */
  public navigateTo(nodeId: string): void {
    const entry: NavigationEntry = {
      nodeId,
      timestamp: Date. now()
    };

    // If we're not at the end of history, remove everything after current position
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Don't add if it's the same as current
    if (this.currentIndex >= 0 && this.history[this.currentIndex].nodeId === nodeId) {
      return;
    }

    this.history.push(entry);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    this.notifyChange();
  }

  /**
   * Go back in history
   */
  public goBack(): string | null {
    if (!this.canGoBack()) {
      return null;
    }

    this.currentIndex--;
    this.notifyChange();
    return this.history[this.currentIndex].nodeId;
  }

  /**
   * Go forward in history
   */
  public goForward(): string | null {
    if (!this.canGoForward()) {
      return null;
    }

    this.currentIndex++;
    this.notifyChange();
    return this.history[this.currentIndex].nodeId;
  }

  /**
   * Check if can go back
   */
  public canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can go forward
   */
  public canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current entry
   */
  public getCurrentEntry(): NavigationEntry | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Get history
   */
  public getHistory(): NavigationEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  public clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyChange();
  }

  /**
   * Register a change listener
   */
  public onChange(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }
}
