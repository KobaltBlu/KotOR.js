import React, { useEffect, useState } from "react";
import { TabBinaryViewerState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import './TabBinaryViewer.scss';

interface BaseTabProps {
  tab: TabBinaryViewerState;
}

export const TabBinaryViewer = function(props: BaseTabProps){
  const tab = props.tab as TabBinaryViewerState;
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const onEditorFileLoad = () => {
      forceUpdate({});
    };
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    };
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'View',
      children: [
        {
          label: '8 Bytes / Row',
          onClick: () => tab.setBytesPerRow(8),
          checked: tab.bytesPerRow === 8,
        },
        {
          label: '16 Bytes / Row',
          onClick: () => tab.setBytesPerRow(16),
          checked: tab.bytesPerRow === 16,
        },
        {
          label: '32 Bytes / Row',
          onClick: () => tab.setBytesPerRow(32),
          checked: tab.bytesPerRow === 32,
        }
      ]
    }
  ];

  return (
    <div className="forge-binary-viewer">
      <MenuBar items={menuItems} />
      <div className="forge-binary-viewer__header">
        <div>
          <span className="label">File:</span> {tab.file?.getFilename?.() || 'Untitled'}
        </div>
        <div>
          <span className="label">Size:</span> {tab.dataLength.toLocaleString()} bytes
        </div>
      </div>
      <div className="forge-binary-viewer__table">
        <div className="forge-binary-viewer__row forge-binary-viewer__row--header">
          <div className="cell offset">Offset</div>
          <div className="cell hex">Hex</div>
          <div className="cell ascii">ASCII</div>
        </div>
        {tab.rows.map((row) => (
          <div key={row.offset} className="forge-binary-viewer__row">
            <div className="cell offset">{row.offset}</div>
            <div className="cell hex">{row.hex}</div>
            <div className="cell ascii">{row.ascii}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
