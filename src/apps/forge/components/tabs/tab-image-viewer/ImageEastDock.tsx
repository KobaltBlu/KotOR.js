/**
 * East dock: layers, TPC encode, TXI.
 *
 * @file ImageEastDock.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { IMAGE_TPC_FORMATS, type ImageEastPane, type ImageTpcFormat } from "@/apps/forge/image";
import { ImageLayerPanel } from "@/apps/forge/components/tabs/tab-image-viewer/ImageLayerPanel";
import { validateTxi } from "@/apps/forge/txi/txiSchema";
import {
  addForgeThemeChangeListener,
  getMonacoThemeForLanguage,
  removeForgeThemeChangeListener,
} from "@/apps/forge/settings/forgeTheme";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";

const PANES: { id: ImageEastPane; label: string }[] = [
  { id: "layers", label: "Layers" },
  { id: "encode", label: "Encode" },
  { id: "txi", label: "TXI" },
];

export function ImageEastDock(props: { tab: TabImageViewerState }) {
  const tab = props.tab;
  return (
    <div className="image-east">
      <div className="image-east__tabs">
        {PANES.map((pane) => (
          <button
            key={pane.id}
            type="button"
            className={`image-east__tab${tab.eastPane === pane.id ? " is-active" : ""}`}
            onClick={() => tab.setEastPane(pane.id)}
          >
            {pane.label}
          </button>
        ))}
      </div>
      <div className="image-east__body">
        {tab.eastPane === "layers" ? <ImageLayerPanel tab={tab} /> : null}
        {tab.eastPane === "encode" ? <ImageEncodePanel tab={tab} /> : null}
        {tab.eastPane === "txi" ? <ImageTxiPanel tab={tab} /> : null}
      </div>
    </div>
  );
}

function ImageEncodePanel(props: { tab: TabImageViewerState }) {
  const encode = props.tab.document.encode;
  return (
    <div className="image-encode">
      <label>
        Format
        <select
          value={encode.format}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.format = e.target.value as ImageTpcFormat;
            });
          }}
        >
          {IMAGE_TPC_FORMATS.map((format) => (
            <option key={format.id} value={format.id}>{format.label}</option>
          ))}
        </select>
      </label>
      <label>
        Mip maps
        <select
          value={encode.mipPolicy}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.mipPolicy = e.target.value as typeof encode.mipPolicy;
            });
          }}
        >
          <option value="full-chain">Full chain</option>
          <option value="single-level">Level 0 only</option>
        </select>
      </label>
      <label>
        Alpha
        <select
          value={encode.alphaPolicy}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.alphaPolicy = e.target.value as typeof encode.alphaPolicy;
            });
          }}
        >
          <option value="opaque-threshold">Opaque threshold</option>
          <option value="strict-alpha">Any alpha &lt; 255</option>
        </select>
      </label>
      {encode.alphaPolicy === "opaque-threshold" && encode.format === "auto" ? (
        <label>
          Opaque threshold
          <input
            type="number"
            min={0}
            max={255}
            value={encode.opaqueAlphaThreshold}
            onChange={(e) => {
              props.tab.mutate((doc) => {
                doc.encode.opaqueAlphaThreshold = Number(e.target.value) || 0;
              }, { history: false });
            }}
          />
        </label>
      ) : null}
      <label>
        Alpha test
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={encode.alphaTest}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              const next = Number(e.target.value);
              doc.encode.alphaTest = Number.isFinite(next) ? next : 1;
            }, { history: false });
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={encode.isCubemap}
          onChange={(e) => {
            props.tab.mutate((doc) => {
              doc.encode.isCubemap = e.target.checked;
            });
          }}
        />
        Cubemap (6 stacked faces)
      </label>
      <p style={{ fontSize: 11, opacity: 0.75 }}>
        {encode.format === "auto"
          ? "Auto TPC save uses DXT1 when the composite is opaque, DXT5 when alpha is meaningful."
          : "TPC save writes the selected Odyssey encoding, including uncompressed gray / RGB / RGBA / BGRA."}
      </p>
    </div>
  );
}

function ImageTxiPanel(props: { tab: TabImageViewerState }) {
  const [theme, setTheme] = useState(() => getMonacoThemeForLanguage("txi"));
  useEffect(() => {
    const onTheme = () => setTheme(getMonacoThemeForLanguage("txi"));
    addForgeThemeChangeListener(onTheme);
    return () => removeForgeThemeChangeListener(onTheme);
  }, []);
  const issues = validateTxi(props.tab.document.txiText).map((issue) => `Line ${issue.line}: ${issue.message}`);
  const options: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "off",
    lineNumbers: "on",
    fontSize: 12,
  };
  return (
    <div className="txi-pane">
      <div className="txi-pane__editor">
        <MonacoEditor
          width="100%"
          height="100%"
          language="txi"
          theme={theme}
          value={props.tab.document.txiText}
          options={options}
          onChange={(value) => props.tab.setTXIText(value || "", { history: false })}
        />
      </div>
      <div className="txi-pane__issues">
        {issues.slice(0, 8).map((issue, index) => (
          <div key={`txi-issue-${index}`} className="txi-pane__issue">{issue}</div>
        ))}
        {issues.length > 8 ? <div className="txi-pane__issue">...and {issues.length - 8} more</div> : null}
      </div>
    </div>
  );
}
