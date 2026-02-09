import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabTLKEditorState } from "../../../states/tabs";
import { CommandPaletteState } from "../../../states/CommandPaletteState";
import "./TabTLKEditor.scss";

interface BaseTabProps {
  tab: TabTLKEditorState;
}

interface ContextMenuState {
  index: number;
  x: number;
  y: number;
}

export const TabTLKEditor = function TabTLKEditor(props: BaseTabProps) {
  const tab = props.tab as TabTLKEditorState;
  const [tlk, setTlk] = useState(tab.tlk);
  const [selectedIndex, setSelectedIndex] = useState(tab.selectedStringIndex);
  const [searchQuery, setSearchQuery] = useState(tab.searchQuery);
  const [filterQuery, setFilterQuery] = useState(tab.filterQuery);
  const [searchBoxVisible, setSearchBoxVisible] = useState(tab.searchBoxVisible);
  const [jumpBoxVisible, setJumpBoxVisible] = useState(tab.jumpBoxVisible);
  const [jumpValue, setJumpValue] = useState(tab.jumpValue);
  const [revision, setRevision] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    const loadHandler = () => setTlk(tab.tlk);
    const selectHandler = () => setSelectedIndex(tab.selectedStringIndex);
    const searchHandler = (value: string) => setSearchQuery(value);
    const filterHandler = (value: string) => setFilterQuery(value);
    const searchToggleHandler = (visible: boolean) => setSearchBoxVisible(visible);
    const jumpToggleHandler = (visible: boolean) => setJumpBoxVisible(visible);
    const jumpValueHandler = (value: number) => setJumpValue(value);
    const entriesChangedHandler = () => setRevision((prev) => prev + 1);

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onStringSelected', selectHandler);
    tab.addEventListener('onSearchQueryChanged', searchHandler);
    tab.addEventListener('onFilterChanged', filterHandler);
    tab.addEventListener('onSearchBoxToggled', searchToggleHandler);
    tab.addEventListener('onJumpBoxToggled', jumpToggleHandler);
    tab.addEventListener('onJumpValueChanged', jumpValueHandler);
    tab.addEventListener('onEntriesChanged', entriesChangedHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onStringSelected', selectHandler);
      tab.removeEventListener('onSearchQueryChanged', searchHandler);
      tab.removeEventListener('onFilterChanged', filterHandler);
      tab.removeEventListener('onSearchBoxToggled', searchToggleHandler);
      tab.removeEventListener('onJumpBoxToggled', jumpToggleHandler);
      tab.removeEventListener('onJumpValueChanged', jumpValueHandler);
      tab.removeEventListener('onEntriesChanged', entriesChangedHandler);
    };
  }, [tab]);

  useEffect(() => {
    if (searchBoxVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [searchBoxVisible]);

  useEffect(() => {
    if (jumpBoxVisible) {
      setTimeout(() => jumpInputRef.current?.focus(), 0);
    }
  }, [jumpBoxVisible]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        tab.toggleSearchBox(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        tab.toggleJumpBox(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        tab.insertEntry();
      }
    };

    tab.addEventListener('onKeyDown', handler);
    return () => {
      tab.removeEventListener('onKeyDown', handler);
    };
  }, [tab]);

  useEffect(() => {
    const baseId = `tlk.${tab.id}`;
    const register = () => {
      CommandPaletteState.register(`${baseId}.find`, "TLK: Find", "TLK Editor", () => tab.toggleSearchBox(true));
      CommandPaletteState.register(`${baseId}.goto`, "TLK: Go To Line", "TLK Editor", () => tab.toggleJumpBox(true));
      CommandPaletteState.register(`${baseId}.insert`, "TLK: Insert Entry", "TLK Editor", () => tab.insertEntry());
      CommandPaletteState.register(`${baseId}.references`, "TLK: Find References", "TLK Editor", () => {
        if (tab.selectedStringIndex >= 0) {
          tab.findReferencesForIndex(tab.selectedStringIndex);
        }
      });
    };
    const unregister = () => {
      CommandPaletteState.unregister(`${baseId}.find`);
      CommandPaletteState.unregister(`${baseId}.goto`);
      CommandPaletteState.unregister(`${baseId}.insert`);
      CommandPaletteState.unregister(`${baseId}.references`);
    };

    const onShow = () => register();
    const onHide = () => unregister();

    tab.addEventListener('onTabShow', onShow);
    tab.addEventListener('onTabHide', onHide);

    if (tab.visible) {
      register();
    }

    return () => {
      unregister();
      tab.removeEventListener('onTabShow', onShow);
      tab.removeEventListener('onTabHide', onHide);
    };
  }, [tab]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('contextmenu', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
    };
  }, [contextMenu]);

  const filteredEntries = useMemo(() => {
    if (!tlk) return [] as Array<{ index: number; text: string; sound: string }>;
    const filter = (filterQuery ?? '').trim().toLowerCase();
    return tlk.TLKStrings.map((entry, index) => ({
      index,
      text: entry?.Value ?? '',
      sound: entry?.SoundResRef ?? '',
    })).filter((entry) => {
      if (!filter) return true;
      return entry.text.toLowerCase().includes(filter) || entry.sound.toLowerCase().includes(filter);
    });
  }, [tlk, filterQuery, revision]);

  const setRowRef = useCallback((index: number) => (el: HTMLTableRowElement | null) => {
    if (el) {
      rowRefs.current.set(index, el);
    } else {
      rowRefs.current.delete(index);
    }
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const row = rowRefs.current.get(index);
    if (row) {
      row.scrollIntoView({ block: 'center' });
    }
  }, []);

  const handleJump = useCallback(() => {
    if (!tlk) return;
    const target = Number(jumpValue);
    if (!Number.isFinite(target)) return;
    if (target < 0 || target >= tlk.TLKStrings.length) return;
    if (filterQuery.trim()) {
      const visible = filteredEntries.some((entry) => entry.index === target);
      if (!visible) return;
    }
    tab.selectString(target);
    scrollToIndex(target);
  }, [filterQuery, filteredEntries, jumpValue, scrollToIndex, tab, tlk]);

  const handleSearch = useCallback(() => {
    tab.applySearchFilter();
  }, [tab]);

  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!filteredEntries.length) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();

      const currentIdx = filteredEntries.findIndex((entry) => entry.index === selectedIndex);
      const nextIdx = e.key === 'ArrowDown'
        ? Math.min(currentIdx + 1, filteredEntries.length - 1)
        : Math.max(currentIdx - 1, 0);
      const nextEntry = filteredEntries[nextIdx];
      if (!nextEntry) return;
      tab.selectString(nextEntry.index);
      scrollToIndex(nextEntry.index);
    },
    [filteredEntries, scrollToIndex, selectedIndex, tab]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      setContextMenu({ index, x: e.clientX, y: e.clientY });
    },
    []
  );

  if(!tlk){
    return (
      <div className="forge-tlk-editor">
        <div className="forge-tlk-editor__loading">Loading talk table...</div>
      </div>
    );
  }

  const selectedEntry = selectedIndex >= 0 ? tlk.TLKStrings[selectedIndex] : undefined;
  const textValue = selectedEntry?.Value ?? '';
  const soundValue = selectedEntry?.SoundResRef ?? '';

  return (
    <div className="forge-tlk-editor">
      <div className="forge-tlk-editor__content">
        <div className="tlk-actions">
          <button type="button" onClick={() => tab.toggleSearchBox()} className="tlk-action-button">
            Find
          </button>
          <button type="button" onClick={() => tab.toggleJumpBox()} className="tlk-action-button">
            Go To
          </button>
          <button type="button" onClick={() => tab.insertEntry()} className="tlk-action-button">
            Insert
          </button>
        </div>

        <div className="tlk-splitter">
          <div className="tlk-top-pane">
            <div className="tlk-utility-row">
              {searchBoxVisible && (
                <div className="tlk-groupbox">
                  <div className="tlk-groupbox__title">Search</div>
                  <div className="tlk-groupbox__content">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => tab.setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="tlk-input"
                    />
                    <button type="button" onClick={handleSearch} className="tlk-button">
                      Search
                    </button>
                  </div>
                </div>
              )}

              {jumpBoxVisible && (
                <div className="tlk-groupbox">
                  <div className="tlk-groupbox__title">Go To Line</div>
                  <div className="tlk-groupbox__content">
                    <input
                      ref={jumpInputRef}
                      type="number"
                      min={-2147483648}
                      max={Math.max(0, tlk.TLKStrings.length - 1)}
                      value={jumpValue}
                      onChange={(e) => tab.setJumpValue(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleJump();
                        }
                      }}
                      className="tlk-input tlk-input--number"
                    />
                    <button type="button" onClick={handleJump} className="tlk-button">
                      Jump
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="tlk-table" ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown}>
              <table className="tlk-table__table">
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.index}
                      ref={setRowRef(entry.index)}
                      className={selectedIndex === entry.index ? 'selected' : ''}
                      onClick={() => tab.selectString(entry.index)}
                      onContextMenu={(e) => handleContextMenu(e, entry.index)}
                    >
                      <th className="tlk-table__index">{entry.index}</th>
                      <td className="tlk-table__text">{entry.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tlk-bottom-pane">
            <textarea
              className="tlk-text-edit"
              value={textValue}
              onChange={(e) => {
                if (!selectedEntry) return;
                selectedEntry.Value = e.target.value;
                if (tab.file) {
                  tab.file.unsaved_changes = true;
                }
                setRevision((prev) => prev + 1);
              }}
              disabled={!selectedEntry}
              placeholder={selectedEntry ? '' : 'Select a row to edit its text'}
            />
            <div className="tlk-sound-row">
              <label className="tlk-sound-label">Sound ResRef:</label>
              <input
                type="text"
                className="tlk-input"
                value={soundValue}
                maxLength={16}
                onChange={(e) => {
                  if (!selectedEntry) return;
                  selectedEntry.SoundResRef = e.target.value;
                  if (tab.file) {
                    tab.file.unsaved_changes = true;
                  }
                  setRevision((prev) => prev + 1);
                }}
                disabled={!selectedEntry}
              />
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="tlk-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            type="button"
            className="tlk-context-menu__item"
            onClick={() => {
              tab.findReferencesForIndex(contextMenu.index);
              setContextMenu(null);
            }}
          >
            Find LocalizedString references
          </button>
        </div>
      )}
    </div>
  );
};
