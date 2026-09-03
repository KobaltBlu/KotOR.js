import React, { useCallback, useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabERFEditorState } from "@/apps/forge/states/tabs";
import * as KotOR from "@/apps/forge/KotOR";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { useContextMenu } from "@/apps/forge/components/common/ContextMenu";
import { createERFContextMenuItems } from "@/apps/forge/components/tabs/tab-erf-editor/ERFContextMenu";
import { ERFBrowserToolbar } from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserToolbar";
import { ERFBrowserBreadcrumbs } from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserBreadcrumbs";
import { ERFBrowserListing } from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserListing";
import { ERFBrowserPreview } from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserPreview";
import { isERFFolderNode } from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserTypes";
import "@/apps/forge/components/tabs/tab-erf-editor/tab-erf-editor.scss";

export const TabERFEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabERFEditorState;
  const [generation, setGeneration] = useState(tab.browserGeneration);
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const refresh = useCallback(() => {
    setGeneration(tab.browserGeneration);
  }, [tab]);

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", refresh);
    tab.addEventListener("onBrowserChanged", refresh);
    return () => {
      tab.removeEventListener("onEditorFileLoad", refresh);
      tab.removeEventListener("onBrowserChanged", refresh);
    };
  });

  useEffect(() => {
    setGeneration(tab.browserGeneration);
  }, [tab, tab.browserGeneration]);

  const onContextMenu = useCallback(
    (event: React.MouseEvent, node: FileBrowserNode) => {
      event.preventDefault();
      event.stopPropagation();
      if (!node.data?.resource) {
        return;
      }
      tab.selectNode(node);
      const contextMenuItems = createERFContextMenuItems({
        archive: node.data.archive,
        resource: node.data.resource,
      });
      showContextMenu(event.clientX, event.clientY, contextMenuItems);
    },
    [tab, showContextMenu],
  );

  const openERFResource = useCallback(async (archive: KotOR.ERFObject, key: KotOR.IERFKeyEntry) => {
    let buffer: Uint8Array;
    let buffer2: Uint8Array;
    if (key.resType == KotOR.ResourceTypes["mdl"] || key.resType == KotOR.ResourceTypes["mdx"]) {
      buffer = await archive.getResourceBufferByResRef(key.resRef, KotOR.ResourceTypes["mdl"]);
      buffer2 = await archive.getResourceBufferByResRef(key.resRef, KotOR.ResourceTypes["mdx"]);
      FileTypeManager.onOpenResource(
        new EditorFile({
          resref: key.resRef,
          reskey: KotOR.ResourceTypes["mdl"],
          buffer: buffer,
          buffer2: buffer2,
        }),
      );
    } else {
      buffer = await archive.getResourceBufferByResRef(key.resRef, key.resType);
      FileTypeManager.onOpenResource(
        new EditorFile({ resref: key.resRef, reskey: key.resType, buffer: buffer }),
      );
    }
  }, []);

  void generation;

  const visibleNodes = tab.getVisibleNodes();
  const cwdChildren = tab.getCwdChildren();
  const archive = tab.getCurrentArchive();
  const header = archive?.header;
  const selected = tab.selectedNode;

  return (
    <>
      <div className="tab-erf-editor">
        <ERFBrowserToolbar tab={tab} />
        <ERFBrowserBreadcrumbs tab={tab} />
        <div className="erf-body">
          <div className="erf-listing-pane">
            <ERFBrowserListing
              tab={tab}
              nodes={visibleNodes}
              onContextMenu={onContextMenu}
              onOpenResource={openERFResource}
            />
          </div>
          <div className="erf-preview-pane">
            <ERFBrowserPreview
              node={selected}
              folderFallback={{
                name: tab.getCwd()?.name || tab.tabName,
                nodes: cwdChildren,
                archive,
              }}
            />
          </div>
        </div>
        <div className="erf-statusbar">
          <span>
            {tab.filterQuery.trim()
              ? `${visibleNodes.length} of ${cwdChildren.length} items`
              : `${cwdChildren.length} items`}
          </span>
          <span>
            {(header?.fileType || "ERF ").trim()} {(header?.fileVersion || "").trim()}
          </span>
          {selected && (
            <span>
              {isERFFolderNode(selected) ? "Folder" : "File"}: {selected.name}
            </span>
          )}
        </div>
      </div>
      {ContextMenuComponent}
    </>
  );
};
