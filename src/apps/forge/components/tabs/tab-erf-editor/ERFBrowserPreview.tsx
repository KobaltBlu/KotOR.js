/**
 * Selected entry / folder preview pane.
 *
 * @file ERFBrowserPreview.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import * as KotOR from "@/apps/forge/KotOR";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import {
  formatERFOffset,
  getERFFileIconClass,
  isERFFolderNode,
} from "@/apps/forge/components/tabs/tab-erf-editor/ERFBrowserTypes";

export interface ERFBrowserPreviewProps {
  node: FileBrowserNode | undefined;
  /** Shown when nothing is selected — current folder summary. */
  folderFallback?: {
    name: string;
    nodes?: FileBrowserNode[];
    archive?: KotOR.ERFObject;
  };
}

function FolderPreviewFields(props: {
  entryCount: number;
  header?: {
    fileType?: string;
    fileVersion?: string;
    buildYear?: number;
    buildDay?: number;
  };
}) {
  const { entryCount, header } = props;
  return (
    <>
      <div>
        <dt>Entries</dt>
        <dd>{entryCount}</dd>
      </div>
      {header && (
        <>
          <div>
            <dt>Format</dt>
            <dd>
              {(header.fileType || "").trim()} {(header.fileVersion || "").trim()}
            </dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>
              Year {header.buildYear ?? "—"}, Day {header.buildDay ?? "—"}
            </dd>
          </div>
        </>
      )}
    </>
  );
}

export function ERFBrowserPreview(props: ERFBrowserPreviewProps) {
  const { node, folderFallback } = props;

  if (!node) {
    if (!folderFallback) {
      return (
        <div className="erf-preview erf-preview--empty">
          <span className="erf-preview__hint">Select an entry to view details</span>
        </div>
      );
    }
    return (
      <div className="erf-preview">
        <i className="fas fa-folder-open erf-preview__icon" aria-hidden="true" />
        <div className="erf-preview__name">{folderFallback.name}</div>
        <dl className="erf-preview__fields">
          <div>
            <dt>Type</dt>
            <dd>folder</dd>
          </div>
          <FolderPreviewFields
            entryCount={folderFallback.nodes?.length || 0}
            header={folderFallback.archive?.header}
          />
        </dl>
        <span className="erf-preview__hint">Select an entry for file details</span>
      </div>
    );
  }

  const icon = getERFFileIconClass(node);
  const isFolder = isERFFolderNode(node);
  const typeLabel = node.data?.typeLabel || "";
  const size = node.data?.size ?? 0;
  const offset = node.data?.offset ?? 0;
  const resId = node.data?.resId;
  const nested = node.data?.nestedArchive as KotOR.ERFObject | undefined;
  const folderArchive = (nested || node.data?.archive) as KotOR.ERFObject | undefined;

  return (
    <div className="erf-preview">
      <i className={`fas ${isFolder ? "fa-folder-open" : icon} erf-preview__icon`} aria-hidden="true" />
      <div className="erf-preview__name">{node.name}</div>
      <dl className="erf-preview__fields">
        <div>
          <dt>Type</dt>
          <dd>{typeLabel || (isFolder ? "folder" : "—")}</dd>
        </div>
        {isFolder ? (
          <FolderPreviewFields
            entryCount={node.nodes?.length || 0}
            header={folderArchive?.header}
          />
        ) : (
          <>
            <div>
              <dt>Size</dt>
              <dd>{KotOR.Utility.bytesToSize(size)}</dd>
            </div>
            <div>
              <dt>Offset</dt>
              <dd>{formatERFOffset(offset)}</dd>
            </div>
            <div>
              <dt>ResID</dt>
              <dd>{typeof resId === "number" && resId >= 0 ? resId : "—"}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
