import React, { useState, useEffect } from "react";

import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import * as KotOR from "@/apps/forge/KotOR";
import { TabSAVEditorState } from "@/apps/forge/states/tabs";
import "@/apps/forge/components/tabs/tab-sav-editor/TabSAVEditor.scss";

interface BaseTabProps {
  tab: TabSAVEditorState;
}

export const TabSAVEditor = function(props: BaseTabProps){
  const tab = props.tab as TabSAVEditorState;
  const [erf, setErf] = useState(tab.erf);
  const [saveMeta, setSaveMeta] = useState(tab.saveMeta);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const loadHandler = () => {
      setErf(tab.erf);
      setSaveMeta(tab.saveMeta);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
    };
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    }
  ];

  if(!erf){
    return (
      <div className="forge-sav-editor">
        <MenuBar items={menuItems} />
        <div className="forge-sav-editor__loading">Loading save game...</div>
      </div>
    );
  }

  const resources = erf.keyList ?? [];
  const resourceTypeCounts = saveMeta?.typeCounts || {};
  const resourceTypeOptions = Object.keys(resourceTypeCounts).sort();
  const globalVariableCandidates = saveMeta?.globalVariableCandidates || [];

  const filteredResources = resources.filter((resKey: { resRef: string; resType: number }) => {
    const ext = KotOR.ResourceTypes.getKeyByValue(resKey.resType) || 'unknown';
    if (typeFilter !== 'all' && ext !== typeFilter) {
      return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return resKey.resRef.toLowerCase().includes(q) || ext.toLowerCase().includes(q);
  });

  const openResource = (resKey: { resRef: string; resType: number }) => {
    const resRef = resKey.resRef;
    const resType = resKey.resType;

    erf.getResourceBufferByResRef(resRef, resType).then((buffer: Uint8Array) => {
      const file = new EditorFile({
        path: `erf://${tab.file.path}?resref=${resRef}&restype=${KotOR.ResourceTypes.getKeyByValue(resType)}`,
        buffer: buffer,
        resref: resRef,
        reskey: resType,
        archive_path: tab.file.path
      });

      FileTypeManager.onOpenResource(file);
    });
  };

  const quickOpenByType = (ext: string) => {
    const found = resources.find((resKey: { resRef: string; resType: number }) => {
      return KotOR.ResourceTypes.getKeyByValue(resKey.resType) === ext;
    });
    if (found) {
      openResource(found);
    }
  };

  const openByRefAndExt = (resRef: string, ext: string) => {
    const found = resources.find((resKey: { resRef: string; resType: number }) => {
      const keyExt = KotOR.ResourceTypes.getKeyByValue(resKey.resType) || '';
      return resKey.resRef === resRef && keyExt === ext;
    });
    if (found) {
      openResource(found);
    }
  };

  return (
    <div className="forge-sav-editor">
      <MenuBar items={menuItems} />
      <div className="forge-sav-editor__content">
        <div className="sav-info">
          <h3>Save Game Archive</h3>
          <p>
            SAV files are ERF archives containing player progress, area states, and game variables.
          </p>
          <div className="sav-stats">
            <div className="stat-item">
              <label>Resources:</label>
              <span>{saveMeta?.resourceCount || 0}</span>
            </div>
            <div className="stat-item">
              <label>Area:</label>
              <span>{saveMeta?.areaName || 'Unknown'}</span>
            </div>
            <div className="stat-item">
              <label>Module:</label>
              <span>{saveMeta?.lastModule || 'Unknown'}</span>
            </div>
            <div className="stat-item">
              <label>Game Time:</label>
              <span>{saveMeta?.gameTime || 0}</span>
            </div>
          </div>
          <div className="sav-quick-actions">
            <button onClick={() => quickOpenByType('ifo')}>Open Module Info (IFO)</button>
            <button onClick={() => quickOpenByType('are')}>Open Area (ARE)</button>
            <button onClick={() => quickOpenByType('utc')}>Open Player Creature (UTC)</button>
            <button onClick={() => quickOpenByType('git')}>Open Instance State (GIT)</button>
          </div>
          {globalVariableCandidates.length > 0 && (
            <div className="sav-global-vars">
              <h4>Global Variable Candidates</h4>
              <table>
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Type</th>
                    <th>Booleans</th>
                    <th>Numbers</th>
                    <th>Strings</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {globalVariableCandidates.map((candidate) => (
                    <tr key={`${candidate.resRef}.${candidate.ext}`}>
                      <td>{candidate.resRef}</td>
                      <td>{candidate.ext}</td>
                      <td>{candidate.boolCount}</td>
                      <td>{candidate.numberCount}</td>
                      <td>{candidate.stringCount}</td>
                      <td>
                        <button onClick={() => openByRefAndExt(candidate.resRef, candidate.ext)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="resource-list">
          <h4>Save Game Resources ({filteredResources.length}/{resources.length})</h4>
          <div className="resource-list__filters">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resref/type..."
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {resourceTypeOptions.map((ext) => (
                <option key={ext} value={ext}>
                  {ext} ({resourceTypeCounts[ext]})
                </option>
              ))}
            </select>
          </div>
          <div className="resource-table">
            <table>
              <thead>
                <tr>
                  <th>ResRef</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resKey: { resRef: string; resType: number }, index: number) => {
                  const ext = KotOR.ResourceTypes.getKeyByValue(resKey.resType);
                  return (
                    <tr
                      key={index}
                      onClick={() => openResource(resKey)}
                      className="resource-row"
                    >
                      <td className="resref-cell">{resKey.resRef}</td>
                      <td className="type-cell">{ext}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
