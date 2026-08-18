import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabTLKEditorState } from "@/apps/forge/states/tabs/TabTLKEditorState";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { ForgeButton, ForgeSpinner } from "@/apps/forge/components/ui";
import * as KotOR from "@/apps/forge/KotOR";
import { TLKSearchResult } from "@/managers/TLKManager";
import { TLKStringUpdate } from "@/resource/TLKObject";
import { normalizeSoundResRef } from "@/apps/forge/states/tabs/ssfEditorTlkHelpers";

import { forgeTlkSettings } from "@/apps/forge/settings/forgeEditorsSettings";

const ROW_HEIGHT = 32;
const SEARCH_DEBOUNCE_MS = 250;
const VIEWPORT_OVERSCAN_ROWS = 4;
const MIN_VISIBLE_ROWS = 32;

function formatFlagsSummary(entry: KotOR.TLKString): string {
  const parts: string[] = [];
  if (entry.hasTextPresent()) parts.push("text");
  if (entry.hasSoundPresent()) parts.push("sound");
  if (entry.hasSoundLengthPresent()) parts.push("sound length");
  const hex = (entry.flags >>> 0).toString(16).toUpperCase().padStart(4, "0");
  const labels = parts.length ? parts.join(", ") : "none";
  return `0x${hex} · ${labels}`;
}

export const TabTLKEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabTLKEditorState;
  const [tlkObject, setTlkObject] = useState<KotOR.TLKObject | undefined>(() => tab.tlkObject);
  const [dataVersion, setDataVersion] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TLKSearchResult[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(MIN_VISIBLE_ROWS - 1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const pendingAutoplay = useRef(false);

  const listScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastUndoKey = useRef<string | null>(null);
  const searchGenerationRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQuery = searchQuery.trim();
  const isFiltering = activeQuery.length > 0;
  const isQueryPending = trimmedQuery !== activeQuery;

  const stopWebAudioPreview = useCallback(() => {
    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      try {
        bufferSourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      bufferSourceRef.current = null;
    }
    setPreviewPlaying(false);
    setPreviewLoading(false);
  }, []);

  const stopPreview = useCallback(() => {
    stopWebAudioPreview();
    setPreviewError(null);
  }, [stopWebAudioPreview]);

  const resetListScroll = useCallback(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollTop = 0;
    }
  }, []);

  const onFileLoad = useCallback(() => {
    lastUndoKey.current = null;
    setTlkObject(tab.tlkObject);
    setSearchQuery("");
    setActiveQuery("");
    setSearchResults([]);
    setLimitReached(false);
    setIsSearching(false);
    setSelectedIndex(-1);
    resetListScroll();
    setDataVersion((v) => v + 1);
    setHistoryVersion((v) => v + 1);
    stopPreview();
  }, [resetListScroll, stopPreview, tab]);

  const applySearchResults = useCallback(
    (query: string, results: TLKSearchResult[], hitLimit: boolean) => {
      setActiveQuery(query);
      setLimitReached(hitLimit);
      setSearchResults(results);
      resetListScroll();
      setIsSearching(false);
    },
    [resetListScroll],
  );

  const runSearch = useCallback(
    (query: string) => {
      const generation = ++searchGenerationRef.current;

      if (!query) {
        applySearchResults("", [], false);
        return;
      }

      if (!tab.tlkObject) {
        applySearchResults("", [], false);
        return;
      }

      setIsSearching(true);
      window.setTimeout(() => {
        if (generation !== searchGenerationRef.current) return;

        const limit = forgeTlkSettings.get().searchResultCap;
        const results = tab.search(query, { limit: limit + 1, includeResRef: true });
        const hitLimit = results.length > limit;
        applySearchResults(
          query,
          hitLimit ? results.slice(0, limit) : results,
          hitLimit,
        );
      }, 0);
    },
    [applySearchResults, tab],
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!trimmedQuery) {
      runSearch("");
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runSearch(trimmedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [trimmedQuery, runSearch, tlkObject]);

  const flushSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    runSearch(trimmedQuery);
  }, [runSearch, trimmedQuery]);

  const clearSearchFilter = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    searchGenerationRef.current += 1;
    setSearchQuery("");
    setActiveQuery("");
    setSearchResults([]);
    setLimitReached(false);
    setIsSearching(false);
    resetListScroll();
  }, [resetListScroll]);

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      flushSearch();
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearSearchFilter();
      searchInputRef.current?.blur();
    }
  };

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", onFileLoad);
    if (tab.tlkObject) {
      onFileLoad();
    }
    return () => {
      tab.removeEventListener("onEditorFileLoad", onFileLoad);
      stopPreview();
    };
  });

  const listCount = useMemo(() => {
    if (!tlkObject) return 0;
    return isFiltering ? searchResults.length : tlkObject.getStringCount();
  }, [tlkObject, isFiltering, searchResults.length, dataVersion]);

  const syncListViewport = useCallback(() => {
    const el = listScrollRef.current;
    const lastRow = Math.max(0, listCount - 1);
    if (!el) {
      setViewStart(0);
      setViewEnd(Math.min(lastRow, MIN_VISIBLE_ROWS - 1));
      return;
    }

    const scrollTop = el.scrollTop;
    const rawHeight = el.clientHeight;
    const viewportHeight = rawHeight > 0 ? rawHeight : MIN_VISIBLE_ROWS * ROW_HEIGHT;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIEWPORT_OVERSCAN_ROWS);
    let end = Math.min(
      lastRow,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + VIEWPORT_OVERSCAN_ROWS,
    );
    if (rawHeight === 0 && lastRow > end) {
      end = Math.min(lastRow, Math.max(end, MIN_VISIBLE_ROWS - 1));
    }
    setViewStart(start);
    setViewEnd(end);
  }, [listCount]);

  const getListEntry = useCallback(
    (row: number): TLKSearchResult | undefined => {
      if (!tlkObject || row < 0) return undefined;
      if (isFiltering) {
        return searchResults[row];
      }
      const entry = tlkObject.TLKStrings[row];
      if (!entry) return undefined;
      return { index: row, text: entry.getDisplayText() };
    },
    [tlkObject, isFiltering, searchResults, dataVersion],
  );

  const selectedString = useMemo(() => {
    if (!tlkObject || selectedIndex < 0) return undefined;
    return tlkObject.TLKStrings[selectedIndex];
  }, [tlkObject, selectedIndex, dataVersion]);

  const virtualHeight = listCount * ROW_HEIGHT;

  useLayoutEffect(() => {
    syncListViewport();
  }, [syncListViewport, listCount, dataVersion, isFiltering, activeQuery]);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncListViewport());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncListViewport]);

  const onListScroll = useCallback(() => {
    syncListViewport();
  }, [syncListViewport]);

  const scrollToIndex = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        if (!listScrollRef.current) return;
        const top = index * ROW_HEIGHT;
        listScrollRef.current.scrollTop = Math.max(0, top - ROW_HEIGHT * 2);
        syncListViewport();
      });
    },
    [syncListViewport],
  );

  const refreshAfterStructureChange = useCallback(
    (nextIndex: number) => {
      clearSearchFilter();
      setTlkObject(tab.tlkObject);
      setSelectedIndex(nextIndex);
      setDataVersion((v) => v + 1);
      stopPreview();
      if (nextIndex >= 0) {
        scrollToIndex(nextIndex);
      }
    },
    [clearSearchFilter, scrollToIndex, stopPreview, tab],
  );

  const onAddString = useCallback(
    (afterIndex?: number) => {
      tab.captureUndoSnapshot();
      setHistoryVersion((v) => v + 1);
      const newIndex = tab.addString(afterIndex);
      if (newIndex < 0) return;
      refreshAfterStructureChange(newIndex);
    },
    [refreshAfterStructureChange, tab],
  );

  const onDeleteString = useCallback(() => {
    if (selectedIndex < 0 || !tlkObject) return;
    const label = selectedString.getDisplayText().slice(0, 60) || "";
    const prompt =
      `Delete string [${selectedIndex}]?` +
      (label ? `\n\n"${label}${label.length >= 60 ? "…" : ""}"` : "") +
      "\n\nLater string IDs will shift down. Existing STRREFs above this index are unaffected; at and above the next index they will point to different strings.";
    if (!window.confirm(prompt)) return;

    tab.captureUndoSnapshot();
    setHistoryVersion((v) => v + 1);
    const removedIndex = selectedIndex;
    if (!tab.deleteString(removedIndex)) return;

    const nextCount = tab.tlkObject?.getStringCount() ?? 0;
    const nextIndex = nextCount === 0 ? -1 : Math.min(removedIndex, nextCount - 1);
    refreshAfterStructureChange(nextIndex);
  }, [refreshAfterStructureChange, selectedIndex, tab, tlkObject]);

  const onBeforeEdit = useCallback(
    (field: string) => {
      const key = `${selectedIndex}:${field}`;
      if (lastUndoKey.current === key) return;
      lastUndoKey.current = key;
      tab.captureUndoSnapshot();
      setHistoryVersion((v) => v + 1);
    },
    [selectedIndex, tab],
  );

  const onAfterEdit = useCallback(() => {
    lastUndoKey.current = null;
  }, []);

  const commitField = useCallback(
    (field: keyof TLKStringUpdate, raw: string | number) => {
      if (selectedIndex < 0) return;
      if (field === "Value") {
        tab.updateString(selectedIndex, { Value: String(raw) });
      } else if (field === "SoundResRef") {
        tab.updateString(selectedIndex, { SoundResRef: String(raw) });
      } else if (field === "VolumeVariance") {
        tab.updateString(selectedIndex, { VolumeVariance: Number(raw) >>> 0 });
      } else if (field === "PitchVariance") {
        tab.updateString(selectedIndex, { PitchVariance: Number(raw) >>> 0 });
      } else if (field === "SoundLength") {
        tab.updateString(selectedIndex, { SoundLength: Number(raw) >>> 0 });
      }
      setDataVersion((v) => v + 1);
    },
    [selectedIndex, tab],
  );

  const togglePreview = useCallback(async () => {
    if (!selectedString) return;

    if (previewPlaying) {
      stopPreview();
      return;
    }

    const resRef = normalizeSoundResRef(selectedString.getDisplaySoundResRef());
    if (!resRef) {
      setPreviewError("No SoundResRef");
      return;
    }

    stopWebAudioPreview();
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      const data = await KotOR.AudioLoader.LoadSound(resRef);
      if (data == null || !data.byteLength) {
        throw new Error("Sound not found");
      }

      const audioCtx = KotOR.AudioEngine.GetAudioEngine().audioCtx;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      const pcmBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
      const audioBuffer = await audioCtx.decodeAudioData(pcmBuffer);

      const bufferSourceNode = audioCtx.createBufferSource();
      bufferSourceNode.buffer = audioBuffer;
      bufferSourceNode.connect(KotOR.AudioEngine.sfxChannel.getGainNode());
      bufferSourceNode.onended = () => {
        bufferSourceRef.current = null;
        setPreviewPlaying(false);
      };
      bufferSourceNode.start(0, 0);
      bufferSourceRef.current = bufferSourceNode;
      setPreviewPlaying(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Load failed";
      setPreviewError(msg);
      stopWebAudioPreview();
    } finally {
      setPreviewLoading(false);
    }
  }, [previewPlaying, selectedString, stopPreview, stopWebAudioPreview]);

  useEffect(() => {
    if (!pendingAutoplay.current || selectedIndex < 0 || !selectedString) {
      return;
    }
    pendingAutoplay.current = false;
    void togglePreview();
  }, [selectedIndex, selectedString, togglePreview]);

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        {
          label: "Save",
          shortcut: "Ctrl+S",
          onClick: () => {
            void tab.save();
          },
          disabled: !tlkObject,
        },
        {
          label: "Save As...",
          onClick: () => {
            void tab.saveAs();
          },
          disabled: !tlkObject,
        },
      ],
    },
    {
      label: "Edit",
      children: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          onClick: () => {
            tab.undo();
            setHistoryVersion((v) => v + 1);
          },
          disabled: !tab.canUndo,
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          onClick: () => {
            tab.redo();
            setHistoryVersion((v) => v + 1);
          },
          disabled: !tab.canRedo,
        },
        { id: "sep-strings", separator: true },
        {
          label: "Add String",
          onClick: () => onAddString(),
          disabled: !tlkObject,
        },
        {
          label: "Insert After Selection",
          onClick: () => onAddString(selectedIndex),
          disabled: !tlkObject || selectedIndex < 0,
        },
        {
          label: "Delete String",
          onClick: () => onDeleteString(),
          disabled: !tlkObject || selectedIndex < 0,
        },
      ],
    },
  ];

  void historyVersion;

  const resultsMeta = useMemo(() => {
    if (!tlkObject) return null;
    if (isSearching || isQueryPending) {
      return trimmedQuery ? `Searching for “${trimmedQuery}”…` : null;
    }
    if (!isFiltering) {
      return `${listCount.toLocaleString()} entr${listCount === 1 ? "y" : "ies"}`;
    }
    if (limitReached) {
      return `${forgeTlkSettings.get().searchResultCap.toLocaleString()}+ matches for “${activeQuery}” — refine your search`;
    }
    if (searchResults.length === 0) {
      return `No matches for “${activeQuery}”`;
    }
    return `${searchResults.length.toLocaleString()} match${searchResults.length === 1 ? "" : "es"} for “${activeQuery}”`;
  }, [
    tlkObject,
    isFiltering,
    isSearching,
    isQueryPending,
    trimmedQuery,
    activeQuery,
    limitReached,
    listCount,
    searchResults.length,
  ]);

  const showNoResults = Boolean(
    tlkObject && isFiltering && !isSearching && !isQueryPending && searchResults.length === 0,
  );

  return (
    <div className="tab-tlk-editor">
      <MenuBar items={menuItems} />

      <div className="tab-tlk-editor__body">
        <div className="tab-tlk-editor__list-pane">
          <div className="tab-tlk-editor__search-row">
            <label className="tab-tlk-editor__search-field">
              <span className="tab-tlk-editor__search-icon" aria-hidden="true">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                className="tab-tlk-editor__search-input"
                placeholder="Search text, SoundResRef, or string ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                aria-label="Search talk table strings"
                autoComplete="off"
                spellCheck={false}
              />
              {(isSearching || isQueryPending) && trimmedQuery && (
                <span className="tab-tlk-editor__search-spinner" aria-hidden="true">
                  <ForgeSpinner animation="border" size="sm" />
                </span>
              )}
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  className="tab-tlk-editor__search-clear"
                  onClick={clearSearchFilter}
                  aria-label="Clear search"
                  title="Clear search (Esc)"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </label>
          </div>

          {resultsMeta && (
            <div
              className={`tab-tlk-editor__results-meta${
                isSearching || isQueryPending ? " tab-tlk-editor__results-meta--pending" : ""
              }${showNoResults ? " tab-tlk-editor__results-meta--empty" : ""}`}
            >
              {resultsMeta}
            </div>
          )}

          <div
            className="tab-tlk-editor__results-scroll"
            ref={listScrollRef}
            onScroll={onListScroll}
          >
            {!tlkObject && (
              <div className="tab-tlk-editor__empty">
                <p>Loading talk table...</p>
              </div>
            )}

            {tlkObject && (isSearching || isQueryPending) && trimmedQuery && (
              <div className="tab-tlk-editor__empty tab-tlk-editor__empty--pending">
                <ForgeSpinner animation="border" size="sm" />
                <p>Searching…</p>
              </div>
            )}

            {showNoResults && (
              <div className="tab-tlk-editor__empty tab-tlk-editor__empty--no-results">
                <i className="fa-regular fa-face-frown tab-tlk-editor__empty-icon" aria-hidden="true" />
                <p>No strings match your search</p>
                <small>Try a different phrase, SoundResRef, or numeric string ID</small>
              </div>
            )}

            {tlkObject && listCount > 0 && !(trimmedQuery && (isSearching || isQueryPending)) && (
              <div className="tab-tlk-editor__results-virtual" style={{ height: virtualHeight }}>
                {viewEnd >= viewStart &&
                  Array.from({ length: viewEnd - viewStart + 1 }, (_, offset) => {
                    const row = viewStart + offset;
                    const result = getListEntry(row);
                    if (!result) return null;
                    const preview =
                      result.text.length > 120 ? `${result.text.slice(0, 120)}…` : result.text;
                    return (
                      <div
                        key={result.index}
                        className={`tab-tlk-editor__result-row${
                          result.index === selectedIndex ? " tab-tlk-editor__result-row--active" : ""
                        }`}
                        style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}
                        onClick={() => {
                          pendingAutoplay.current = forgeTlkSettings.get().autoplayVo;
                          setSelectedIndex(result.index);
                          stopPreview();
                        }}
                      >
                        <span className="tab-tlk-editor__result-index">[{result.index}]</span>
                        <span className="tab-tlk-editor__result-text" title={result.text}>
                          {preview || "—"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="tab-tlk-editor__detail-pane">
          <div className="tab-tlk-editor__detail-actions">
            <ForgeButton
              size="sm"
              variant="outline-secondary"
              onClick={() => onAddString()}
              disabled={!tlkObject}
            >
              Add String
            </ForgeButton>
            <ForgeButton
              size="sm"
              variant="outline-secondary"
              onClick={() => onAddString(selectedIndex)}
              disabled={!tlkObject || selectedIndex < 0}
            >
              Insert After
            </ForgeButton>
            <ForgeButton
              size="sm"
              variant="outline-danger"
              onClick={() => onDeleteString()}
              disabled={!tlkObject || selectedIndex < 0}
            >
              Delete
            </ForgeButton>
          </div>

          {!selectedString ? (
            <div className="tab-tlk-editor__empty">
              <p>Select a string from the list to edit</p>
            </div>
          ) : (
            <>
              <div className="tab-tlk-editor__detail-fields">
              <div className="tab-tlk-editor__field">
                <label>String ID</label>
                <input type="text" value={selectedIndex} readOnly />
              </div>

              <div className="tab-tlk-editor__field">
                <label>Value</label>
                <textarea
                  value={selectedString.Value}
                  onFocus={() => onBeforeEdit("Value")}
                  onChange={(e) => commitField("Value", e.target.value)}
                  onBlur={onAfterEdit}
                />
              </div>

              <div className="tab-tlk-editor__field">
                <label>SoundResRef</label>
                <input
                  type="text"
                  value={String(selectedString.SoundResRef ?? "")}
                  onFocus={() => onBeforeEdit("SoundResRef")}
                  onChange={(e) => commitField("SoundResRef", e.target.value)}
                  onBlur={onAfterEdit}
                />
                <div className="tab-tlk-editor__preview-row">
                  <ForgeButton
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => void togglePreview()}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <>
                        <ForgeSpinner animation="border" size="sm" /> Loading...
                      </>
                    ) : previewPlaying ? (
                      "Stop"
                    ) : (
                      "Play preview"
                    )}
                  </ForgeButton>
                  {previewError && (
                    <span className="tab-tlk-editor__preview-error">{previewError}</span>
                  )}
                </div>
              </div>

              <div className="tab-tlk-editor__field-row">
                <div className="tab-tlk-editor__field">
                  <label>Sound length</label>
                  <input
                    type="number"
                    value={selectedString.SoundLength}
                    onFocus={() => onBeforeEdit("SoundLength")}
                    onChange={(e) => commitField("SoundLength", e.target.value)}
                    onBlur={onAfterEdit}
                  />
                </div>
                <div className="tab-tlk-editor__field">
                  <label>Volume variance</label>
                  <input
                    type="number"
                    value={selectedString.VolumeVariance}
                    onFocus={() => onBeforeEdit("VolumeVariance")}
                    onChange={(e) => commitField("VolumeVariance", e.target.value)}
                    onBlur={onAfterEdit}
                  />
                </div>
                <div className="tab-tlk-editor__field">
                  <label>Pitch variance</label>
                  <input
                    type="number"
                    value={selectedString.PitchVariance}
                    onFocus={() => onBeforeEdit("PitchVariance")}
                    onChange={(e) => commitField("PitchVariance", e.target.value)}
                    onBlur={onAfterEdit}
                  />
                </div>
              </div>
              </div>

              <div className="tab-tlk-editor__flags-meta" title="TLK string flags (read-only, derived from content on save)">
                {formatFlagsSummary(selectedString)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
