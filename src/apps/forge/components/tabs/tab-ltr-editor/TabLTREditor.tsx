import React, { useState, useEffect } from "react";
import { TabLTREditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabLTREditor.scss";

interface BaseTabProps {
  tab: TabLTREditorState;
}

export const TabLTREditor = function(props: BaseTabProps){
  const tab = props.tab as TabLTREditorState;
  const [ltr, setLtr] = useState(tab.ltr);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);

  useEffect(() => {
    const loadHandler = () => setLtr(tab.ltr);
    
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

  if(!ltr){
    return (
      <div className="forge-ltr-editor">
        <MenuBar items={menuItems} />
        <div className="forge-ltr-editor__loading">Loading name generator...</div>
      </div>
    );
  }

  const generateNames = (count: number = 10) => {
    const names: string[] = [];
    for(let i = 0; i < count; i++){
      try {
        const name = ltr.getName();
        names.push(name);
      } catch(e) {
        console.error('Failed to generate name:', e);
      }
    }
    setGeneratedNames(names);
  };

  return (
    <div className="forge-ltr-editor">
      <MenuBar items={menuItems} />
      <div className="forge-ltr-editor__content">
        <div className="ltr-info">
          <h3>Name Generator (LTR File)</h3>
          <p>
            LTR files use Markov chains to generate random character names.
            This file contains probability tables for character sequences.
          </p>
          
          <div className="ltr-details">
            <div className="detail-item">
              <label>File Type:</label>
              <span>{ltr.fileType}</span>
            </div>
            <div className="detail-item">
              <label>File Version:</label>
              <span>{ltr.fileVersion}</span>
            </div>
            <div className="detail-item">
              <label>Character Set Size:</label>
              <span>{ltr.charCount}</span>
            </div>
          </div>
        </div>

        <div className="name-generator">
          <h4>Generate Names</h4>
          <p className="help-text">
            Click below to generate random names using this LTR file's Markov chains.
          </p>
          <div className="generator-controls">
            <button 
              className="btn-generate"
              onClick={() => generateNames(10)}
            >
              Generate 10 Names
            </button>
            <button 
              className="btn-generate"
              onClick={() => generateNames(20)}
            >
              Generate 20 Names
            </button>
          </div>

          {generatedNames.length > 0 && (
            <div className="generated-names">
              <h5>Generated Names:</h5>
              <div className="names-grid">
                {generatedNames.map((name, index) => (
                  <div key={index} className="name-item">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ltr-notice">
          <p>
            <strong>Note:</strong> Direct editing of Markov chain probability tables is not yet implemented.
            The probabilities are stored in the LTR file and used for name generation.
          </p>
        </div>
      </div>
    </div>
  );
};
