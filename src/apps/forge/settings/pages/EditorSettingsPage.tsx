/**
 * Text / NSS editor settings.
 *
 * @file EditorSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  FORGE_EDITOR_FONT_SIZE_MAX,
  FORGE_EDITOR_FONT_SIZE_MIN,
  FORGE_EDITOR_TAB_SIZES,
  ForgeEditorLineNumbers,
  ForgeEditorRenderWhitespace,
  ForgeEditorTabSize,
  ForgeEditorWordWrap,
  addForgeEditorSettingsListener,
  getEditorSettings,
  removeForgeEditorSettingsListener,
  setEditorSettings,
} from "@/apps/forge/settings/forgeEditorSettings";

export function EditorSettingsPage() {
  const [, setRevision] = useState(0);
  const bump = () => setRevision((value) => value + 1);
  const settings = getEditorSettings();

  useEffectOnce(() => {
    addForgeEditorSettingsListener(bump);
    return () => removeForgeEditorSettingsListener(bump);
  });

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Editor</h3>
      <p className="forge-settings-page__lead">
        Font, indent, and display options for the text and NWScript editors.
        Changes apply immediately to open editors.
      </p>

      <h4 className="forge-settings-page__section">Font</h4>
      <SettingRow
        label="Font family"
        description="CSS font stack used by Monaco. Leave blank to restore the default."
        keywords={["font", "family", "typeface", "monospace", "cascadia", "consolas"]}
      >
        <ForgeInput
          value={settings.fontFamily}
          onChange={(e) => {
            setEditorSettings({ fontFamily: e.target.value });
          }}
          aria-label="Font family"
        />
      </SettingRow>
      <SettingRow
        label="Font size"
        description={`Editor font size in pixels (${FORGE_EDITOR_FONT_SIZE_MIN}–${FORGE_EDITOR_FONT_SIZE_MAX}).`}
        keywords={["font", "size", "zoom", "scale"]}
      >
        <ForgeInput
          type="number"
          min={FORGE_EDITOR_FONT_SIZE_MIN}
          max={FORGE_EDITOR_FONT_SIZE_MAX}
          value={settings.fontSize}
          onChange={(e) => {
            setEditorSettings({ fontSize: Number(e.target.value) });
          }}
          aria-label="Font size"
        />
      </SettingRow>
      <SettingRow
        label="Font ligatures"
        description="Enable ligatures when the current font supports them."
        keywords={["font", "ligatures", "fira", "cascadia"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.fontLigatures}
          onChange={(value) => {
            setEditorSettings({ fontLigatures: value });
          }}
        />
      </SettingRow>

      <h4 className="forge-settings-page__section">Indent</h4>
      <SettingRow
        label="Tab size"
        description="Number of spaces a tab equals. Also available from View → Tab Size."
        keywords={["tab", "indent", "spaces", "indentation"]}
      >
        <ForgeSelect
          value={String(settings.tabSize)}
          onChange={(e) => {
            setEditorSettings({ tabSize: Number(e.target.value) as ForgeEditorTabSize });
          }}
          aria-label="Tab size"
        >
          {FORGE_EDITOR_TAB_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} spaces
            </option>
          ))}
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Insert spaces"
        description="Insert spaces when pressing Tab instead of a tab character."
        keywords={["tab", "spaces", "insert", "indent"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.insertSpaces}
          onChange={(value) => {
            setEditorSettings({ insertSpaces: value });
          }}
        />
      </SettingRow>

      <h4 className="forge-settings-page__section">Display</h4>
      <SettingRow
        label="Word wrap"
        description="Wrap long lines instead of scrolling horizontally."
        keywords={["wrap", "word wrap", "line wrap"]}
      >
        <ForgeSelect
          value={settings.wordWrap}
          onChange={(e) => {
            setEditorSettings({ wordWrap: e.target.value as ForgeEditorWordWrap });
          }}
          aria-label="Word wrap"
        >
          <option value="off">Off</option>
          <option value="on">On</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Minimap"
        description="Show a code overview of the current file."
        keywords={["minimap", "overview", "scrollbar"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.minimap}
          onChange={(value) => {
            setEditorSettings({ minimap: value });
          }}
        />
      </SettingRow>
      <SettingRow
        label="Line numbers"
        description="How line numbers are shown in the gutter."
        keywords={["line numbers", "gutter", "relative"]}
      >
        <ForgeSelect
          value={settings.lineNumbers}
          onChange={(e) => {
            setEditorSettings({ lineNumbers: e.target.value as ForgeEditorLineNumbers });
          }}
          aria-label="Line numbers"
        >
          <option value="on">On</option>
          <option value="off">Off</option>
          <option value="relative">Relative</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Render whitespace"
        description="When to draw spaces and tabs in the editor."
        keywords={["whitespace", "spaces", "tabs", "visible"]}
      >
        <ForgeSelect
          value={settings.renderWhitespace}
          onChange={(e) => {
            setEditorSettings({ renderWhitespace: e.target.value as ForgeEditorRenderWhitespace });
          }}
          aria-label="Render whitespace"
        >
          <option value="none">None</option>
          <option value="selection">Selection</option>
          <option value="all">All</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Scroll beyond last line"
        description="Allow scrolling the last line to the top of the editor."
        keywords={["scroll", "beyond", "last line"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.scrollBeyondLastLine}
          onChange={(value) => {
            setEditorSettings({ scrollBeyondLastLine: value });
          }}
        />
      </SettingRow>
      <SettingRow
        label="Mouse wheel zoom"
        description="Hold Ctrl and scroll to change the editor font size."
        keywords={["zoom", "mouse", "wheel", "ctrl"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.mouseWheelZoom}
          onChange={(value) => {
            setEditorSettings({ mouseWheelZoom: value });
          }}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "editor",
  label: "Editor",
  icon: "fa-solid fa-code",
  keywords: [
    "editor",
    "monaco",
    "text",
    "nss",
    "nwscript",
    "font",
    "tab",
    "wrap",
    "minimap",
    "whitespace",
  ],
  render: () => React.createElement(EditorSettingsPage),
});
