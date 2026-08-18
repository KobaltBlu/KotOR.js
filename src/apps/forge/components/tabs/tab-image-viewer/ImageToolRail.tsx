/**
 * West tool rail for the image editor.
 *
 * @file ImageToolRail.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { IMAGE_TOOLS } from "@/apps/forge/image";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

export function ImageToolRail(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  return (
    <div className="image-tool-rail">
      {IMAGE_TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          title={`${tool.label} (${tool.shortcut})`}
          aria-label={`${tool.label} (${tool.shortcut})`}
          aria-pressed={tab.tool === tool.id}
          className={`image-tool-rail__btn${tab.tool === tool.id ? " is-active" : ""}`}
          onClick={() => tab.setTool(tool.id)}
        >
          <i className={`fa-solid ${tool.icon}`} aria-hidden />
        </button>
      ))}
    </div>
  );
}
