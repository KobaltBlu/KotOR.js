/**
 * Image editor layer stack, naming, and blend controls.
 *
 * @file ImageLayerPanel.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useRef, useState } from "react";
import {
  IMAGE_BLEND_MODES,
  canDeleteLayer,
  canMoveLayer,
  getActiveLayer,
  isLayerEditable,
  isRasterLayer,
  renameLayer,
  type ImageBlendMode,
  type ImageLayer,
} from "@/apps/forge/image";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

const THUMB_W = 36;
const THUMB_H = 28;

export function ImageLayerPanel(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  const layers = tab.document.layers.slice().reverse();
  const active = getActiveLayer(tab.document);
  const canDelete = canDeleteLayer(tab.document);
  const canMoveUp = canMoveLayer(tab.document, 1);
  const canMoveDown = canMoveLayer(tab.document, -1);
  const rasterActive = isLayerEditable(active);

  return (
    <div className="image-layers">
      <div className="image-layers__list">
        {layers.map((layer) => (
          <ImageLayerRow key={layer.id} tab={tab} layer={layer} />
        ))}
      </div>
      <div className="image-layers__footer">
        {active ? (
          <div className="image-layers__props">
            <label className="image-layers__prop">
              <span>Blend</span>
              <select
                value={active.blend}
                aria-label="Layer blend mode"
                disabled={!rasterActive}
                onChange={(e) => {
                  const blend = e.target.value as ImageBlendMode;
                  const id = active.id;
                  tab.mutate((doc) => {
                    const found = doc.layers.find((item) => item.id === id);
                    if (found) {
                      found.blend = blend;
                      found.foreignBlend = undefined;
                    }
                  });
                }}
              >
                {IMAGE_BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label className="image-layers__prop image-layers__prop--opacity">
              <span>Opacity {Math.round(active.opacity * 100)}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(active.opacity * 100)}
                aria-label="Layer opacity"
                onChange={(e) => {
                  const opacity = Number(e.target.value) / 100;
                  const id = active.id;
                  tab.mutate((doc) => {
                    const found = doc.layers.find((item) => item.id === id);
                    if (found) found.opacity = opacity;
                  }, { history: false });
                }}
              />
            </label>
          </div>
        ) : null}
        <div className="image-layers__toolbar">
          <LayerToolButton title="New Layer" icon="fa-plus" onClick={() => tab.newLayer()} />
          <LayerToolButton title="Duplicate Layer" icon="fa-clone" disabled={!active || !isRasterLayer(active)} onClick={() => tab.duplicateActiveLayer()} />
          <LayerToolButton title="Delete Layer" icon="fa-trash-can" disabled={!canDelete} onClick={() => tab.deleteActiveLayer()} />
          <LayerToolButton title="Move Layer Up" icon="fa-arrow-up" disabled={!canMoveUp} onClick={() => tab.moveActiveLayer(1)} />
          <LayerToolButton title="Move Layer Down" icon="fa-arrow-down" disabled={!canMoveDown} onClick={() => tab.moveActiveLayer(-1)} />
        </div>
      </div>
    </div>
  );
}

function LayerToolButton(props: {
  title: string;
  icon: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="image-btn image-btn--icon image-btn--secondary"
      title={props.title}
      aria-label={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <i className={`fa-solid ${props.icon}`} aria-hidden />
    </button>
  );
}

function ImageLayerRow(props: { tab: TabImageViewerState; layer: ImageLayer }) {
  const { tab, layer } = props;
  const active = layer.id === tab.document.activeLayerId;
  const kind = layer.kind || "raster";
  const raster = isRasterLayer(layer);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraft(layer.name);
    }
  }, [layer.name, editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  }, [editing]);

  const selectLayer = () => {
    if (tab.document.activeLayerId === layer.id) {
      return;
    }
    tab.document.activeLayerId = layer.id;
    tab.notifyUi();
  };

  const finishEditing = (commit: boolean) => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    skipCommitRef.current = true;
    setEditing(false);
    if (!commit) {
      setDraft(layer.name);
      return;
    }
    const next = draft.replace(/\s+/g, " ").trim();
    if (!next || next === layer.name) {
      setDraft(layer.name);
      return;
    }
    tab.mutate((doc) => {
      renameLayer(doc, layer.id, next);
    });
  };

  return (
    <div
      className={`image-layer${active ? " is-active" : ""}${layer.visible ? "" : " is-hidden"}${raster ? "" : " is-locked"}`}
      style={{ paddingLeft: 6 + (layer.groupDepth || 0) * 12 }}
      onClick={selectLayer}
    >
      <button
        type="button"
        className="image-layer__icon-btn"
        title={layer.visible ? "Hide layer" : "Show layer"}
        aria-label={layer.visible ? "Hide layer" : "Show layer"}
        aria-pressed={layer.visible}
        onClick={(e) => {
          e.stopPropagation();
          const id = layer.id;
          const visible = !layer.visible;
          tab.mutate((doc) => {
            const found = doc.layers.find((item) => item.id === id);
            if (found) found.visible = visible;
          });
        }}
      >
        <i className={`fa-solid ${layer.visible ? "fa-eye" : "fa-eye-slash"}`} aria-hidden />
      </button>
      {kind === "group" ? (
        <div className="image-layer__kind-icon" aria-hidden title="Group">
          <i className="fa-solid fa-folder" />
        </div>
      ) : kind === "passthrough" ? (
        <div className="image-layer__kind-icon" aria-hidden title="Locked Photoshop layer">
          <i className="fa-solid fa-layer-group" />
        </div>
      ) : (
        <ImageLayerThumb layer={layer} width={tab.document.width} height={tab.document.height} />
      )}
      {editing ? (
        <input
          ref={inputRef}
          className="image-layer__name image-layer__name--edit"
          value={draft}
          aria-label="Layer name"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => finishEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              finishEditing(true);
            } else if (e.key === "Escape") {
              e.preventDefault();
              finishEditing(false);
            }
          }}
        />
      ) : (
        <span
          className="image-layer__name"
          title="Double-click to rename"
          onDoubleClick={(e) => {
            e.stopPropagation();
            skipCommitRef.current = false;
            selectLayer();
            setDraft(layer.name);
            setEditing(true);
          }}
        >
          {layer.name}
        </span>
      )}
      {kind === "passthrough" ? (
        <span className="image-layer__icon-btn is-on" title="Layer is not editable" aria-label="Layer is not editable">
          <i className="fa-solid fa-lock" aria-hidden />
        </span>
      ) : raster ? (
        <button
          type="button"
          className={`image-layer__icon-btn${layer.lockTransparent ? " is-on" : ""}`}
          title={layer.lockTransparent ? "Unlock transparent pixels" : "Lock transparent pixels"}
          aria-label={layer.lockTransparent ? "Unlock transparent pixels" : "Lock transparent pixels"}
          aria-pressed={layer.lockTransparent}
          onClick={(e) => {
            e.stopPropagation();
            const id = layer.id;
            const lockTransparent = !layer.lockTransparent;
            tab.mutate((doc) => {
              const found = doc.layers.find((item) => item.id === id);
              if (found) found.lockTransparent = lockTransparent;
            });
          }}
        >
          <i className={`fa-solid ${layer.lockTransparent ? "fa-lock" : "fa-lock-open"}`} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function ImageLayerThumb(props: { layer: ImageLayer; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    if (props.width <= 0 || props.height <= 0) {
      return;
    }
    const source = document.createElement("canvas");
    source.width = props.width;
    source.height = props.height;
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) {
      return;
    }
    const image = sourceCtx.createImageData(props.width, props.height);
    if (props.layer.pixels.length < image.data.length) {
      return;
    }
    image.data.set(props.layer.pixels);
    sourceCtx.putImageData(image, 0, 0);
    const scale = Math.min(THUMB_W / props.width, THUMB_H / props.height);
    const dw = Math.max(1, Math.round(props.width * scale));
    const dh = Math.max(1, Math.round(props.height * scale));
    ctx.globalAlpha = props.layer.opacity;
    ctx.drawImage(source, Math.floor((THUMB_W - dw) / 2), Math.floor((THUMB_H - dh) / 2), dw, dh);
    ctx.globalAlpha = 1;
  }, [props.layer.pixels, props.layer.opacity, props.width, props.height]);

  return (
    <div className="image-layer__thumb checkerboard" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}
