import React, { useState, useEffect } from "react";
import { TabSSFEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabSSFEditor.scss";

interface BaseTabProps {
  tab: TabSSFEditorState;
}

export const TabSSFEditor = function(props: BaseTabProps){
  const tab = props.tab as TabSSFEditorState;
  const [ssf, setSsf] = useState(tab.ssf);

  useEffect(() => {
    const loadHandler = () => setSsf(tab.ssf);

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

  if(!ssf){
    return (
      <div className="forge-ssf-editor">
        <MenuBar items={menuItems} />
        <div className="forge-ssf-editor__loading">Loading sound set...</div>
      </div>
    );
  }

  const soundSlots = [
    { id: 0, name: 'Battle Cry 1' },
    { id: 1, name: 'Battle Cry 2' },
    { id: 2, name: 'Battle Cry 3' },
    { id: 3, name: 'Battle Cry 4' },
    { id: 4, name: 'Battle Cry 5' },
    { id: 5, name: 'Battle Cry 6' },
    { id: 6, name: 'Select 1' },
    { id: 7, name: 'Select 2' },
    { id: 8, name: 'Select 3' },
    { id: 9, name: 'Attack Grunt 1' },
    { id: 10, name: 'Attack Grunt 2' },
    { id: 11, name: 'Attack Grunt 3' },
    { id: 12, name: 'Pain Grunt 1' },
    { id: 13, name: 'Pain Grunt 2' },
    { id: 14, name: 'Low Health' },
    { id: 15, name: 'Dead' },
    { id: 16, name: 'Critical Hit' },
    { id: 17, name: 'Target Immune' },
    { id: 18, name: 'Lay Mine' },
    { id: 19, name: 'Disarm Mine' },
    { id: 20, name: 'Begin Stealth' },
    { id: 21, name: 'Begin Search' },
    { id: 22, name: 'Begin Unlock' },
    { id: 23, name: 'Unlock Failed' },
    { id: 24, name: 'Unlock Success' },
    { id: 25, name: 'Separated from Party' },
    { id: 26, name: 'Rejoined Party' },
    { id: 27, name: 'Poisoned' },
  ];

  const updateSoundRef = (index: number, value: number) => {
    if(ssf && ssf.sound_refs[index] !== undefined){
      ssf.sound_refs[index] = value;
      tab.file.unsaved_changes = true;
      // Force re-render with a new reference, but preserving the SSFObject prototype and methods
      setSsf(Object.assign(Object.create(Object.getPrototypeOf(ssf)), ssf));
    }
  };

  return (
    <div className="forge-ssf-editor">
      <MenuBar items={menuItems} />
      <div className="forge-ssf-editor__content">
        <div className="ssf-info">
          <h3>Sound Set Editor</h3>
          <p>
            SSF files map sound slots to dialog.tlk string references.
            Each slot corresponds to a specific character action or event.
          </p>
          <div className="ssf-details">
            <div className="detail-item">
              <label>File Type:</label>
              <span>{ssf.FileType}</span>
            </div>
            <div className="detail-item">
              <label>Version:</label>
              <span>{ssf.FileVersion}</span>
            </div>
            <div className="detail-item">
              <label>Sound Slots:</label>
              <span>{ssf.sound_refs.length}</span>
            </div>
          </div>
        </div>

        <div className="sound-slots">
          <h4>Sound Slot Mappings</h4>
          <div className="slots-grid">
            {soundSlots.map((slot) => {
              const strRef = ssf.sound_refs[slot.id] || 0;
              const soundResRef = ssf.GetSoundResRef(slot.id) || '(none)';

              return (
                <div key={slot.id} className="sound-slot">
                  <div className="slot-header">
                    <span className="slot-id">[{slot.id}]</span>
                    <span className="slot-name">{slot.name}</span>
                  </div>
                  <div className="slot-content">
                    <label>StrRef:</label>
                    <input
                      title="StrRef"
                      placeholder="Sound string reference here..."
                      type="number"
                      value={strRef}
                      onChange={(e) => updateSoundRef(slot.id, parseInt(e.target.value) || 0)}
                      min="0"
                    />
                    <span className="sound-resref">{soundResRef}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
