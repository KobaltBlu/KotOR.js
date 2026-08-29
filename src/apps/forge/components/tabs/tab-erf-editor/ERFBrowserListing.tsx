/**
 * Archive entry listing — Details, List, Icons, and Tiles views.
 *
 * @file ERFBrowserListing.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useEffect, useRef } from "react";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import * as KotOR from "@/apps/forge/KotOR";
import {
  formatERFOffset,
  getERFFileIconClass,
  isERFFolderNode,
  type ErfBrowserSortKey,
} from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserTypes";
import type { TabERFEditorState } from "@/apps/forge/states/tabs/TabERFEditorState";

export interface ERFBrowserListingProps {
  tab: TabERFEditorState;
  nodes: FileBrowserNode[];
  onContextMenu: (event: React.MouseEvent, node: FileBrowserNode) => void;
  onOpenResource: (archive: KotOR.ERFObject, key: KotOR.IERFKeyEntry) => void;
}

const DETAIL_COLUMNS: { key: ErfBrowserSortKey; label: string; className: string }[] = [
  { key: "name", label: "Name", className: "erf-col-name" },
  { key: "type", label: "Type", className: "erf-col-type" },
  { key: "size", label: "Size", className: "erf-col-size" },
  { key: "offset", label: "Offset", className: "erf-col-offset" },
  { key: "resId", label: "ResID", className: "erf-col-resid" },
];

export function ERFBrowserListing(props: ERFBrowserListingProps) {
  const { tab, nodes, onContextMenu, onOpenResource } = props;
  const listRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(
    (node: FileBrowserNode) => {
      tab.selectNode(node);
    },
    [tab],
  );

  const onActivate = useCallback(
    (node: FileBrowserNode) => {
      if (isERFFolderNode(node)) {
        tab.enterFolder(node);
        return;
      }
      const { archive, resource } = node.data || {};
      if (archive && resource) {
        onOpenResource(archive, resource);
      }
    },
    [tab, onOpenResource],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!nodes.length) {
        return;
      }
      const selectedId = tab.selectedNode?.id;
      let index = nodes.findIndex((n) => n.id === selectedId);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        index = Math.min(nodes.length - 1, Math.max(0, index + 1));
        tab.selectNode(nodes[index]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        index = Math.max(0, index <= 0 ? 0 : index - 1);
        tab.selectNode(nodes[index]);
      } else if (e.key === "Enter" && tab.selectedNode) {
        e.preventDefault();
        onActivate(tab.selectedNode);
      } else if (e.key === "Backspace" && tab.cwdPath.length > 1) {
        e.preventDefault();
        tab.navigateToBreadcrumb(tab.cwdPath.length - 2);
      }
    },
    [nodes, tab, onActivate],
  );

  useEffect(() => {
    listRef.current?.focus({ preventScroll: true });
  }, [tab.cwdPath.length, tab.viewMode]);

  const selectedId = tab.selectedNode?.id;

  if (tab.viewMode === "details") {
    return (
      <div
        className="erf-listing erf-listing--details"
        ref={listRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="grid"
        aria-label="Archive entries"
      >
        <div className="erf-details-header" role="row">
          {DETAIL_COLUMNS.map((col) => {
            const active = tab.sortKey === col.key;
            return (
              <button
                key={col.key}
                type="button"
                className={`erf-details-header__cell ${col.className}${active ? " is-sorted" : ""}`}
                onClick={() => tab.setSort(col.key)}
                role="columnheader"
                aria-sort={
                  active ? (tab.sortDir === "asc" ? "ascending" : "descending") : "none"
                }
              >
                {col.label}
                {active && (
                  <i
                    className={`fas ${tab.sortDir === "asc" ? "fa-sort-up" : "fa-sort-down"}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="erf-details-body" role="rowgroup">
          {nodes.map((node) => (
            <ERFDetailsRow
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              onSelect={onSelect}
              onActivate={onActivate}
              onContextMenu={onContextMenu}
            />
          ))}
          {!nodes.length && <div className="erf-listing__empty">No matching entries</div>}
        </div>
      </div>
    );
  }

  if (tab.viewMode === "list") {
    return (
      <div
        className="erf-listing erf-listing--list"
        ref={listRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="Archive entries"
      >
        {nodes.map((node) => (
          <ERFBrowserItem
            key={node.id}
            mode="list"
            node={node}
            selected={node.id === selectedId}
            onSelect={onSelect}
            onActivate={onActivate}
            onContextMenu={onContextMenu}
          />
        ))}
        {!nodes.length && <div className="erf-listing__empty">No matching entries</div>}
      </div>
    );
  }

  if (tab.viewMode === "tiles") {
    return (
      <div
        className="erf-listing erf-listing--tiles"
        ref={listRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="Archive entries"
      >
        {nodes.map((node) => (
          <ERFBrowserItem
            key={node.id}
            mode="tiles"
            node={node}
            selected={node.id === selectedId}
            onSelect={onSelect}
            onActivate={onActivate}
            onContextMenu={onContextMenu}
          />
        ))}
        {!nodes.length && <div className="erf-listing__empty">No matching entries</div>}
      </div>
    );
  }

  return (
    <div
      className="erf-listing erf-listing--icons"
      ref={listRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="listbox"
      aria-label="Archive entries"
    >
      {nodes.map((node) => (
        <ERFBrowserItem
          key={node.id}
          mode="icons"
          node={node}
          selected={node.id === selectedId}
          onSelect={onSelect}
          onActivate={onActivate}
          onContextMenu={onContextMenu}
        />
      ))}
      {!nodes.length && <div className="erf-listing__empty">No matching entries</div>}
    </div>
  );
}

interface ERFDetailsRowProps {
  node: FileBrowserNode;
  selected: boolean;
  onSelect: (node: FileBrowserNode) => void;
  onActivate: (node: FileBrowserNode) => void;
  onContextMenu: (event: React.MouseEvent, node: FileBrowserNode) => void;
}

function ERFDetailsRow(props: ERFDetailsRowProps) {
  const { node, selected, onSelect, onActivate, onContextMenu } = props;
  const size = node.data?.size ?? 0;
  const offset = node.data?.offset ?? 0;
  const resId = node.data?.resId;
  const typeLabel = node.data?.typeLabel || "";
  const icon = getERFFileIconClass(node);

  return (
    <div
      className={`erf-details-row${selected ? " is-selected" : ""}`}
      role="row"
      aria-selected={selected}
      onClick={() => onSelect(node)}
      onDoubleClick={() => onActivate(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <span className="erf-col-name" role="gridcell">
        <i className={`fas ${icon} erf-item__icon`} aria-hidden="true" />
        <span className="erf-item__name">{node.name}</span>
      </span>
      <span className="erf-col-type" role="gridcell">
        {typeLabel}
      </span>
      <span className="erf-col-size" role="gridcell">
        {isERFFolderNode(node) ? `${node.nodes?.length || 0} items` : KotOR.Utility.bytesToSize(size)}
      </span>
      <span className="erf-col-offset" role="gridcell">
        {isERFFolderNode(node) ? "—" : formatERFOffset(offset)}
      </span>
      <span className="erf-col-resid" role="gridcell">
        {typeof resId === "number" && resId >= 0 ? resId : "—"}
      </span>
    </div>
  );
}

interface ERFBrowserItemProps {
  mode: "list" | "icons" | "tiles";
  node: FileBrowserNode;
  selected: boolean;
  onSelect: (node: FileBrowserNode) => void;
  onActivate: (node: FileBrowserNode) => void;
  onContextMenu: (event: React.MouseEvent, node: FileBrowserNode) => void;
}

function ERFBrowserItem(props: ERFBrowserItemProps) {
  const { mode, node, selected, onSelect, onActivate, onContextMenu } = props;
  const icon = getERFFileIconClass(node);
  const typeLabel = node.data?.typeLabel || "";
  const size = node.data?.size ?? 0;

  return (
    <div
      className={`erf-item erf-item--${mode}${selected ? " is-selected" : ""}`}
      role="option"
      aria-selected={selected}
      title={node.name}
      onClick={() => onSelect(node)}
      onDoubleClick={() => onActivate(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <i className={`fas ${icon} erf-item__icon`} aria-hidden="true" />
      <span className="erf-item__name">{node.name}</span>
      {mode === "tiles" && (
        <span className="erf-item__meta">
          <span>{typeLabel}</span>
          <span>
            {isERFFolderNode(node)
              ? `${node.nodes?.length || 0} items`
              : KotOR.Utility.bytesToSize(size)}
          </span>
        </span>
      )}
    </div>
  );
}
