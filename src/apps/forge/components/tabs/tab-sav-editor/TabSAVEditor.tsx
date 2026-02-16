import React, { useState, useEffect } from "react";
import { TabSAVEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import { FileTypeManager } from "../../../FileTypeManager";
import { ForgeState } from "../../../states/ForgeState";
import { EditorFile } from "../../../EditorFile";
import "./TabSAVEditor.scss";

interface BaseTabProps {
  tab: TabSAVEditorState;
}

export const TabSAVEditor = function(props: BaseTabProps){
  const tab = props.tab as TabSAVEditorState;
  const [erf, setErf] = useState(tab.erf);
  const [saveMeta, setSaveMeta] = useState(tab.saveMeta);

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
          </div>
        </div>

        <div className="resource-list">
          <h4>Save Game Resources ({resources.length})</h4>
          <div className="resource-table">
            <table>
              <thead>
                <tr>
                  <th>ResRef</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resKey: { resRef: string; resType: number }, index: number) => {
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
