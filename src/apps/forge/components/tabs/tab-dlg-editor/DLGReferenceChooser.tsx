/**
 * DLGReferenceChooser component.
 *
 * Dialog for choosing between multiple references to the same node.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGReferenceChooser.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState, useEffect } from 'react';

import { DLGTreeNode, DLGNodeReference } from '@/apps/forge/interfaces/DLGTreeNode';
import { DLGTreeModel } from '@/apps/forge/utils/DLGTreeModel';
import "@/apps/forge/components/tabs/tab-dlg-editor/DLGReferenceChooser.scss";

interface DLGReferenceChooserProps {
  references: DLGNodeReference[];
  model: DLGTreeModel;
  onSelect: (reference: DLGNodeReference) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const DLGReferenceChooser: React.FC<DLGReferenceChooserProps> = ({
  references,
  model,
  onSelect,
  onCancel,
  isOpen
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [history, setHistory] = useState<DLGNodeReference[]>([references[0]]);

  useEffect(() => {
    if (isOpen && references.length > 0) {
      setSelectedIndex(0);
      setHistoryIndex(0);
      setHistory([references[0]]);
    }
  }, [isOpen, references]);

  if (!isOpen || references.length === 0) {
    return null;
  }

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleOk = () => {
    if (selectedIndex >= 0 && selectedIndex < references.length) {
      onSelect(references[selectedIndex]);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleDoubleClick = (index: number) => {
    setSelectedIndex(index);
    handleOk();
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const ref = history[newIndex];
      // Navigate to this reference
      model.selectNode(ref.sourceNode.id);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const ref = history[newIndex];
      // Navigate to this reference
      model.selectNode(ref.sourceNode.id);
    }
  };

  const getReferencePath = (reference: DLGNodeReference): string => {
    const parts: string[] = [];
    let current: DLGTreeNode | undefined = reference.sourceNode;

    while (current) {
      const nodeType = current.nodeType === 0 ? 'Start' : current.nodeType === 1 ? 'Entry' : 'Reply';
      parts.unshift(`${nodeType}[${current.listIndex}]`);
      current = current.parent;
    }

    return parts. join(' → ');
  };

  const getReferenceText = (reference: DLGNodeReference): string => {
    const text = reference.sourceNode.dlgNode.text || '(No text)';
    const maxLength = 60;
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="dlg-reference-chooser-overlay">
      <div className="dlg-reference-chooser">
        <div className="dlg-reference-chooser-header">
          <h3>Choose Reference</h3>
          <div className="dlg-reference-chooser-nav">
            <button
              className="nav-button"
              onClick={handleBack}
              disabled={historyIndex === 0}
              title="Back"
            >
              ◀
            </button>
            <button
              className="nav-button"
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1}
              title="Forward"
            >
              ▶
            </button>
          </div>
          <button className="close-button" onClick={handleCancel} title="Close">
            ✕
          </button>
        </div>

        <div className="dlg-reference-chooser-content">
          <p className="dlg-reference-chooser-description">
            This node is referenced in {references.length} location{references.length !== 1 ? 's' : ''}.
            Select which reference to navigate to:
          </p>

          <div className="dlg-reference-list">
            {references.map((ref, index) => (
              <div
                key={index}
                className={`dlg-reference-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => handleSelect(index)}
                onDoubleClick={() => handleDoubleClick(index)}
              >
                <div className="dlg-reference-item-path">
                  {getReferencePath(ref)}
                </div>
                <div className="dlg-reference-item-text">
                  {getReferenceText(ref)}
                </div>
                {ref.sourceNode.hasConditions && (
                  <span className="dlg-reference-item-badge" title="Has conditions">
                    🔒
                  </span>
                )}
                {ref.sourceNode.hasActions && (
                  <span className="dlg-reference-item-badge" title="Has actions">
                    ⚡
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="dlg-reference-chooser-footer">
          <button className="btn-primary" onClick={handleOk}>
            OK
          </button>
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
