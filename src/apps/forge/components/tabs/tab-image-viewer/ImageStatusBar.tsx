/**
 * Status bar: coordinates, size, zoom, sampled color.
 *
 * @file ImageStatusBar.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

export function ImageStatusBar(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  const color = tab.getHoverColor();
  return (
    <div className="image-status">
      <span>
        {tab.hoverX >= 0 ? `${tab.hoverX}, ${tab.hoverY}` : "—"}
        {color ? (
          <>
            {"  "}
            <span
              className="image-status__swatch"
              style={{ background: `rgba(${color.r},${color.g},${color.b},${color.a / 255})` }}
            />
            {`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`}
          </>
        ) : null}
      </span>
      <span>{tab.document.width}×{tab.document.height} · {Math.round(tab.canvasScale * 100)}%</span>
    </div>
  );
}
