/**
 * DLGDialogPropertiesPanel component.
 *
 * Panel for editing dialog-level properties (conversation type, scripts, etc.).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGDialogPropertiesPanel.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState, useEffect } from 'react';

import * as KotOR from '@/apps/forge/KotOR';
import "@/apps/forge/components/tabs/tab-dlg-editor/DLGDialogPropertiesPanel.scss";

interface DLGDialogPropertiesPanelProps {
  dlg: KotOR.DLGObject | null;
  onUpdate: () => void;
}

interface StuntActor {
  participant: string;
  resref: string;
}

export const DLGDialogPropertiesPanel: React.FC<DLGDialogPropertiesPanelProps> = ({
  dlg,
  onUpdate
}) => {
  const [_localDlg, setLocalDlg] = useState(dlg);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'scripts'])
  );

  useEffect(() => {
    setLocalDlg(dlg);
  }, [dlg]);

  if (!dlg) {
    return (
      <div className="dlg-dialog-properties-panel">
        <div className="empty-state">
          <p>No dialog loaded</p>
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

  const handleConversationTypeChange = (type: number) => {
    dlg.conversationType = type;
    onUpdate();
  };

  const handleAmbientTrackChange = (track: string) => {
    dlg.ambientTrack = track;
    onUpdate();
  };

  const handleUnequipHeadChange = (unequip: boolean) => {
    dlg.unequipHeadItem = unequip;
    onUpdate();
  };

  const handleUnequipItemsChange = (unequip: boolean) => {
    dlg.unequipItems = unequip;
    onUpdate();
  };

  const handleAnimatedCutChange = (isAnimated: boolean) => {
    dlg.isAnimatedCutscene = isAnimated;
    onUpdate();
  };

  const handleCameraModelChange = (model: string) => {
    dlg.animatedCameraResRef = model;
    onUpdate();
  };

  const handleRecordNoVOChange = (recordNoVO: boolean) => {
    dlg.recordNoVO = recordNoVO;
    onUpdate();
  };

  const handleOldHitCheckChange = (oldHitCheck: boolean) => {
    dlg.oldHitCheck = oldHitCheck;
    onUpdate();
  };

  const getStuntActors = (): StuntActor[] => {
    const actors: StuntActor[] = [];
    dlg.stuntActors.forEach((actor, _key) => {
      actors.push({
        participant: actor.participant,
        resref: actor.resref
      });
    });
    return actors;
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
    <div className="dlg-dialog-properties-panel">
      <div className="panel-header">
        <h3>Dialog Properties</h3>
        <span className="dialog-resref">{dlg.resref}</span>
      </div>

      <div className="panel-content">
        {renderSection(
          'general',
          'General Settings',
          <>
            <div className="property-group">
              <label>ResRef</label>
              <input
                type="text"
                value={dlg.resref || ''}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Conversation Type</label>
              <select
                value={dlg.conversationType}
                onChange={(e) => handleConversationTypeChange(parseInt(e.target.value, 10))}
              >
                <option value="0">Conversation</option>
                <option value="1">Computer</option>
                <option value="2">Bark</option>
              </select>
            </div>

            <div className="property-group">
              <label>VO ID</label>
              <input
                type="text"
                value={dlg.vo_id || ''}
                disabled
                className="input-disabled"
                placeholder="No VO ID"
              />
            </div>

            <div className="property-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={dlg.unequipHeadItem || false}
                  onChange={(e) => handleUnequipHeadChange(e.target.checked)}
                />
                <span>Unequip Head Item</span>
              </label>
            </div>

            <div className="property-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={dlg.unequipItems || false}
                  onChange={(e) => handleUnequipItemsChange(e.target.checked)}
                />
                <span>Unequip All Items</span>
              </label>
            </div>

            <div className="property-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={dlg.recordNoVO || false}
                  onChange={(e) => handleRecordNoVOChange(e.target.checked)}
                />
                <span>Record No VO</span>
              </label>
            </div>

            <div className="property-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={dlg.oldHitCheck || false}
                  onChange={(e) => handleOldHitCheckChange(e.target.checked)}
                />
                <span>Old Hit Check</span>
              </label>
            </div>
          </>,
          '⚙️'
        )}

        {renderSection(
          'scripts',
          'Dialog Scripts',
          <>
            <div className="property-group">
              <label>End Conversation Script</label>
              <input
                type="text"
                value={dlg.scripts.onEndConversation?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {dlg.scripts.onEndConversation && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>

            <div className="property-group">
              <label>End Conversation Abort Script</label>
              <input
                type="text"
                value={dlg.scripts.onEndConversationAbort?.name || ''}
                disabled
                className="input-disabled"
                placeholder="No script"
              />
              {dlg.scripts.onEndConversationAbort && (
                <button className="btn-script">Edit Script</button>
              )}
            </div>
          </>,
          '📜'
        )}

        {renderSection(
          'cutscene',
          'Cutscene Settings',
          <>
            <div className="property-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={dlg.isAnimatedCutscene || false}
                  onChange={(e) => handleAnimatedCutChange(e.target.checked)}
                />
                <span>Animated Cutscene</span>
              </label>
            </div>

            <div className="property-group">
              <label>Camera Model</label>
              <input
                type="text"
                value={dlg.animatedCameraResRef || ''}
                onChange={(e) => handleCameraModelChange(e.target.value)}
                placeholder="Camera model ResRef..."
                disabled={!dlg.isAnimatedCutscene}
              />
            </div>

            <div className="property-group">
              <label>Ambient Track</label>
              <input
                type="text"
                value={dlg.ambientTrack || ''}
                onChange={(e) => handleAmbientTrackChange(e.target.value)}
                placeholder="Ambient music ResRef..."
              />
            </div>
          </>,
          '🎬'
        )}

        {renderSection(
          'stuntActors',
          'Stunt Actors',
          <>
            <div className="stunt-actors-list">
              {getStuntActors().length === 0 ? (
                <div className="empty-list">No stunt actors</div>
              ) : (
                getStuntActors().map((actor, index) => (
                  <div key={index} className="stunt-actor-item">
                    <div className="stunt-actor-label">
                      <span className="participant">{actor.participant}</span>
                    </div>
                    <div className="stunt-actor-resref">
                      {actor.resref || '(No model)'}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="btn-add">Add Stunt Actor</button>
          </>,
          '🎭'
        )}

        {renderSection(
          'statistics',
          'Statistics',
          <>
            <div className="stats-grid">
              <div className="stat-item">
                <label>Starting Nodes</label>
                <span className="stat-value">{dlg.startingList.length}</span>
              </div>

              <div className="stat-item">
                <label>Entry Nodes</label>
                <span className="stat-value">{dlg.entryList.length}</span>
              </div>

              <div className="stat-item">
                <label>Reply Nodes</label>
                <span className="stat-value">{dlg.replyList.length}</span>
              </div>

              <div className="stat-item">
                <label>Total Nodes</label>
                <span className="stat-value">
                  {dlg.startingList.length + dlg.entryList.length + dlg.replyList.length}
                </span>
              </div>

              <div className="stat-item">
                <label>Conversation Type</label>
                <span className="stat-value">
                  {dlg.conversationType === 0 ? 'Conversation' :
                   dlg.conversationType === 1 ? 'Computer' : 'Bark'}
                </span>
              </div>

              <div className="stat-item">
                <label>Has VO</label>
                <span className="stat-value">
                  {dlg.vo_id ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </>,
          '📊'
        )}

        {renderSection(
          'advanced',
          'Advanced',
          <>
            <div className="property-group">
              <label>Alien Race Owner</label>
              <input
                type="number"
                value={dlg.alienRaceOwner || 0}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="property-group">
              <label>Post Process Owner</label>
              <input
                type="number"
                value={dlg.postProcOwner || 0}
                disabled
                className="input-disabled"
              />
            </div>
          </>,
          '🔧'
        )}
      </div>
    </div>
  );
};
