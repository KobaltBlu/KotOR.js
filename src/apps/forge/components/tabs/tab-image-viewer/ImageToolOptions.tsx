/**
 * Active-tool option strip for the image editor.
 *
 * @file ImageToolOptions.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import type { ImageRgba } from "@/apps/forge/image";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

function toHex(color: ImageRgba): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(color.r)}${h(color.g)}${h(color.b)}`;
}

function fromHex(hex: string, alpha: number): ImageRgba {
  const v = hex.replace("#", "");
  return {
    r: Number.parseInt(v.slice(0, 2), 16) || 0,
    g: Number.parseInt(v.slice(2, 4), 16) || 0,
    b: Number.parseInt(v.slice(4, 6), 16) || 0,
    a: alpha,
  };
}

export function ImageToolOptions(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  const fg = tab.document.foreground;
  const bg = tab.document.background;
  const needsBrush = tab.tool === "brush" || tab.tool === "eraser";
  return (
    <div className="image-tool-options">
      <span className="image-tool-options__label">{tab.tool}</span>
      <label className="image-tool-options__field">
        FG
        <input
          type="color"
          value={toHex(fg)}
          onChange={(e) => {
            tab.document.foreground = fromHex(e.target.value, fg.a);
            tab.notifyUi();
          }}
        />
      </label>
      <label className="image-tool-options__field">
        BG
        <input
          type="color"
          value={toHex(bg)}
          onChange={(e) => {
            tab.document.background = fromHex(e.target.value, bg.a);
            tab.notifyUi();
          }}
        />
      </label>
      {needsBrush ? (
        <>
          <label className="image-tool-options__field">
            Size
            <input
              type="range"
              min={1}
              max={128}
              value={tab.brushSize}
              onChange={(e) => { tab.brushSize = Number(e.target.value); tab.notifyUi(); }}
            />
            {tab.brushSize}
          </label>
          <label className="image-tool-options__field">
            Hard
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tab.brushHardness * 100)}
              onChange={(e) => { tab.brushHardness = Number(e.target.value) / 100; tab.notifyUi(); }}
            />
          </label>
          <label className="image-tool-options__field">
            Opacity
            <input
              type="range"
              min={1}
              max={100}
              value={Math.round(tab.brushOpacity * 100)}
              onChange={(e) => { tab.brushOpacity = Number(e.target.value) / 100; tab.notifyUi(); }}
            />
          </label>
        </>
      ) : null}
      {tab.tool === "fill" ? (
        <label className="image-tool-options__field">
          Tolerance
          <input
            type="number"
            min={0}
            max={255}
            value={tab.fillTolerance}
            onChange={(e) => { tab.fillTolerance = Number(e.target.value) || 0; tab.notifyUi(); }}
          />
        </label>
      ) : null}
    </div>
  );
}
