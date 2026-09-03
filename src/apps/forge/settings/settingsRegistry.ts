/**
 * Settings page registry. Add a pane by registering one page object.
 *
 * @file settingsRegistry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { createContext, useContext } from "react";

export type SettingsPageGroup = "application" | "editors";

export const SETTINGS_PAGE_GROUPS: ReadonlyArray<{ id: SettingsPageGroup; label: string }> = [
  { id: "application", label: "Application" },
  { id: "editors", label: "Editors" },
];

export interface SettingsPage {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  group?: SettingsPageGroup;
  render: () => React.ReactNode;
  matchesQuery?: (query: string) => boolean;
}

const pages: SettingsPage[] = [];

export function registerSettingsPage(page: SettingsPage): void {
  const exists = pages.some((entry) => entry.id === page.id);
  if (exists) {
    console.warn("settingsRegistry: page already registered", page.id);
    return;
  }
  pages.push(page);
}

export function getSettingsPages(): SettingsPage[] {
  return pages;
}

export function getSettingsPageGroup(page: SettingsPage): SettingsPageGroup {
  return page.group || "application";
}

export function pageMatchesQuery(page: SettingsPage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (page.label.toLowerCase().indexOf(q) !== -1) {
    return true;
  }
  for (let i = 0; i < page.keywords.length; i++) {
    if (page.keywords[i].toLowerCase().indexOf(q) !== -1) {
      return true;
    }
  }
  if (typeof page.matchesQuery === "function") {
    return page.matchesQuery(query);
  }
  return false;
}

export const SettingsSearchContext = createContext("");

export function useSettingsSearch(): string {
  return useContext(SettingsSearchContext);
}

export function settingMatchesQuery(query: string, ...parts: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  for (let i = 0; i < parts.length; i++) {
    if ((parts[i] || "").toLowerCase().indexOf(q) !== -1) {
      return true;
    }
  }
  return false;
}
