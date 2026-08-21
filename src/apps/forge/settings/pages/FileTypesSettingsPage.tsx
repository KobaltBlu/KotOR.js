/**
 * Default editor per file type.
 *
 * @file FileTypesSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useMemo, useState } from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { FILE_TYPE_EDITOR_GROUPS } from "@/apps/forge/settings/fileTypeEditorCatalog";
import {
  DEFAULT_EDITOR_LABELS,
  DefaultEditorKind,
  getDefaultEditor,
  setDefaultEditor,
} from "@/apps/forge/settings/forgeSettings";
import { registerSettingsPage, settingMatchesQuery, useSettingsSearch } from "@/apps/forge/settings/settingsRegistry";

export function FileTypesSettingsPage() {
  const query = useSettingsSearch();
  const [revision, setRevision] = useState(0);

  const groups = useMemo(() => {
    return FILE_TYPE_EDITOR_GROUPS.map((group) => {
      const entries = group.entries.filter((entry) => {
        return settingMatchesQuery(
          query,
          group.label,
          entry.label,
          entry.ext,
          ...entry.editors.map((kind) => DEFAULT_EDITOR_LABELS[kind]),
        );
      });
      return { ...group, entries };
    }).filter((group) => group.entries.length > 0);
  }, [query]);

  const onChange = (ext: string, kind: DefaultEditorKind) => {
    setDefaultEditor(ext, kind);
    setRevision((value) => value + 1);
  };

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">File Types</h3>
      <p className="forge-settings-page__lead">
        Choose which editor opens when you double-click a resource. Context-menu
        Open with GFF / Hex still overrides for a single open.
      </p>
      {groups.map((group) => (
        <div key={group.id} className="forge-settings-filetype-group">
          <h4 className="forge-settings-filetype-group__title">{group.label}</h4>
          <table className="forge-settings-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Extension</th>
                <th>Default editor</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((entry) => (
                <tr key={entry.ext}>
                  <td>{entry.label}</td>
                  <td className="forge-settings-table__ext">.{entry.ext}</td>
                  <td>
                    <ForgeSelect
                      value={getDefaultEditor(entry.ext)}
                      onChange={(e) => onChange(entry.ext, e.target.value as DefaultEditorKind)}
                      aria-label={`Default editor for ${entry.label}`}
                    >
                      {entry.editors.map((kind) => (
                        <option key={kind} value={kind}>
                          {DEFAULT_EDITOR_LABELS[kind]}
                        </option>
                      ))}
                    </ForgeSelect>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {groups.length === 0 ? (
        <p className="forge-settings-page__empty">No file types match this search.</p>
      ) : null}
    </div>
  );
}

registerSettingsPage({
  id: "file-types",
  label: "File Types",
  group: "application",
  icon: "fa-solid fa-file",
  keywords: ["editor", "utp", "gff", "hex", "default", "open", "extension"],
  render: () => React.createElement(FileTypesSettingsPage),
  matchesQuery: (query) => {
    for (let i = 0; i < FILE_TYPE_EDITOR_GROUPS.length; i++) {
      const group = FILE_TYPE_EDITOR_GROUPS[i];
      for (let j = 0; j < group.entries.length; j++) {
        const entry = group.entries[j];
        if (settingMatchesQuery(
          query,
          group.label,
          entry.label,
          entry.ext,
          ...entry.editors.map((kind) => DEFAULT_EDITOR_LABELS[kind]),
        )) {
          return true;
        }
      }
    }
    return false;
  },
});
