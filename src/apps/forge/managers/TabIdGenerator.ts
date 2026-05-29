/**
 * Shared tab ID counter. Lives in its own module to avoid circular dependency
 * between TabState (states/tabs) and EditorTabManager (which imports from states/tabs).
 */
let __tabId = 0;

export function GetNewTabID(): number {
  return __tabId++;
}
