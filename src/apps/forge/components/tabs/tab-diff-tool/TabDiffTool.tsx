import React, { useState, useEffect } from "react";
import { TabDiffToolState } from "../../../states/tabs/TabDiffToolState";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import { ForgeFileSystem } from "../../../ForgeFileSystem";
import { ForgeState } from "../../../states/ForgeState";
import { ModalResourceComparisonState } from "../../../states/modal/ModalResourceComparisonState";
import * as KotOR from "../../../KotOR";
import "./TabDiffTool.scss";

interface BaseTabProps {
  tab: TabDiffToolState;
}

export const TabDiffTool = function(props: BaseTabProps){
  const tab = props.tab as TabDiffToolState;
  const [leftPath, setLeftPath] = useState(tab.leftPath);
  const [rightPath, setRightPath] = useState(tab.rightPath);

  useEffect(() => {
    const leftHandler = () => setLeftPath(tab.leftPath);
    const rightHandler = () => setRightPath(tab.rightPath);

    tab.addEventListener('onLeftResourceChange', leftHandler);
    tab.addEventListener('onRightResourceChange', rightHandler);

    return () => {
      tab.removeEventListener('onLeftResourceChange', leftHandler);
      tab.removeEventListener('onRightResourceChange', rightHandler);
    };
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Close', onClick: () => tab.remove() }
      ]
    }
  ];

  const selectLeftFile = async () => {
    try {
      const result = await ForgeFileSystem.OpenFile();
      if (!result) return;
      const buffer = await ForgeFileSystem.ReadFileBufferFromResponse(result);
      if (buffer.length === 0) return;
      const pathStr = result.paths?.[0] ?? '';
      const name = pathStr ? pathStr.replace(/^.*[\\/]/, '') : '';
      const ext = pathStr && pathStr.includes('.') ? pathStr.slice(pathStr.lastIndexOf('.')) : '';
      tab.setLeftResource(pathStr || name, buffer, name, ext);
    } catch(e) {
      console.error('Failed to open left file:', e);
    }
  };

  const selectRightFile = async () => {
    try {
      const result = await ForgeFileSystem.OpenFile();
      if (!result) return;
      const buffer = await ForgeFileSystem.ReadFileBufferFromResponse(result);
      if (buffer.length === 0) return;
      const pathStr = result.paths?.[0] ?? '';
      const name = pathStr ? pathStr.replace(/^.*[\\/]/, '') : '';
      const ext = pathStr && pathStr.includes('.') ? pathStr.slice(pathStr.lastIndexOf('.')) : '';
      tab.setRightResource(pathStr || name, buffer, name, ext);
    } catch(e) {
      console.error('Failed to open right file:', e);
    }
  };

  const runComparison = () => {
    if(!tab.leftBuffer || !tab.rightBuffer){
      alert('Please select both files to compare');
      return;
    }

    const compareModal = new ModalResourceComparisonState({
      resource1: {
        resref: tab.leftResRef,
        ext: tab.leftExt,
        data: tab.leftBuffer,
        filepath: tab.leftPath
      },
      resource2: {
        resref: tab.rightResRef,
        ext: tab.rightExt,
        data: tab.rightBuffer,
        filepath: tab.rightPath
      },
      title: 'File Comparison'
    });

    ForgeState.modalManager.addModal(compareModal);
    compareModal.open();
  };

  return (
    <div className="forge-diff-tool">
      <MenuBar items={menuItems} />
      <div className="diff-tool-content">
        <div className="diff-tool-header">
          <h3>Resource Diff Tool</h3>
          <p>
            Compare two resources side-by-side. Select files from your system or game installation.
          </p>
        </div>

        <div className="diff-tool-panels">
          <div className="diff-panel">
            <h4>Left File</h4>
            <div className="file-selector">
              {leftPath ? (
                <div className="selected-file">
                  <span className="file-name">{tab.leftResRef}.{tab.leftExt}</span>
                  <span className="file-path">{leftPath}</span>
                  <button onClick={() => tab.clearLeft()} className="btn-clear">
                    Clear
                  </button>
                </div>
              ) : (
                <div className="no-file">
                  <p>No file selected</p>
                  <button onClick={selectLeftFile} className="btn-select">
                    Select File
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="diff-separator">
            <div className="separator-line"></div>
            <span className="separator-text">vs</span>
            <div className="separator-line"></div>
          </div>

          <div className="diff-panel">
            <h4>Right File</h4>
            <div className="file-selector">
              {rightPath ? (
                <div className="selected-file">
                  <span className="file-name">{tab.rightResRef}.{tab.rightExt}</span>
                  <span className="file-path">{rightPath}</span>
                  <button onClick={() => tab.clearRight()} className="btn-clear">
                    Clear
                  </button>
                </div>
              ) : (
                <div className="no-file">
                  <p>No file selected</p>
                  <button onClick={selectRightFile} className="btn-select">
                    Select File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="diff-tool-actions">
          <button
            onClick={runComparison}
            disabled={!tab.leftBuffer || !tab.rightBuffer}
            className="btn-compare"
          >
            Compare Files
          </button>
        </div>
      </div>
    </div>
  );
};
