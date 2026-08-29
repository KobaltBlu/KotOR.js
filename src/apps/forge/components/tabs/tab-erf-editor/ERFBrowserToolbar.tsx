/**
 * Archive browser toolbar — filter, view modes, sort.
 *
 * @file ERFBrowserToolbar.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { ChangeEvent } from "react";
import { ForgeButton, ForgeButtonGroup, ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import type { TabERFEditorState } from "@/apps/forge/states/tabs/TabERFEditorState";
import type {
  ErfBrowserSortDir,
  ErfBrowserSortKey,
  ErfBrowserViewMode,
} from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserTypes";

export interface ERFBrowserToolbarProps {
  tab: TabERFEditorState;
}

const VIEW_MODES: { id: ErfBrowserViewMode; icon: string; title: string }[] = [
  { id: "details", icon: "fa-list", title: "Details" },
  { id: "list", icon: "fa-bars", title: "List" },
  { id: "icons", icon: "fa-th-large", title: "Icons" },
  { id: "tiles", icon: "fa-th-list", title: "Tiles" },
];

export function ERFBrowserToolbar(props: ERFBrowserToolbarProps) {
  const { tab } = props;

  return (
    <div className="erf-toolbar">
      <ForgeInput
        className="erf-toolbar__filter"
        placeholder="Filter current folder…"
        value={tab.filterQuery}
        onChange={(e: ChangeEvent<HTMLInputElement>) => tab.setFilterQuery(e.target.value)}
        aria-label="Filter archive entries"
      />
      <span className="erf-toolbar__spacer" />
      <label className="erf-toolbar__sort-label">
        <span>Sort</span>
        <ForgeSelect
          size="sm"
          value={tab.sortKey}
          onChange={(e) => tab.setSort(e.target.value as ErfBrowserSortKey, tab.sortDir)}
          aria-label="Sort by"
        >
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="size">Size</option>
          <option value="offset">Offset</option>
          <option value="resId">ResID</option>
        </ForgeSelect>
      </label>
      <ForgeButton
        size="sm"
        variant="outline-secondary"
        title={tab.sortDir === "asc" ? "Ascending" : "Descending"}
        onClick={() =>
          tab.setSort(tab.sortKey, (tab.sortDir === "asc" ? "desc" : "asc") as ErfBrowserSortDir)
        }
      >
        <i className={`fas ${tab.sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down"}`} />
      </ForgeButton>
      <ForgeButtonGroup size="sm" className="erf-toolbar__views" role="group" aria-label="View mode">
        {VIEW_MODES.map((mode) => (
          <ForgeButton
            key={mode.id}
            size="sm"
            variant="outline-secondary"
            active={tab.viewMode === mode.id}
            title={mode.title}
            onClick={() => tab.setViewMode(mode.id)}
          >
            <i className={`fas ${mode.icon}`} />
          </ForgeButton>
        ))}
      </ForgeButtonGroup>
    </div>
  );
}
