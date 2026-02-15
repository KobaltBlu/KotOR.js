/**
 * DLGNodePropertiesPanel component.
 *
 * Comprehensive property editor for DLG nodes.
 * Based on PyKotor's node property panel implementation.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGNodePropertiesPanel.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState, useEffect } from 'react';

import * as KotOR from '@/apps/forge/KotOR';
import { DLGUndoManager, DLGUndoActions } from '@/apps/forge/utils/DLGUndoManager';
import "@/apps/forge/components/tabs/tab-dlg-editor/DLGNodePropertiesPanel.scss";

interface DLGNodePropertiesPanelProps {
  node: KotOR.DLGNode | null;
  nodeType: 'starting' | 'entry' | 'reply' | null;
  undoManager?: DLGUndoManager;
  onUpdate: () => void;
}

export const DLGNodePropertiesPanel: React.FC<DLGNodePropertiesPanelProps> = ({
  node,
  nodeType,
  undoManager,
  onUpdate
}) => {
  const [_localNode, setLocalNode] = useState(node);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'text', 'audio'])
  );

  useEffect(() => {
    setLocalNode(node);
  }, [node]);

  if (!node) {
    return (
      <div className="dlg-node-properties-panel">
        <div className="empty-state">
          <p>No node selected</p>
          <p className="hint">Select a node from the tree to view its properties</p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleTextChange = (newText: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeText(node, node.text, newText));
    } else {
      node.text = newText;
    }
    onUpdate();
  };

  const handleCommentChange = (newComment: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeComment(node, node.comment, newComment));
    } else {
      node.comment = newComment;
    }
    onUpdate();
  };

  const handleSpeakerChange = (newSpeaker: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeSpeaker(node, node.speakerTag, newSpeaker));
    } else {
      node.speakerTag = newSpeaker;
    }
    onUpdate();
  };

  const handleListenerChange = (newListener: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeListener(node, node.listenerTag, newListener));
    } else {
      node.listenerTag = newListener;
    }
    onUpdate();
  };

  const handleVOChange = (newVO: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeVO(node, node.vo_resref, newVO));
    } else {
      node.vo_resref = newVO;
    }
    onUpdate();
  };

  const handleSoundChange = (newSound: string) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeSound(node, node.sound, newSound));
    } else {
      node.sound = newSound;
    }
    onUpdate();
  };

  const handleDelayChange = (newDelay: number) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeDelay(node, node.delay, newDelay));
    } else {
      node.delay = newDelay;
    }
    onUpdate();
  };

  const handleCameraAngleChange = (newAngle: number) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeCameraAngle(node, node.cameraAngle, newAngle));
    } else {
      node.cameraAngle = newAngle;
    }
    onUpdate();
  };

  const handleCameraIDChange = (newID: number) => {
    if (undoManager) {
      undoManager.execute(DLGUndoActions.editNodeCameraID(node, node.cameraID, newID));
    } else {
      node.cameraID = newID;
    }
    onUpdate();
  };

  const renderSection = (
    id: string,
    title: string,
    content: React.ReactNode,
    icon?: string
  ) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="property-section">
        <div className="property-section-header" onClick={() => toggleSection(id)}>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          {icon && <span className="section-icon">{icon}</span>}
          <h4>{title}</h4>
        </div>
        {isExpanded && (
          <div className="property-section-content">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dlg-node-properties-panel">
      <div className="panel-header">
        <h3>Node Properties</h3>
        <span className="node-type-badge" data-type={nodeType}>
          {nodeType?.toUpperCase()}
        </span>
        <span className="node-index">
          [{node.index}]
        </span>
      </div>

      <div className="panel-content">
        {renderSection(
          'basic',
          'Basic Information',
          <>
            <div className="property-group">
              <label>Index</label>
              <input
                type="number"
                value={node.index}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Node Type</label>
              <input
                type="text"
                value={nodeType || 'Unknown'}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Comment</label>
              <input
                type="text"
                value={node.comment || ''}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Developer comment..."
              />
            </div>
          </>,
          '📋'
        )}

        {renderSection(
          'text',
          'Dialog Text',
          <>
            <div className="property-group">
              <label>Text</label>
              <textarea
                value={node.text || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={6}
                placeholder="Dialog text..."
              />
            </div>
          </>,
          '💬'
        )}

        {renderSection(
          'participants',
          'Participants',
          <>
            <div className="property-group">
              <label>Speaker Tag</label>
              <input
                type="text"
                value={node.speakerTag || ''}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                placeholder="Speaker tag..."
              />
            </div>

            <div className="property-group">
              <label>Listener Tag</label>
              <input
                type="text"
                value={node.listenerTag || ''}
                onChange={(e) => handleListenerChange(e.target.value)}
                placeholder="Listener tag..."
              />
            </div>
          </>,
          '👥'
        )}

        {renderSection(
          'audio',
          'Audio',
          <>
            <div className="property-group">
              <label>Voice-Over ResRef</label>
              <input
                type="text"
                value={node.vo_resref || ''}
                onChange={(e) => handleVOChange(e.target.value)}
                placeholder="Voice-over file..."
              />
            </div>

            <div className="property-group">
              <label>Sound ResRef</label>
              <input
                type="text"
                value={node.sound || ''}
                onChange={(e) => handleSoundChange(e.target.value)}
                placeholder="Sound file..."
              />
            </div>

            <div className="property-group">
              <label>Sound Exists</label>
              <input
                type="number"
                value={node.soundExists}
                disabled
                className="input-disabled"
              />
            </div>
          </>,
          '🔊'
        )}

        {renderSection(
          'camera',
          'Camera Settings',
          <>
            <div className="property-group">
              <label>Camera Angle</label>
              <select
                value={node.cameraAngle}
                onChange={(e) => handleCameraAngleChange(parseInt(e.target.value, 10))}
              >
                <option value="0">Random</option>
                <option value="1">Speaker</option>
                <option value="2">Speaker Behind Player</option>
                <option value="3">Speaker and Player Side</option>
                <option value="4">Animated Camera</option>
                <option value="5">Focus Player</option>
                <option value="6">Placeable Camera</option>
              </select>
            </div>

            <div className="property-group">
              <label>Camera ID</label>
              <input
                type="number"
                value={node.cameraID}
                onChange={(e) => handleCameraIDChange(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="property-group">
              <label>Camera Animation</label>
              <input
                type="number"
                value={node.cameraAnimation}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Camera FOV</label>
              <input
                type="number"
                value={node.camFieldOfView}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Camera Video Effect</label>
              <input
                type="number"
                value={node.camVidEffect}
                disabled
                className="input-disabled"
              />
            </div>
          </>,
          '📹'
        )}

        {renderSection(
          'timing',
          'Timing & Effects',
          <>
            <div className="property-group">
              <label>Delay</label>
              <input
                type="number"
                value={node.delay}
                onChange={(e) => handleDelayChange(parseFloat(e.target.value))}
                step="0.1"
                min="0"
              />
            </div>

            <div className="property-group">
              <label>Wait Flags</label>
              <input
                type="number"
                value={node.waitFlags}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Fade Type</label>
              <input
                type="number"
                value={node.fadeType}
                disabled
                className="input-disabled"
              />
            </div>
          </>,
          '⏱️'
        )}

        {renderSection(
          'scripts',
          'Scripts',
          <>
            <div className="property-group">
              <label>Active Script 1</label>
              <input
                type="text"
                value={node.isActive?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {node.isActive && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>

            <div className="property-group">
              <label>Active Script 2</label>
              <input
                type="text"
                value={node.isActive2?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {node.isActive2 && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>

            <div className="property-group">
              <label>Action Script 1</label>
              <input
                type="text"
                value={node.script?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {node.script && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>

            <div className="property-group">
              <label>Action Script 2</label>
              <input
                type="text"
                value={node.script2?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {node.script2 && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>

            <div className="property-group">
              <label>Logic</label>
              <input
                type="checkbox"
                checked={node.Logic}
                disabled
              />
              <span className="checkbox-label">AND/OR Logic</span>
            </div>
          </>,
          '📜'
        )}

        {renderSection(
          'quest',
          'Quest & Journal',
          <>
            <div className="property-group">
              <label>Quest</label>
              <input
                type="text"
                value={node.quest || ''}
                disabled
                className="input-disabled"
                placeholder="No quest"
              />
            </div>

            <div className="property-group">
              <label>Quest Entry</label>
              <input
                type="number"
                value={node.questEntry}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Plot Index</label>
              <input
                type="number"
                value={node.plotIndex}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Plot XP Percentage</label>
              <input
                type="number"
                value={node.plotXPPercentage}
                disabled
                className="input-disabled"
                step="0.1"
              />
            </div>
          </>,
          '📖'
        )}

        {renderSection(
          'advanced',
          'Advanced',
          <>
            <div className="property-group">
              <label>Alien Race Node</label>
              <input
                type="number"
                value={node.alienRaceNode}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Emotion</label>
              <input
                type="number"
                value={node.emotion}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Facial Animation</label>
              <input
                type="number"
                value={node.facialAnimation}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Post Process Node</label>
              <input
                type="number"
                value={node.postProcessNode}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Record VO</label>
              <input
                type="number"
                value={node.recordVO}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Record No VO Override</label>
              <input
                type="number"
                value={node.recordNoVOOverride}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>VO Text Changed</label>
              <input
                type="checkbox"
                checked={node.voTextChanged}
                disabled
              />
            </div>
          </>,
          '⚙️'
        )}

        {renderSection(
          'links',
          'Links',
          <>
            <div className="property-group">
              <label>Replies ({node.replies.length})</label>
              <ul className="link-list">
                {node.replies.length === 0 ? (
                  <li className="empty">No replies</li>
                ) : (
                  node.replies.map((reply, index) => (
                    <li key={index}>
                      [Reply {reply.index}] {reply.text || '(No text)'}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="property-group">
              <label>Entries ({node.entries.length})</label>
              <ul className="link-list">
                {node.entries.length === 0 ? (
                  <li className="empty">No entries</li>
                ) : (
                  node.entries.map((entry, index) => (
                    <li key={index}>
                      [Entry {entry.index}] {entry.text || '(No text)'}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>,
          '🔗'
        )}
      </div>
    </div>
  );
};
