import React, { useState, useEffect } from "react";
import { TabVISEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabVISEditor.scss";

interface BaseTabProps {
  tab: TabVISEditorState;
}

export const TabVISEditor = function(props: BaseTabProps){
  const tab = props.tab as TabVISEditorState;
  const [vis, setVis] = useState(tab.vis);
  const [selectedRoom, setSelectedRoom] = useState(tab.selectedRoomName);

  useEffect(() => {
    const loadHandler = () => setVis(tab.vis);
    const selectHandler = () => setSelectedRoom(tab.selectedRoomName);
    
    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onRoomSelected', selectHandler);
    
    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onRoomSelected', selectHandler);
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

  if(!vis){
    return (
      <div className="forge-vis-editor">
        <MenuBar items={menuItems} />
        <div className="forge-vis-editor__loading">Loading visibility data...</div>
      </div>
    );
  }

  const rooms = Array.from(vis.rooms.values());
  const selectedRoomData = selectedRoom ? vis.getRoom(selectedRoom) : null;

  return (
    <div className="forge-vis-editor">
      <MenuBar items={menuItems} />
      <div className="forge-vis-editor__content">
        <div className="vis-info">
          <h3>Visibility Editor</h3>
          <p>
            VIS files define which rooms are visible from each room.
            This optimization data tells the engine which rooms to render when the player is in a specific room.
          </p>
          <div className="vis-stats">
            <span>Total Rooms: {rooms.length}</span>
          </div>
        </div>

        <div className="vis-container">
          <div className="vis-sidebar">
            <h4>Rooms</h4>
            <div className="room-list">
              {rooms.map((room, index) => (
                <div 
                  key={index}
                  className={`room-item ${selectedRoom === room.name ? 'selected' : ''}`}
                  onClick={() => tab.selectRoom(room.name)}
                >
                  <span className="room-name">{room.name}</span>
                  <span className="room-count">({room.rooms.length} visible)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vis-main">
            {selectedRoomData ? (
              <div className="room-details">
                <h4>Room: {selectedRoomData.name}</h4>
                <p>Visible Rooms ({selectedRoomData.rooms.length}):</p>
                {selectedRoomData.rooms.length === 0 ? (
                  <p className="no-data">No visible rooms defined (room is isolated).</p>
                ) : (
                  <div className="visible-rooms-list">
                    {selectedRoomData.rooms.map((visibleRoom, idx) => (
                      <div key={idx} className="visible-room-item">
                        <span className="visible-room-name">{visibleRoom}</span>
                        <button 
                          className="goto-button"
                          onClick={() => tab.selectRoom(visibleRoom)}
                          title="Go to this room"
                        >
                          →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-selection">
                <p>Select a room from the list to view which rooms are visible from it.</p>
                <div className="vis-explanation">
                  <h5>How VIS Files Work</h5>
                  <p>
                    When the player enters a room, the engine checks the VIS file to determine which
                    other rooms should be rendered. Rooms not listed will not be drawn, improving performance.
                  </p>
                  <p>
                    This is critical for large, complex areas with many rooms and models.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="vis-notice">
          <strong>Note:</strong> Direct editing of visibility relationships is not yet fully implemented. 
          The VIS file can be viewed and saved in its current state.
        </div>
      </div>
    </div>
  );
};
