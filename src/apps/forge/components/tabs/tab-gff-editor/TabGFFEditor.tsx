import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabGFFEditorState, TabGFFEditorStateEventListenerTypes } from "@/apps/forge/states/tabs";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import { useContextMenu } from "@/apps/forge/components/common/ContextMenu";
import {
  createGFFFieldContextMenuItems,
  createGFFStructContextMenuItems,
} from "@/apps/forge/components/tabs/tab-gff-editor/GFFContextMenu";
import { GFFProperties } from "@/apps/forge/components/tabs/tab-gff-editor/GFFProperties";
import { clampGffLabel, fieldPreview, gffTypeName, structListTitle } from "@/apps/forge/helpers/gffFieldValue";
import {
  countGffFields,
  GFF_ROOT_PATH,
  gffChildStructPath,
  gffFieldPath,
} from "@/apps/forge/helpers/gffTreePath";
import { getGffMemoryClipboard } from "@/apps/forge/helpers/gffJsonCodec";
import { forgeGffSettings, truncateGffPreview } from "@/apps/forge/settings/forgeEditorsSettings";
import "@/apps/forge/components/tabs/tab-gff-editor/TabGFFEditor.scss";

export const TabGFFEditor = function(props: BaseTabProps){
  const tab: TabGFFEditorState = props.tab as TabGFFEditorState;
  const [generation, setGeneration] = useState(tab.generation);
  const initialWidth = Number.isFinite(tab.treeWidthPercent) ? tab.treeWidthPercent : 50;
  const [treeWidth, setTreeWidth] = useState(Math.min(80, Math.max(20, initialWidth)));
  const searchRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const refresh = () => setGeneration(tab.generation);

  useEffectOnce(() => {
    const onTreeChanged = () => refresh();
    const onFileLoad = () => refresh();
    const onNodeSelected = () => refresh();
    const onFocusSearch = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    const onKeyDown = (e: KeyboardEvent) => tab.handleEditorKeyDown(e);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onTreeChanged', onTreeChanged);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onEditorFileLoad', onFileLoad);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onFocusSearch', onFocusSearch);
    tab.addEventListener<TabGFFEditorStateEventListenerTypes>('onKeyDown', onKeyDown);
    const onGffSettings = () => refresh();
    forgeGffSettings.addListener(onGffSettings);
    if (tab.gff && tab.generation === 0) {
      tab.notifyTree();
    }
    return () => {
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onTreeChanged', onTreeChanged);
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onEditorFileLoad', onFileLoad);
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onFocusSearch', onFocusSearch);
      tab.removeEventListener<TabGFFEditorStateEventListenerTypes>('onKeyDown', onKeyDown);
      forgeGffSettings.removeListener(onGffSettings);
    };
  });

  useEffect(() => {
    const path = tab.selectedPath;
    if (!path && path !== GFF_ROOT_PATH) {
      return;
    }
    const root = splitRef.current;
    if (!root) {
      return;
    }
    const escaped = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(path) : path.replace(/"/g, '\\"');
    const el = root.querySelector(`[data-gff-path="${escaped}"] .tree-node-content`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [tab.selectedPath, generation]);

  const onSplitDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !splitRef.current) {
        return;
      }
      const rect = splitRef.current.getBoundingClientRect();
      const percent = ((ev.clientX - rect.left) / rect.width) * 100;
      const next = Math.min(80, Math.max(20, percent));
      tab.treeWidthPercent = next;
      setTreeWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const matchLabel = tab.searchMatches.length
    ? `${tab.searchMatchIndex + 1}/${tab.searchMatches.length}`
    : tab.searchQuery.trim() ? "0/0" : "";

  return (
    <div className="tab-gff-editor" ref={splitRef}>
      <div className="gff-toolbar">
        <ForgeInput
          ref={searchRef}
          className="gff-toolbar__search"
          placeholder="Filter fields by name, type, or value…"
          value={tab.searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => tab.setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) {
                tab.prevSearchMatch();
              } else {
                tab.nextSearchMatch();
              }
            }
          }}
        />
        <span className="gff-toolbar__matches">{matchLabel}</span>
        <ForgeButton size="sm" onClick={() => tab.prevSearchMatch()} disabled={!tab.searchMatches.length}>Prev</ForgeButton>
        <ForgeButton size="sm" onClick={() => tab.nextSearchMatch()} disabled={!tab.searchMatches.length}>Next</ForgeButton>
        <ForgeButton size="sm" onClick={() => tab.expandAll()}>Expand all</ForgeButton>
        <ForgeButton size="sm" onClick={() => tab.collapseAll()}>Collapse all</ForgeButton>
        <span className="gff-toolbar__spacer" />
        <ForgeButton size="sm" onClick={() => { void tab.exportJson(); }}>Export JSON</ForgeButton>
        <ForgeButton size="sm" onClick={() => { void tab.importJson(); }}>Import JSON</ForgeButton>
      </div>
      <div className="gff-body">
        <div className="gff-tree-pane" id="gffContainer" style={{ width: `${treeWidth}%` }}>
          <ForgeTreeView>
            {tab.gff ? (
              <GFFStructElement
                struct={tab.gff.RootNode}
                path={GFF_ROOT_PATH}
                tab={tab}
                depth={0}
                generation={generation}
              />
            ) : null}
          </ForgeTreeView>
        </div>
        <div className="gff-splitter" onMouseDown={onSplitDown} title="Resize" />
        <div className="gff-properties gff-properties-pane" id="gffProperties">
          <GFFProperties tab={tab} generation={generation} />
        </div>
      </div>
      <div className="gff-statusbar">
        <span>{(tab.gff?.FileType || "GFF ").trim() || "GFF"}</span>
        <span>{countGffFields(tab.gff?.RootNode)} fields</span>
        <span>{tab.selectedPath || "Root"}</span>
      </div>
    </div>
  );
};

interface GFFStructElementProps {
  struct: KotOR.GFFStruct;
  path: string;
  tab: TabGFFEditorState;
  depth: number;
  generation: number;
}

const GFFStructElement = function GFFStructElement(props: GFFStructElementProps){
  const { struct, path, tab, depth } = props;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();
  const selected = tab.selectedPath === path;
  const filtering = tab.isSearchFiltering();
  const expanded = tab.isExpanded(path) || filtering;
  const matched = tab.isSearchMatch(path);
  const isRoot = path === GFF_ROOT_PATH;

  const handleToggle = useCallback(() => {
    tab.toggleExpanded(path);
  }, [tab, path]);

  const handleClick = useCallback(() => {
    tab.setSelectedPath(path);
  }, [tab, path]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clipboard = getGffMemoryClipboard();
    showContextMenu(e.clientX, e.clientY, createGFFStructContextMenuItems({
      isRoot,
      canPaste: clipboard?.kind === "field",
      onAddField: (type) => tab.addField(type, path),
      onCut: () => tab.cutPath(path),
      onCopy: () => { tab.copyPath(path); },
      onPaste: () => { void tab.pasteInto(path); },
      onDuplicate: () => tab.duplicatePath(path),
      onDelete: () => { tab.deletePath(path); },
    }));
  }, [struct, path, tab, isRoot, showContextMenu]);

  if (!struct || !tab.isSearchVisible(path)) {
    return <></>;
  }

  const fields = struct.getFields();
  const childNodes = expanded ? (
    <>
      {fields.map((field: KotOR.GFFField) => {
        const fieldPath = gffFieldPath(path, field.getLabel());
        if (filtering && !tab.isSearchVisible(fieldPath)) {
          return null;
        }
        return (
          <GFFFieldElement
            key={`${path}.${field.getLabel()}.${field.getType()}.${field.uuid}.${props.generation}`}
            field={field}
            path={fieldPath}
            tab={tab}
            depth={depth + 1}
            generation={props.generation}
          />
        );
      })}
      {filtering ? null : (
        <li className="gff-field add" onClick={() => tab.addField(KotOR.GFFDataType.BYTE, path)}>
          <span className="field-icon"><i className="fa-solid fa-plus"></i></span>
          <span className="field-label"><a>[Add Field]</a></span>
        </li>
      )}
    </>
  ) : null;

  return (
    <>
      <ListItemNode
        id={path || "gff-root"}
        name={isRoot ? `[Root] Struct ID ${struct.getType()}` : structListTitle(struct)}
        className={matched ? "gff-match" : ""}
        hasChildren={true}
        isExpanded={expanded}
        isSelected={selected}
        depth={depth}
        icon="fa-cube"
        iconType="folder"
        hasContextMenu={true}
        onToggle={handleToggle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        dataAttributes={{
          "data-struct-id": struct.getType(),
          "data-uuid": struct.uuid,
          "data-gff-path": path,
        }}
        labelContent={
          <span className="gff-node-label gff-node-label--struct">
            {isRoot ? "[Root] " : ""}
            <span className="gff-node-label__title">{isRoot ? `Struct ID ${struct.getType()}` : structListTitle(struct)}</span>
          </span>
        }
      >
        {childNodes}
      </ListItemNode>
      {ContextMenuComponent}
    </>
  );
};

interface GFFFieldElementProps {
  field: KotOR.GFFField;
  path: string;
  tab: TabGFFEditorState;
  depth: number;
  generation: number;
}

const GFFFieldElement = function GFFFieldElement(props: GFFFieldElementProps){
  const { field, path, tab, depth } = props;
  const { showContextMenu, ContextMenuComponent } = useContextMenu();
  const selected = tab.selectedPath === path;
  const type = field.getType();
  const typeName = gffTypeName(type);
  const isList = type === KotOR.GFFDataType.LIST || type === KotOR.GFFDataType.STRUCT;
  const hasChildren = isList;
  const expanded = hasChildren && (tab.isExpanded(path) || tab.isSearchFiltering());
  const matched = tab.isSearchMatch(path);
  const renaming = tab.renamingPath === path;
  const gffSettings = forgeGffSettings.get();
  const preview = fieldPreview(field);
  const previewText = gffSettings.showPreview ? truncateGffPreview(preview, gffSettings.previewMaxLength) : "";

  const handleToggle = useCallback(() => {
    tab.toggleExpanded(path);
  }, [tab, path]);

  const handleClick = useCallback(() => {
    tab.setSelectedPath(path);
  }, [tab, path]);

  const handleDoubleClick = useCallback(() => {
    tab.renamingPath = path;
    tab.notifyTree();
  }, [tab, path]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clipboard = getGffMemoryClipboard();
    const canPaste = type === KotOR.GFFDataType.LIST ? clipboard?.kind === "struct" : clipboard?.kind === "field";
    showContextMenu(e.clientX, e.clientY, createGFFFieldContextMenuItems({
      isList: type === KotOR.GFFDataType.LIST,
      canPaste: !!canPaste,
      onAddStruct: () => tab.addListStruct(path),
      onChangeType: (nextType) => tab.changeFieldType(path, nextType),
      onRename: () => { tab.renamingPath = path; tab.notifyTree(); },
      onCut: () => tab.cutPath(path),
      onCopy: () => { tab.copyPath(path); },
      onPaste: () => { void tab.pasteInto(path); },
      onDuplicate: () => tab.duplicatePath(path),
      onDelete: () => { tab.deletePath(path); },
    }));
  }, [field, path, tab, type, showContextMenu]);

  const commitRename = (value: string) => {
    const next = clampGffLabel(value);
    if (!next || next === field.getLabel()) {
      tab.renamingPath = null;
      tab.notifyTree();
      return;
    }
    tab.renameField(path, next);
  };

  if (!tab.isSearchVisible(path)) {
    return <></>;
  }

  const childStructs = field.getChildStructs();
  const childNodes = expanded ? (
    <>
      {childStructs.map((struct: KotOR.GFFStruct, index: number) => (
        <GFFStructElement
          key={`${gffChildStructPath(path, index)}.${struct.uuid}.${props.generation}`}
          struct={struct}
          path={gffChildStructPath(path, index)}
          tab={tab}
          depth={depth + 1}
          generation={props.generation}
        />
      ))}
      {type === KotOR.GFFDataType.LIST && !tab.isSearchFiltering() ? (
        <li className="gff-struct add" onClick={() => tab.addListStruct(path)}>
          <span className="struct-icon"><i className="fa-solid fa-plus"></i></span>
          <span className="struct-label"><a>[Add Struct]</a></span>
        </li>
      ) : null}
    </>
  ) : null;

  return (
    <>
      <ListItemNode
        id={path}
        name={`${field.getLabel()}${gffSettings.showType ? ` [${typeName}]` : ""}${previewText ? ` ${previewText}` : ""}`}
        className={`gff-field-node ${matched ? "gff-match" : ""}`}
        hasChildren={hasChildren}
        isExpanded={expanded}
        isSelected={selected}
        depth={depth}
        icon={isList ? "fa-list" : "fa-file"}
        iconType={isList ? "folder" : "file"}
        hasContextMenu={true}
        onToggle={handleToggle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        dataAttributes={{
          "data-field-type": type,
          "data-field-label": field.getLabel(),
          "data-uuid": field.uuid,
          "data-gff-path": path,
        }}
        labelContent={
          renaming ? (
            <input
              className="gff-inline-rename"
              autoFocus
              defaultValue={field.getLabel()}
              maxLength={16}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  commitRename((e.target as HTMLInputElement).value);
                } else if (e.key === "Escape") {
                  tab.renamingPath = null;
                  tab.notifyTree();
                }
              }}
            />
          ) : (
            <span className="gff-node-label">
              <span className="gff-node-label__name">{field.getLabel()}</span>
              {gffSettings.showType ? (
                <span className={`gff-node-label__type field-type ${typeName}`}>{typeName}</span>
              ) : null}
              {previewText ? <span className="gff-node-label__value">{previewText}</span> : null}
            </span>
          )
        }
      >
        {childNodes}
      </ListItemNode>
      {ContextMenuComponent}
    </>
  );
};
