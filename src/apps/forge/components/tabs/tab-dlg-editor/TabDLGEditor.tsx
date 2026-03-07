import React, { useState, useEffect } from "react";
import { TabDLGEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabDLGEditor.scss";

interface BaseTabProps {
  tab: TabDLGEditorState;
}

export const TabDLGEditor = function(props: BaseTabProps){
  const tab = props.tab as TabDLGEditorState;
  const [dlg, setDlg] = useState(tab.dlg);
  const [selectedNode, setSelectedNode] = useState<KotOR.DLGNode | undefined>(tab.selectedNode);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(tab.selectedNodeIndex);
  const [selectedNodeType, setSelectedNodeType] = useState<'starting' | 'entry' | 'reply' | null>(tab.selectedNodeType);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  useEffect(() => {
    const loadHandler = () => {
      setDlg(tab.dlg);
    };
    const selectHandler = () => {
      setSelectedNode(tab.selectedNode);
      setSelectedNodeIndex(tab.selectedNodeIndex);
      setSelectedNodeType(tab.selectedNodeType);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onNodeSelected', selectHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onNodeSelected', selectHandler);
    };
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    },
    {
      label: 'View',
      children: [
        { label: 'List Mode', onClick: () => setViewMode('list') },
        { label: 'Tree Mode (Coming Soon)', onClick: () => {} }
      ]
    }
  ];

  const selectNodeHandler = (node: KotOR.DLGNode | undefined, index: number, type: 'starting' | 'entry' | 'reply' | null) => {
    tab.selectNode(node, index, type);
  };

  if(!dlg){
    return (
      <div className="forge-dlg-editor">
        <MenuBar items={menuItems} />
        <div className="forge-dlg-editor__loading">Loading dialog...</div>
      </div>
    );
  }

  return (
    <div className="forge-dlg-editor">
      <MenuBar items={menuItems} />
      <div className="forge-dlg-editor__container">
        <div className="forge-dlg-editor__sidebar">
          <div className="forge-dlg-editor__node-lists">
            <NodeListSection
              title="Starting Nodes"
              nodes={dlg.startingList}
              selectedIndex={selectedNodeType === 'starting' ? selectedNodeIndex : -1}
              onSelect={(node, index) => selectNodeHandler(node, index, 'starting')}
              nodeType="starting"
            />
            <NodeListSection
              title="Entries (NPC)"
              nodes={dlg.entryList}
              selectedIndex={selectedNodeType === 'entry' ? selectedNodeIndex : -1}
              onSelect={(node, index) => selectNodeHandler(node, index, 'entry')}
              nodeType="entry"
            />
            <NodeListSection
              title="Replies (PC)"
              nodes={dlg.replyList}
              selectedIndex={selectedNodeType === 'reply' ? selectedNodeIndex : -1}
              onSelect={(node, index) => selectNodeHandler(node, index, 'reply')}
              nodeType="reply"
            />
          </div>
        </div>
        <div className="forge-dlg-editor__main">
          {selectedNode ? (
            <NodePropertiesPanel
              node={selectedNode}
              nodeType={selectedNodeType}
              onUpdate={() => {
                tab.file.unsaved_changes = true;
              }}
            />
          ) : (
            <div className="forge-dlg-editor__no-selection">
              <p>Select a node from the lists to view and edit its properties.</p>
              <div className="forge-dlg-editor__stats">
                <h4>Dialog Statistics</h4>
                <p>Starting Nodes: {dlg.startingList.length}</p>
                <p>Entries (NPC): {dlg.entryList.length}</p>
                <p>Replies (PC): {dlg.replyList.length}</p>
                {dlg.vo_id && <p>VO ID: {dlg.vo_id}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NodeListSectionProps {
  title: string;
  nodes: KotOR.DLGNode[];
  selectedIndex: number;
  onSelect: (node: KotOR.DLGNode, index: number) => void;
  nodeType: 'starting' | 'entry' | 'reply';
}

const NodeListSection = (props: NodeListSectionProps) => {
  return (
    <div className="forge-dlg-node-list">
      <h4>{props.title}</h4>
      <div className="forge-dlg-node-list__items">
        {props.nodes.map((node, index) => (
          <div
            key={index}
            className={`forge-dlg-node-item ${index === props.selectedIndex ? 'selected' : ''}`}
            onClick={() => props.onSelect(node, index)}
          >
            <span className="node-index">[{index}]</span>
            <span className="node-text">{node.text || '(empty)'}</span>
            {node.isActive && <span className="node-conditional">🔒</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

interface NodePropertiesPanelProps {
  node: KotOR.DLGNode;
  nodeType: 'starting' | 'entry' | 'reply' | null;
  onUpdate: () => void;
}

const NodePropertiesPanel = (props: NodePropertiesPanelProps) => {
  const { node, nodeType, onUpdate } = props;
  const [text, setText] = useState(node.text || '');
  const [comment, setComment] = useState(node.comment || '');

  useEffect(() => {
    setText(node.text || '');
    setComment(node.comment || '');
  }, [node]);

  const updateText = (newText: string) => {
    setText(newText);
    node.text = newText;
    onUpdate();
  };

  const updateComment = (newComment: string) => {
    setComment(newComment);
    node.comment = newComment;
    onUpdate();
  };

  return (
    <div className="forge-dlg-properties">
      <h3>Node Properties {nodeType ? `(${nodeType})` : ''}</h3>

      <div className="property-group">
        <label>Text (LocString)</label>
        <textarea
          value={text}
          onChange={(e) => updateText(e.target.value)}
          rows={6}
          placeholder="Dialog text..."
        />
      </div>

      <div className="property-group">
        <label>Comment</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => updateComment(e.target.value)}
          placeholder="Developer comment..."
        />
      </div>

      <div className="property-group">
        <label>Speaker Tag</label>
        <input
          type="text"
          value={node.speakerTag || ''}
          onChange={(e) => {
            node.speakerTag = e.target.value;
            onUpdate();
          }}
          placeholder="Speaker tag..."
        />
      </div>

      <div className="property-group">
        <label>Listener Tag</label>
        <input
          type="text"
          value={node.listenerTag || ''}
          onChange={(e) => {
            node.listenerTag = e.target.value;
            onUpdate();
          }}
          placeholder="Listener tag..."
        />
      </div>

      <div className="property-group">
        <label>VO ResRef</label>
        <input
          type="text"
          value={node.vo_resref || ''}
          onChange={(e) => {
            node.vo_resref = e.target.value;
            onUpdate();
          }}
          placeholder="Voice-over file..."
        />
      </div>

      <div className="property-group">
        <label>Sound</label>
        <input
          type="text"
          value={node.sound || ''}
          onChange={(e) => {
            node.sound = e.target.value;
            onUpdate();
          }}
          placeholder="Sound file..."
        />
      </div>

      <div className="property-row">
        <div className="property-group">
          <label>Camera Angle</label>
          <input
            title="Camera Angle"
            placeholder="Camera Angle"
            type="number"
            value={node.cameraAngle || 0}
            onChange={(e) => {
              node.cameraAngle = parseInt(e.target.value) || 0;
              onUpdate();
            }}
          />
        </div>
        <div className="property-group">
          <label>Delay</label>
          <input
            title="Delay"
            placeholder="Delay"
            type="number"
            value={node.delay || 0}
            onChange={(e) => {
              node.delay = parseFloat(e.target.value) || 0;
              onUpdate();
            }}
            step="0.1"
          />
        </div>
      </div>

      <div className="property-group">
        <h4>Scripts</h4>
        <label>Script 1</label>
        <input
          title="Script 1"
          type="text"
          value={node.script?.name || ''}
          onChange={(e) => {
            // Script editing would require loading NWScript
            onUpdate();
          }}
          placeholder="Script name..."
          disabled
        />
        <label>Active Check</label>
        <input
          type="text"
          value={node.isActive?.name || ''}
          placeholder="Conditional script..."
          disabled
        />
      </div>

      <div className="property-group">
        <h4>Links</h4>
        {nodeType === 'entry' && (
          <>
            <p>Replies ({node.replies?.length || 0})</p>
            <ul className="link-list">
              {node.replies?.map((reply, idx) => (
                <li key={idx}>→ Reply [{reply.index}]: {reply.text?.substring(0, 50) || '(empty)'}</li>
              ))}
            </ul>
          </>
        )}
        {nodeType === 'reply' && (
          <>
            <p>Entries ({node.entries?.length || 0})</p>
            <ul className="link-list">
              {node.entries?.map((entry, idx) => (
                <li key={idx}>→ Entry [{entry.index}]: {entry.text?.substring(0, 50) || '(empty)'}</li>
              ))}
            </ul>
          </>
        )}
        {nodeType === 'starting' && (
          <>
            <p>Entries ({node.entries?.length || 0})</p>
            <ul className="link-list">
              {node.entries?.map((entry, idx) => (
                <li key={idx}>→ Entry [{entry.index}]: {entry.text?.substring(0, 50) || '(empty)'}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
